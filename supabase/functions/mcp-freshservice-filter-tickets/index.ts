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

    // Handle status filter
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

    // Execute the filter query
    const filterUrl = `${endpoint}/api/v2/tickets/filter?query="${encodeURIComponent(queryString)}"`;
    
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

    return new Response(
      JSON.stringify({
        success: true,
        query: queryString,
        tickets: ticketsData.tickets || [],
        total: ticketsData.total || 0
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
