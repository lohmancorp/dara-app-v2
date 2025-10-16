-- Drop the overly permissive policy that exposes all connections
DROP POLICY IF EXISTS "Users can view connection types for template mapping" ON public.connections;

-- Create a security definer function that safely returns only the connection_type
-- This bypasses RLS but only returns non-sensitive data needed for template mapping
CREATE OR REPLACE FUNCTION public.get_connection_type_for_mapping(_connection_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT connection_type
  FROM public.connections
  WHERE id = _connection_id
  LIMIT 1
$$;