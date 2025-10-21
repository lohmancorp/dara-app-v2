-- Update FreshService MCP service configuration to use Basic Auth correctly
UPDATE public.mcp_services
SET 
  endpoint_template = 'https://{domain}.freshservice.com/api/v2',
  allow_custom_endpoint = true,
  tools_config = jsonb_build_array(
    jsonb_build_object(
      'name', 'get_ticket',
      'description', 'Get details of a specific ticket by ID',
      'endpoint', '/tickets/{ticket_id}',
      'method', 'GET',
      'inputSchema', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'ticket_id', jsonb_build_object('type', 'string', 'description', 'The ticket ID')
        ),
        'required', array['ticket_id']
      )
    ),
    jsonb_build_object(
      'name', 'filter_tickets',
      'description', 'Filter and search tickets with advanced query',
      'endpoint', '/tickets/filter',
      'method', 'GET',
      'inputSchema', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'query', jsonb_build_object('type', 'string', 'description', 'Filter query')
        )
      )
    )
  )
WHERE service_type = 'freshservice';

-- Ensure connection_tokens table has correct structure for Basic Auth
-- Users should configure their FreshService API key as the token
-- The system will automatically format it as "API_KEY:X" for Basic Auth