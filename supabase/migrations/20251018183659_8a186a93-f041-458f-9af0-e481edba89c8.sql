-- Drop the problematic RLS policies
DROP POLICY IF EXISTS "Account members can view other members" ON public.account_members;
DROP POLICY IF EXISTS "Team members can view other members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view accessible connections" ON public.connections;

-- Create security definer functions to check membership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_account_member(_user_id uuid, _account_id uuid)
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
  )
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
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
  )
$$;

-- Recreate RLS policies using security definer functions
CREATE POLICY "Account members can view other members"
  ON public.account_members FOR SELECT
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Team members can view other members"
  ON public.team_members FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Users can view accessible connections"
  ON public.connections FOR SELECT
  USING (
    user_id = auth.uid() OR
    (account_id IS NOT NULL AND public.is_account_member(auth.uid(), account_id)) OR
    (team_id IS NOT NULL AND public.is_team_member(auth.uid(), team_id))
  );