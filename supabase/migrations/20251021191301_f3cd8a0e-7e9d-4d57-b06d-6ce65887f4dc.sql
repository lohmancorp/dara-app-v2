-- Link existing FreshService connections to the MCP service
UPDATE public.connections 
SET mcp_service_id = '719bb70c-6b93-4bb6-bacf-486c2c68c2b2',
    is_mcp_managed = true
WHERE connection_type = 'freshservice'
  AND (mcp_service_id IS NULL OR is_mcp_managed = false);