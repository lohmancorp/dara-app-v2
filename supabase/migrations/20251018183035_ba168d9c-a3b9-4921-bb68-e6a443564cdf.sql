-- Create role enum
CREATE TYPE public.app_role AS ENUM ('app_admin', 'account_admin', 'team_manager', 'user');

-- Create accounts table (organizations)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (for app-wide role checks)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create account_members table (users in accounts with roles)
CREATE TABLE public.account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(account_id, user_id)
);

ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- Create team_members table (users in teams)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create mcp_services table (app admin configured services)
CREATE TABLE public.mcp_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  service_type TEXT NOT NULL, -- 'freshservice', 'jira', 'confluence', etc.
  description TEXT,
  uses_app_token BOOLEAN DEFAULT false NOT NULL, -- true if app provides token
  endpoint_template TEXT, -- base URL template
  rate_limit_per_minute INTEGER DEFAULT 60,
  retry_delay_sec INTEGER DEFAULT 60,
  max_retries INTEGER DEFAULT 5,
  call_delay_ms INTEGER DEFAULT 600,
  tools_config JSONB DEFAULT '[]'::jsonb, -- MCP tools available
  resources_config JSONB DEFAULT '[]'::jsonb, -- MCP resources available
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.mcp_services ENABLE ROW LEVEL SECURITY;

-- Create mcp_service_tokens table (app-provided tokens)
CREATE TABLE public.mcp_service_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.mcp_services(id) ON DELETE CASCADE NOT NULL,
  encrypted_token TEXT NOT NULL, -- encrypted API token
  auth_type TEXT NOT NULL DEFAULT 'api_key', -- 'api_key', 'oauth', 'basic'
  auth_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(service_id)
);

ALTER TABLE public.mcp_service_tokens ENABLE ROW LEVEL SECURITY;

-- Create connection_tokens table (user/team provided tokens)
CREATE TABLE public.connection_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.mcp_services(id) ON DELETE CASCADE NOT NULL,
  owner_type TEXT NOT NULL, -- 'user', 'team', 'account'
  owner_id UUID NOT NULL, -- user_id, team_id, or account_id
  encrypted_token TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'api_key',
  auth_config JSONB DEFAULT '{}'::jsonb,
  endpoint TEXT, -- optional custom endpoint
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(service_id, owner_type, owner_id)
);

ALTER TABLE public.connection_tokens ENABLE ROW LEVEL SECURITY;

-- Update connections table to reference accounts/teams
ALTER TABLE public.connections ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.connections ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.connections ADD COLUMN is_mcp_managed BOOLEAN DEFAULT false;
ALTER TABLE public.connections ADD COLUMN mcp_service_id UUID REFERENCES public.mcp_services(id) ON DELETE SET NULL;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check account role
CREATE OR REPLACE FUNCTION public.has_account_role(_user_id uuid, _account_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_members
    WHERE user_id = _user_id
      AND account_id = _account_id
      AND role = _role
  )
$$;

-- Create function to check team role
CREATE OR REPLACE FUNCTION public.has_team_role(_user_id uuid, _team_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
      AND role = _role
  )
$$;

-- RLS Policies for accounts
CREATE POLICY "Users can view accounts they belong to"
  ON public.accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members
      WHERE account_id = accounts.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Account admins can update their accounts"
  ON public.accounts FOR UPDATE
  USING (public.has_account_role(auth.uid(), id, 'account_admin'));

-- RLS Policies for teams
CREATE POLICY "Users can view teams they belong to"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = teams.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team managers can update their teams"
  ON public.teams FOR UPDATE
  USING (public.has_team_role(auth.uid(), id, 'team_manager'));

-- RLS Policies for user_roles
CREATE POLICY "App admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'app_admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for account_members
CREATE POLICY "Account members can view other members"
  ON public.account_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = account_members.account_id AND am.user_id = auth.uid()
    )
  );

CREATE POLICY "Account admins can manage members"
  ON public.account_members FOR ALL
  USING (public.has_account_role(auth.uid(), account_id, 'account_admin'));

-- RLS Policies for team_members
CREATE POLICY "Team members can view other members"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team managers can manage members"
  ON public.team_members FOR ALL
  USING (public.has_team_role(auth.uid(), team_id, 'team_manager'));

-- RLS Policies for mcp_services
CREATE POLICY "Everyone can view MCP services"
  ON public.mcp_services FOR SELECT
  USING (true);

CREATE POLICY "App admins can manage MCP services"
  ON public.mcp_services FOR ALL
  USING (public.has_role(auth.uid(), 'app_admin'));

-- RLS Policies for mcp_service_tokens
CREATE POLICY "App admins can manage service tokens"
  ON public.mcp_service_tokens FOR ALL
  USING (public.has_role(auth.uid(), 'app_admin'));

-- RLS Policies for connection_tokens
CREATE POLICY "Users can manage their own connection tokens"
  ON public.connection_tokens FOR ALL
  USING (
    (owner_type = 'user' AND owner_id = auth.uid()) OR
    (owner_type = 'team' AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = owner_id AND user_id = auth.uid()
    )) OR
    (owner_type = 'account' AND EXISTS (
      SELECT 1 FROM public.account_members
      WHERE account_id = owner_id AND user_id = auth.uid()
    ))
  );

-- Update connections RLS policies
DROP POLICY IF EXISTS "Users can view their own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can create their own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON public.connections;

CREATE POLICY "Users can view accessible connections"
  ON public.connections FOR SELECT
  USING (
    user_id = auth.uid() OR
    (account_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.account_members
      WHERE account_id = connections.account_id AND user_id = auth.uid()
    )) OR
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = connections.team_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create connections"
  ON public.connections FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND public.has_team_role(auth.uid(), team_id, 'team_manager')) OR
    (account_id IS NOT NULL AND public.has_account_role(auth.uid(), account_id, 'account_admin'))
  );

CREATE POLICY "Users can update their connections"
  ON public.connections FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND public.has_team_role(auth.uid(), team_id, 'team_manager')) OR
    (account_id IS NOT NULL AND public.has_account_role(auth.uid(), account_id, 'account_admin'))
  );

CREATE POLICY "Users can delete their connections"
  ON public.connections FOR DELETE
  USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND public.has_team_role(auth.uid(), team_id, 'team_manager')) OR
    (account_id IS NOT NULL AND public.has_account_role(auth.uid(), account_id, 'account_admin'))
  );

-- Add triggers for updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mcp_services_updated_at
  BEFORE UPDATE ON public.mcp_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mcp_service_tokens_updated_at
  BEFORE UPDATE ON public.mcp_service_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connection_tokens_updated_at
  BEFORE UPDATE ON public.connection_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();