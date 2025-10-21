-- Fix the get_ticket endpoint to include /api/v2/ prefix
UPDATE mcp_services 
SET tools_config = jsonb_set(
  tools_config,
  '{0,endpoint}',
  '"/api/v2/tickets/{ticketId}"'
)
WHERE service_type = 'freshservice' 
  AND tools_config->0->>'name' = 'get_ticket';