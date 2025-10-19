import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FilterTicketsRequest {
  serviceId: string;
  ownerType?: 'user' | 'team' | 'account';
  ownerId?: string;
  filters: {
    department?: string; // Human-readable department name or ID
    status?: string[]; // Array of human-readable status names or IDs
    excludeStatus?: string[]; // Array of status names or IDs to exclude
    priority?: string[]; // Array of priority names or IDs
    assignee?: string; // Assignee email or ID
    requester?: string; // Requester email or ID
    createdAfter?: string; // ISO date string
    createdBefore?: string; // ISO date string
    updatedAfter?: string; // ISO date string
    updatedBefore?: string; // ISO date string
    customFields?: Record<string, string>; // Custom field filters (field_name: value)
    customQuery?: string; // Additional custom query parameters
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: FilterTicketsRequest = await req.json();
    const { serviceId, ownerType, ownerId, filters } = body;

    console.log('FreshService Filter Tickets:', { serviceId, filters });

    // Get MCP service configuration
    const { data: mcpService, error: serviceError } = await supabase
      .from('mcp_services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (serviceError || !mcpService || mcpService.service_type !== 'freshservice') {
      throw new Error('Invalid FreshService MCP service');
    }

    // Get authentication token
    const tokenResult = await getServiceToken(
      supabase,
      serviceId,
      user.id,
      ownerType,
      ownerId
    );

    if (!tokenResult.token) {
      return new Response(
        JSON.stringify({
          error: 'TOKEN_REQUIRED',
          message: 'Please configure your FreshService API token'
        }),
        { 
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const endpoint = tokenResult.endpoint || mcpService.endpoint_template;
    const apiKey = tokenResult.token;

    // Fetch ticket form fields to get ID mappings
    const ticketFieldsUrl = `${endpoint}/api/v2/ticket_form_fields`;
    const authHeaderValue = tokenResult.authType === 'basic' 
      ? `Basic ${btoa(apiKey + ':X')}`
      : `Bearer ${apiKey}`;

    const fieldsResponse = await fetch(ticketFieldsUrl, {
      headers: {
        'Authorization': authHeaderValue,
        'Content-Type': 'application/json'
      }
    });

    if (!fieldsResponse.ok) {
      throw new Error(`Failed to fetch ticket fields: ${fieldsResponse.statusText}`);
    }

    const fieldsData = await fieldsResponse.json();
    const ticketFields = fieldsData.ticket_fields || [];

    // Build query parts
    const queryParts: string[] = [];

    // Handle department filter
    if (filters.department) {
      const departmentField = ticketFields.find((f: any) => 
        f.name === 'department_id' || f.label === 'Department'
      );

      if (departmentField) {
        let departmentId = filters.department;
        
        // If department is not a number, try to find it in choices
        if (isNaN(Number(filters.department))) {
          const choice = departmentField.choices?.find((c: any) => 
            c.value?.toLowerCase() === filters.department?.toLowerCase()
          );
          if (choice) {
            departmentId = choice.id.toString();
          }
        }

        queryParts.push(`department_id:${departmentId}`);
      }
    }

    // Handle status filter (include)
    if (filters.status && filters.status.length > 0) {
      const statusField = ticketFields.find((f: any) => 
        f.name === 'status' || f.label === 'Status'
      );

      if (statusField) {
        const statusIds: string[] = [];

        for (const statusValue of filters.status) {
          let statusId = statusValue;
          
          // If status is not a number, try to find it in choices
          if (isNaN(Number(statusValue))) {
            const choice = statusField.choices?.find((c: any) => 
              c.value?.toLowerCase() === statusValue.toLowerCase()
            );
            if (choice) {
              statusId = choice.id.toString();
            }
          }

          statusIds.push(statusId);
        }

        // Build status OR conditions
        if (statusIds.length > 0) {
          const statusConditions = statusIds.map(id => `status:${id}`);
          if (statusConditions.length === 1) {
            queryParts.push(statusConditions[0]);
          } else {
            // Use parentheses for OR conditions
            queryParts.push(`(${statusConditions.join(' OR ')})`);
          }
        }
      }
    }

    // Handle status exclusion filter
    if (filters.excludeStatus && filters.excludeStatus.length > 0) {
      const statusField = ticketFields.find((f: any) => 
        f.name === 'status' || f.label === 'Status'
      );

      if (statusField) {
        const excludeStatusIds: string[] = [];

        for (const statusValue of filters.excludeStatus) {
          let statusId = statusValue;
          
          if (isNaN(Number(statusValue))) {
            const choice = statusField.choices?.find((c: any) => 
              c.value?.toLowerCase() === statusValue.toLowerCase()
            );
            if (choice) {
              statusId = choice.id.toString();
            }
          }

          excludeStatusIds.push(statusId);
        }

        // Build NOT status conditions
        if (excludeStatusIds.length > 0) {
          const excludeConditions = excludeStatusIds.map(id => `status:!${id}`);
          excludeConditions.forEach(cond => queryParts.push(cond));
        }
      }
    }

    // Handle priority filter
    if (filters.priority && filters.priority.length > 0) {
      const priorityField = ticketFields.find((f: any) => 
        f.name === 'priority' || f.label === 'Priority'
      );

      if (priorityField) {
        const priorityIds: string[] = [];

        for (const priorityValue of filters.priority) {
          let priorityId = priorityValue;
          
          if (isNaN(Number(priorityValue))) {
            const choice = priorityField.choices?.find((c: any) => 
              c.value?.toLowerCase() === priorityValue.toLowerCase()
            );
            if (choice) {
              priorityId = choice.id.toString();
            }
          }

          priorityIds.push(priorityId);
        }

        if (priorityIds.length > 0) {
          const priorityConditions = priorityIds.map(id => `priority:${id}`);
          if (priorityConditions.length === 1) {
            queryParts.push(priorityConditions[0]);
          } else {
            queryParts.push(`(${priorityConditions.join(' OR ')})`);
          }
        }
      }
    }

    // Handle assignee filter
    if (filters.assignee) {
      queryParts.push(`agent_id:${filters.assignee}`);
    }

    // Handle requester filter
    if (filters.requester) {
      queryParts.push(`requester_id:${filters.requester}`);
    }

    // Handle date filters
    if (filters.createdAfter) {
      queryParts.push(`created_at:>'${filters.createdAfter}'`);
    }

    if (filters.createdBefore) {
      queryParts.push(`created_at:<'${filters.createdBefore}'`);
    }

    if (filters.updatedAfter) {
      queryParts.push(`updated_at:>'${filters.updatedAfter}'`);
    }

    if (filters.updatedBefore) {
      queryParts.push(`updated_at:<'${filters.updatedBefore}'`);
    }

    // Handle custom field filters
    if (filters.customFields) {
      for (const [fieldName, fieldValue] of Object.entries(filters.customFields)) {
        // Try to find the field in ticket_fields to get the proper field name
        const field = ticketFields.find((f: any) => 
          f.name === fieldName || f.label?.toLowerCase() === fieldName.toLowerCase()
        );
        
        if (field) {
          queryParts.push(`${field.name}:${fieldValue}`);
        } else {
          // If not found, use as-is
          queryParts.push(`${fieldName}:${fieldValue}`);
        }
      }
    }

    // Add custom query if provided
    if (filters.customQuery) {
      queryParts.push(filters.customQuery);
    }

    // Combine query parts with AND
    const queryString = queryParts.join(' AND ');
    
    if (!queryString) {
      throw new Error('No filter criteria provided');
    }

    console.log('FreshService Query:', queryString);

    // Execute the filter query with pagination
    let allTickets: any[] = [];
    let page = 1;
    const perPage = 100;
    let hasMorePages = true;
    
    console.log('Starting paginated fetch with per_page:', perPage);
    
    while (hasMorePages) {
      const filterUrl = `${endpoint}/api/v2/tickets/filter?query="${encodeURIComponent(queryString)}"&per_page=${perPage}&page=${page}`;
      
      console.log(`Fetching page ${page}:`, filterUrl);
      
      const ticketsResponse = await fetch(filterUrl, {
        headers: {
          'Authorization': authHeaderValue,
          'Content-Type': 'application/json'
        }
      });

      if (!ticketsResponse.ok) {
        const errorText = await ticketsResponse.text();
        console.error('FreshService filter error:', errorText);
        throw new Error(`FreshService API error: ${ticketsResponse.status} ${ticketsResponse.statusText}`);
      }

      const ticketsData = await ticketsResponse.json();
      const tickets = ticketsData.tickets || [];
      
      console.log(`Page ${page}: Retrieved ${tickets.length} tickets`);
      
      allTickets = allTickets.concat(tickets);
      
      // Check if there are more pages
      hasMorePages = tickets.length === perPage;
      page++;
      
      // Add a small delay between requests to respect rate limits
      if (hasMorePages && mcpService.call_delay_ms) {
        await new Promise(resolve => setTimeout(resolve, mcpService.call_delay_ms));
      }
    }

    console.log(`Total tickets retrieved across all pages: ${allTickets.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        query: queryString,
        tickets: allTickets,
        total: allTickets.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('MCP FreshService Filter Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getServiceToken(
  supabase: any,
  serviceId: string,
  userId: string,
  ownerType?: 'user' | 'team' | 'account',
  ownerId?: string
) {
  // First check if service has app-provided token
  const { data: appToken } = await supabase
    .from('mcp_service_tokens')
    .select('encrypted_token, auth_type, auth_config')
    .eq('service_id', serviceId)
    .single();

  if (appToken) {
    return {
      token: appToken.encrypted_token,
      authType: appToken.auth_type,
      authConfig: appToken.auth_config,
      endpoint: null
    };
  }

  // Check for user/team/account provided token
  const queries = [];
  
  if (ownerType && ownerId) {
    queries.push({ owner_type: ownerType, owner_id: ownerId });
  }
  
  // Fallback to user token
  queries.push({ owner_type: 'user', owner_id: userId });

  for (const query of queries) {
    const { data: userToken } = await supabase
      .from('connection_tokens')
      .select('encrypted_token, auth_type, auth_config, endpoint')
      .eq('service_id', serviceId)
      .eq('owner_type', query.owner_type)
      .eq('owner_id', query.owner_id)
      .single();

    if (userToken) {
      return {
        token: userToken.encrypted_token,
        authType: userToken.auth_type,
        authConfig: userToken.auth_config,
        endpoint: userToken.endpoint
      };
    }
  }

  return {
    token: null,
    message: 'No authentication token configured for this service'
  };
}
