-- Populate FreshService MCP tools and resources configuration
-- This defines the available API methods that can be called through the MCP system

UPDATE public.mcp_services
SET 
  tools_config = '[
    {
      "name": "get_ticket",
      "description": "Retrieve a single FreshService ticket by ID",
      "endpoint": "/api/v2/tickets/{ticketId}",
      "method": "GET",
      "inputSchema": {
        "type": "object",
        "properties": {
          "ticketId": {
            "type": "string",
            "description": "The ID of the ticket to retrieve"
          }
        },
        "required": ["ticketId"]
      }
    },
    {
      "name": "list_tickets",
      "description": "List all FreshService tickets with optional filtering",
      "endpoint": "/api/v2/tickets",
      "method": "GET",
      "inputSchema": {
        "type": "object",
        "properties": {
          "page": {
            "type": "number",
            "description": "Page number for pagination"
          },
          "per_page": {
            "type": "number",
            "description": "Number of tickets per page (max 100)"
          }
        }
      }
    },
    {
      "name": "filter_tickets",
      "description": "Filter tickets using FreshService query language with advanced criteria",
      "endpoint": "/api/v2/tickets/filter",
      "method": "GET",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "FreshService query string (e.g., department_id:123 AND status:2)"
          },
          "page": {
            "type": "number",
            "description": "Page number for pagination"
          },
          "per_page": {
            "type": "number",
            "description": "Number of tickets per page (max 100)"
          }
        },
        "required": ["query"]
      }
    },
    {
      "name": "create_ticket",
      "description": "Create a new FreshService ticket",
      "endpoint": "/api/v2/tickets",
      "method": "POST",
      "inputSchema": {
        "type": "object",
        "properties": {
          "subject": {
            "type": "string",
            "description": "Ticket subject"
          },
          "description": {
            "type": "string",
            "description": "Ticket description"
          },
          "email": {
            "type": "string",
            "description": "Email of the requester"
          },
          "priority": {
            "type": "number",
            "description": "Priority (1=Low, 2=Medium, 3=High, 4=Urgent)"
          },
          "status": {
            "type": "number",
            "description": "Status ID"
          },
          "department_id": {
            "type": "number",
            "description": "Department ID"
          }
        },
        "required": ["subject", "description", "email"]
      }
    },
    {
      "name": "update_ticket",
      "description": "Update an existing FreshService ticket",
      "endpoint": "/api/v2/tickets/{ticketId}",
      "method": "PUT",
      "inputSchema": {
        "type": "object",
        "properties": {
          "ticketId": {
            "type": "string",
            "description": "The ID of the ticket to update"
          },
          "subject": {
            "type": "string",
            "description": "Ticket subject"
          },
          "description": {
            "type": "string",
            "description": "Ticket description"
          },
          "priority": {
            "type": "number",
            "description": "Priority (1=Low, 2=Medium, 3=High, 4=Urgent)"
          },
          "status": {
            "type": "number",
            "description": "Status ID"
          }
        },
        "required": ["ticketId"]
      }
    },
    {
      "name": "get_ticket_fields",
      "description": "Get FreshService ticket form fields and their options",
      "endpoint": "/api/v2/ticket_form_fields",
      "method": "GET",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "search_tickets",
      "description": "Search tickets using FreshService search API",
      "endpoint": "/api/v2/search/tickets",
      "method": "GET",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query string"
          }
        },
        "required": ["query"]
      }
    }
  ]'::jsonb,
  resources_config = '[
    {
      "name": "ticket",
      "description": "Individual FreshService ticket resource",
      "uriTemplate": "freshservice://ticket/{ticketId}",
      "endpoint": "/api/v2/tickets/{ticketId}",
      "mimeType": "application/json",
      "inputSchema": {
        "type": "object",
        "properties": {
          "ticketId": {
            "type": "string",
            "description": "The ticket ID"
          }
        },
        "required": ["ticketId"]
      }
    },
    {
      "name": "tickets_list",
      "description": "Collection of all FreshService tickets",
      "uriTemplate": "freshservice://tickets/all",
      "endpoint": "/api/v2/tickets",
      "mimeType": "application/json",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "ticket_fields",
      "description": "FreshService ticket form schema and field definitions",
      "uriTemplate": "freshservice://ticket-fields/form",
      "endpoint": "/api/v2/ticket_form_fields",
      "mimeType": "application/json",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "departments",
      "description": "List of FreshService departments",
      "uriTemplate": "freshservice://departments/all",
      "endpoint": "/api/v2/departments",
      "mimeType": "application/json",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "agents",
      "description": "List of FreshService agents",
      "uriTemplate": "freshservice://agents/all",
      "endpoint": "/api/v2/agents",
      "mimeType": "application/json",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    }
  ]'::jsonb
WHERE service_type = 'freshservice';