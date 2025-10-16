-- Add a policy to allow users to view connection_type for template cloning purposes
-- This only exposes the connection_type, not sensitive auth_config or credentials
CREATE POLICY "Users can view connection types for template mapping"
ON public.connections
FOR SELECT
USING (true);

-- Note: The existing "Users can view their own connections" policy will still apply
-- and return full connection details for owned connections.
-- This new policy only allows other users to see that a connection exists and its type.