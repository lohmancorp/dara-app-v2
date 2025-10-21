-- Fix parameter name mismatch in FreshService get_ticket tool
-- The chat function sends ticketId (camelCase) but the endpoint expects ticket_id (snake_case)

UPDATE public.mcp_services
SET tools_config = jsonb_set(
  tools_config,
  '{0}',
  jsonb_build_object(
    'name', 'get_ticket',
    'description', 'Retrieve a single FreshService ticket by ID',
    'endpoint', '/tickets/{ticketId}',  -- Changed from {ticket_id} to {ticketId}
    'method', 'GET',
    'input_schema', jsonb_build_object(
      'type', 'object',
      'properties', jsonb_build_object(
        'ticketId', jsonb_build_object(  -- Changed from ticket_id to ticketId
          'type', 'number',
          'description', 'The ticket ID to retrieve'
        )
      ),
      'required', jsonb_build_array('ticketId')  -- Changed from ticket_id to ticketId
    )
  )
)
WHERE service_type = 'freshservice';