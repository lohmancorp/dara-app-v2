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
    excludePriority?: string[]; // Array of priority names or IDs to exclude
    assignee?: string; // Assignee email or ID
    requester?: string; // Requester email or ID
    createdAfter?: string; // ISO date string
    createdBefore?: string; // ISO date string
    updatedAfter?: string; // ISO date string
    updatedBefore?: string; // ISO date string
    customFields?: Record<string, string>; // Custom field filters (field_name: value)
    excludeCustomFields?: Record<string, string[]>; // Custom fields to exclude (field_name: [values])
    customQuery?: string; // Additional custom query parameters
    limit?: number; // Maximum number of tickets to return (default: unlimited, recommended max: 200)
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
    const body: FilterTicketsRequest = await req.json();
    const { serviceId, ownerType, ownerId, filters } = body;
    
    let user;
    
    // Check if this is service role authentication (from background job)
    if (token === supabaseKey) {
      // Service role key - validate that ownerId was provided
      if (!ownerId) {
        throw new Error('User ID required for service role authentication');
      }
      // Create a minimal user object for service role calls
      user = { id: ownerId };
      console.log('Service role authentication for user:', ownerId);
    } else {
      // Regular user authentication
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !authUser) {
        throw new Error('Unauthorized');
      }
      user = authUser;
    }

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

    console.log('Fetched', ticketFields.length, 'ticket fields');

    // Build query parts
    const queryParts: string[] = [];

    // Handle department filter
    if (filters.department) {
      console.log('Looking up department:', filters.department);
      const departmentField = ticketFields.find((f: any) => 
        f.name === 'department_id' || f.label === 'Department'
      );

      if (departmentField) {
        console.log('Found department field with', departmentField.choices?.length || 0, 'choices');
        let departmentId: string | null = null;
        
        // If department is a number, use it directly
        if (!isNaN(Number(filters.department))) {
          departmentId = filters.department;
        } else {
          // Try to find department by exact name match (case-insensitive)
          let choice = departmentField.choices?.find((c: any) => 
            c.value?.toLowerCase() === filters.department?.toLowerCase()
          );
          
          // If not found, try partial match
          if (!choice) {
            choice = departmentField.choices?.find((c: any) => 
              c.value?.toLowerCase().includes(filters.department?.toLowerCase())
            );
          }
          
          if (choice) {
            console.log('Resolved department:', filters.department, '-> ID:', choice.id);
            departmentId = choice.id.toString();
          } else {
            console.log('Department not found in choices. Available:', 
              departmentField.choices?.map((c: any) => c.value).slice(0, 10) || []);
            console.log('Skipping department filter - could not resolve to valid ID');
          }
        }

        // Only add the filter if we have a valid numeric department ID
        if (departmentId && !isNaN(Number(departmentId))) {
          queryParts.push(`department_id:${departmentId}`);
        } else {
          console.log('Warning: Could not add department filter - no valid numeric ID found');
        }
      } else {
        console.log('Department field not found in ticket_form_fields');
      }
    }

    // Handle status filter
    // CRITICAL: Only use ONE of status (include) OR excludeStatus, not both!
    // If both are provided, excludeStatus takes precedence as it's more specific
    if (filters.excludeStatus && filters.excludeStatus.length > 0) {
      const statusField = ticketFields.find((f: any) => 
        f.name === 'status' || f.label === 'Status'
      );

      if (statusField && statusField.choices) {
        const excludeStatusIds = new Set<string>();

        // Resolve excluded status names/IDs to numeric IDs
        for (const statusValue of filters.excludeStatus) {
          if (!isNaN(Number(statusValue))) {
            excludeStatusIds.add(statusValue);
          } else {
            const choice = statusField.choices.find((c: any) => 
              c.value?.toLowerCase() === statusValue.toLowerCase()
            );
            if (choice) {
              excludeStatusIds.add(choice.id.toString());
            }
          }
        }

        // Get all status IDs that are NOT excluded
        const includedStatusIds = statusField.choices
          .filter((c: any) => !excludeStatusIds.has(c.id.toString()))
          .map((c: any) => c.id.toString());

        console.log('Exclude status filter:', Array.from(excludeStatusIds));
        console.log('Including statuses:', includedStatusIds);

        // Build OR conditions for included statuses (FreshService format)
        if (includedStatusIds.length > 0) {
          const statusConditions = includedStatusIds.map((id: string) => `status:${id}`);
          if (statusConditions.length === 1) {
            queryParts.push(statusConditions[0]);
          } else {
            // Use parentheses for OR conditions
            queryParts.push(`(${statusConditions.join(' OR ')})`);
          }
        } else {
          console.warn('Warning: excludeStatus filter resulted in no valid statuses to include');
        }
      }
    } else if (filters.status && filters.status.length > 0) {
      // Only process include filter if excludeStatus wasn't provided
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

    // Handle priority filter (include OR exclude, not both)
    if (filters.excludePriority && filters.excludePriority.length > 0) {
      const priorityField = ticketFields.find((f: any) => 
        f.name === 'priority' || f.label === 'Priority'
      );

      if (priorityField && priorityField.choices) {
        const excludePriorityIds = new Set<string>();

        // Resolve excluded priority names/IDs to numeric IDs
        for (const priorityValue of filters.excludePriority) {
          if (!isNaN(Number(priorityValue))) {
            excludePriorityIds.add(priorityValue);
          } else {
            const choice = priorityField.choices.find((c: any) => 
              c.value?.toLowerCase() === priorityValue.toLowerCase()
            );
            if (choice) {
              excludePriorityIds.add(choice.id.toString());
            }
          }
        }

        // Get all priority IDs that are NOT excluded
        const includedPriorityIds = priorityField.choices
          .filter((c: any) => !excludePriorityIds.has(c.id.toString()))
          .map((c: any) => c.id.toString());

        console.log('Exclude priority filter:', Array.from(excludePriorityIds));
        console.log('Including priorities:', includedPriorityIds);

        if (includedPriorityIds.length > 0) {
          const priorityConditions = includedPriorityIds.map((id: string) => `priority:${id}`);
          if (priorityConditions.length === 1) {
            queryParts.push(priorityConditions[0]);
          } else {
            queryParts.push(`(${priorityConditions.join(' OR ')})`);
          }
        }
      }
    } else if (filters.priority && filters.priority.length > 0) {
      // Only process include filter if excludePriority wasn't provided
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

    // Handle custom field filters (include)
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

    // Handle custom field exclusions - NOTE: We DON'T add these to the API query
    // because FreshService doesn't support exclusion filters natively.
    // Instead, we'll filter these client-side after fetching the tickets.
    // Store them for later use
    const clientSideFilters = {
      excludeCustomFields: filters.excludeCustomFields || {}
    };

    // Add custom query if provided
    if (filters.customQuery) {
      queryParts.push(filters.customQuery);
    }

    // Combine query parts with AND (note: FreshService requires TWO spaces around operators)
    const queryString = queryParts.join('  AND  ');
    
    if (!queryString) {
      throw new Error('No filter criteria provided');
    }

    console.log('FreshService Query:', queryString);
    console.log('Query parts:', JSON.stringify(queryParts, null, 2));

    // Execute the filter query with pagination
    let allTickets: any[] = [];
    let page = 1;
    const perPage = 100;
    let hasMorePages = true;
    const requestedLimit = filters.limit || Infinity;
    let totalMatching = 0; // Track total matching tickets (even if we don't fetch them all)
    
    console.log('Starting paginated fetch with per_page:', perPage, 'requested limit:', requestedLimit);
    
    while (hasMorePages && allTickets.length < requestedLimit) {
      const filterUrl = `${endpoint}/api/v2/tickets/filter?query="${encodeURIComponent(queryString)}"&per_page=${perPage}&page=${page}`;
      
      console.log(`Fetching page ${page}:`, filterUrl);
      console.log('Full request URL:', filterUrl);
      console.log('Authorization header type:', authHeaderValue.split(' ')[0]);
      
      const ticketsResponse = await fetch(filterUrl, {
        headers: {
          'Authorization': authHeaderValue,
          'Content-Type': 'application/json'
        }
      });

      if (!ticketsResponse.ok) {
        const errorText = await ticketsResponse.text();
        console.error('FreshService API Error Response:');
        console.error('Status:', ticketsResponse.status, ticketsResponse.statusText);
        console.error('Response Body:', errorText);
        console.error('Query that failed:', queryString);
        console.error('Encoded query:', encodeURIComponent(queryString));
        
        let errorDetails = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = JSON.stringify(errorJson, null, 2);
        } catch (e) {
          // Not JSON, use as-is
        }
        
        throw new Error(`FreshService API error: ${ticketsResponse.status} ${ticketsResponse.statusText}. Details: ${errorDetails}`);
      }

      const ticketsData = await ticketsResponse.json();
      const tickets = ticketsData.tickets || [];
      
      console.log(`Page ${page}: Retrieved ${tickets.length} tickets`);
      
      // Add tickets up to the limit
      const remainingCapacity = requestedLimit - allTickets.length;
      const ticketsToAdd = tickets.slice(0, remainingCapacity);
      allTickets = allTickets.concat(ticketsToAdd);
      
      // Check if there are more pages
      hasMorePages = tickets.length === perPage;
      
      // If we hit the limit but there are more pages, we know there are more tickets
      if (allTickets.length >= requestedLimit && hasMorePages) {
        totalMatching = requestedLimit + 1; // At least one more than limit
        break;
      }
      
      page++;
      
      // Add a small delay between requests to respect rate limits
      if (hasMorePages && allTickets.length < requestedLimit && mcpService.call_delay_ms) {
        await new Promise(resolve => setTimeout(resolve, mcpService.call_delay_ms));
      }
    }

    // If we fetched everything, totalMatching equals allTickets length
    if (!hasMorePages || allTickets.length < requestedLimit) {
      totalMatching = allTickets.length;
    }

    console.log(`Total tickets retrieved across all pages: ${allTickets.length}`);
    if (filters.limit && allTickets.length >= filters.limit) {
      console.log(`Results limited to ${filters.limit} tickets`);
    }

    // Apply client-side exclusion filters for custom fields
    let filteredTickets = allTickets;
    if (clientSideFilters.excludeCustomFields && Object.keys(clientSideFilters.excludeCustomFields).length > 0) {
      console.log('Applying client-side exclusion filters:', clientSideFilters.excludeCustomFields);
      
      filteredTickets = allTickets.filter((ticket: any) => {
        // Check each exclusion filter
        for (const [fieldName, excludeValues] of Object.entries(clientSideFilters.excludeCustomFields)) {
          const ticketFieldValue = ticket.custom_fields?.[fieldName];
          
          if (ticketFieldValue !== null && ticketFieldValue !== undefined) {
            // Convert to string for comparison
            const valueStr = String(ticketFieldValue);
            
            // Check if this ticket's value is in the exclude list
            if (excludeValues.some((excludeVal: string) => 
              String(excludeVal).toLowerCase() === valueStr.toLowerCase()
            )) {
              // This ticket should be excluded
              return false;
            }
          }
        }
        
        // Ticket passed all exclusion checks
        return true;
      });
      
      console.log(`Filtered from ${allTickets.length} to ${filteredTickets.length} tickets after exclusions`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        query: queryString,
        tickets: filteredTickets,
        total: filteredTickets.length,
        total_matching: totalMatching,
        limited: filters.limit ? allTickets.length >= filters.limit : false,
        ticket_form_fields: ticketFields
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
