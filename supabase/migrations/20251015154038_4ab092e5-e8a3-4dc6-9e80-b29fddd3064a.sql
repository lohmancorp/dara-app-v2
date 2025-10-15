-- Create connections table for storing user connection configurations
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('freshservice', 'jira', 'confluence', 'gemini', 'openai', 'google_alerts')),
  name TEXT NOT NULL,
  endpoint TEXT,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth', 'token', 'basic_auth')),
  auth_config JSONB DEFAULT '{}'::jsonb,
  call_delay_ms INTEGER DEFAULT 600,
  retry_delay_sec INTEGER DEFAULT 60,
  max_retries INTEGER DEFAULT 5,
  connection_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own connections" 
ON public.connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections" 
ON public.connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON public.connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON public.connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_connections_updated_at
BEFORE UPDATE ON public.connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();