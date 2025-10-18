import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
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

    const { messages } = await req.json();

    console.log('Chat request from user:', user.id);
    console.log('User messages:', JSON.stringify(messages, null, 2));

    // Define tools for the AI
    const tools = [
      {
        type: "function",
        function: {
          name: "get_freshservice_connections",
          description: "Get the user's FreshService connections to access ticket data",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_department_id",
          description: "Look up a department ID by name from FreshService ticket form fields",
          parameters: {
            type: "object",
            properties: {
              connection_id: {
                type: "string",
                description: "The FreshService connection ID"
              },
              department_name: {
                type: "string",
                description: "The department name to look up (e.g., 'Engineering', 'Sales')"
              }
            },
            required: ["connection_id", "department_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_freshservice_tickets",
          description: "Search FreshService tickets by department and status. Returns ticket ID, subject, description (up to 500 chars), priority (1=Low, 2=Medium, 3=High, 4=Urgent), and status.",
          parameters: {
            type: "object",
            properties: {
              connection_id: {
                type: "string",
                description: "The FreshService connection ID"
              },
              department_id: {
                type: "string",
                description: "The department ID to filter by"
              },
              status_names: {
                type: "array",
                items: { type: "string" },
                description: "Array of status names (e.g., ['Open', 'Pending', 'In Progress'])"
              }
            },
            required: ["connection_id", "department_id"]
          }
        }
      }
    ];

    const systemPrompt = "You are a helpful AI assistant that can search FreshService tickets.\n\nWhen a user asks for tickets for a company/department:\n1. First call get_freshservice_connections to get their FreshService connection\n2. Then call get_department_id with the company/department name to get the ID\n3. Finally call search_freshservice_tickets with the department_id to get tickets\n4. Format the results as a clear, readable markdown table with these columns: Ticket ID, Subject, Description, Priority, Status\n5. Priority should be converted to text: 1=Low, 2=Medium, 3=High, 4=Urgent\n\nIf the user doesn't specify status, search for all open statuses: Open, Pending, In Progress, Waiting on Customer, Waiting on Third Party.\n\nAlways be helpful and clear in your responses.";

    // Build conversation with tool call loop
    const conversationMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Keep calling AI until no more tool calls (max 10 iterations to prevent infinite loops)
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;
      console.log(`AI call iteration ${iterations}`);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: conversationMessages,
          tools,
          stream: false
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        throw new Error('AI gateway error');
      }

      const aiResponse = await response.json();
      console.log('AI response:', JSON.stringify(aiResponse, null, 2));
      const choice = aiResponse.choices?.[0];

      // Check if AI wants to call tools
      if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCalls = choice.message.tool_calls;
        console.log('AI requested tool calls:', toolCalls.length);
        console.log('Tool calls:', JSON.stringify(toolCalls, null, 2));

        // Add assistant message with tool calls to conversation
        conversationMessages.push(choice.message);

        // Execute tool calls
        const toolResults = await Promise.all(
          toolCalls.map(async (toolCall: any) => {
          const { name, arguments: argsStr } = toolCall.function;
          const args = JSON.parse(argsStr);

          console.log('Executing tool:', name, args);

          switch (name) {
            case 'get_freshservice_connections': {
              console.log('Fetching FreshService connections for user:', user.id);
              const { data, error } = await supabase
                .from('connections')
                .select('*')
                .eq('user_id', user.id)
                .eq('connection_type', 'freshservice')
                .eq('is_active', true);

              if (error) {
                console.error('Error fetching connections:', error);
                throw error;
              }
              
              console.log('Found connections:', data?.length || 0);
              const result = {
                tool_call_id: toolCall.id,
                content: JSON.stringify(data || [])
              };
              console.log('Returning connection result:', result);
              return result;
            }

            case 'get_department_id': {
              const { connection_id, department_name } = args;
              console.log('Looking up department:', department_name, 'for connection:', connection_id);

              const { data: connection } = await supabase
                .from('connections')
                .select('*')
                .eq('id', connection_id)
                .eq('user_id', user.id)
                .single();

              if (!connection) {
                console.error('Connection not found:', connection_id);
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: 'Connection not found' })
                };
              }

              console.log('Found connection:', connection.name);

              let endpoint = connection.endpoint;
              // Ensure endpoint has protocol
              if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
                endpoint = `https://${endpoint}`;
              }
              const apiKey = connection.auth_config?.api_key || connection.auth_config?.password;
              const authHeaderValue = `Basic ${btoa(apiKey + ':X')}`;

              console.log('Fetching ticket fields from:', endpoint);
              const fieldsResponse = await fetch(
                `${endpoint}/api/v2/ticket_form_fields`,
                {
                  headers: {
                    'Authorization': authHeaderValue,
                    'Content-Type': 'application/json'
                  }
                }
              );

              if (!fieldsResponse.ok) {
                console.error('Failed to fetch fields:', fieldsResponse.status, await fieldsResponse.text());
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: 'Failed to fetch ticket fields' })
                };
              }

              const fieldsData = await fieldsResponse.json();
              const ticketFields = fieldsData.ticket_fields || [];
              console.log('Found ticket fields:', ticketFields.length);

              const departmentField = ticketFields.find((f: any) => 
                f.name === 'department_id' || f.label === 'Department'
              );

              if (!departmentField) {
                console.error('Department field not found in fields');
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: 'Department field not found' })
                };
              }

              console.log('Department field choices:', departmentField.choices?.length || 0);
              const department = departmentField.choices?.find((c: any) =>
                c.value?.toLowerCase().includes(department_name.toLowerCase()) ||
                department_name.toLowerCase().includes(c.value?.toLowerCase())
              );

              if (!department) {
                const available = departmentField.choices?.map((c: any) => c.value) || [];
                console.error('Department not found:', department_name, 'Available:', available);
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ 
                    error: `Department "${department_name}" not found`,
                    available
                  })
                };
              }

              console.log('Found department:', department.value, 'ID:', department.id);
              return {
                tool_call_id: toolCall.id,
                content: JSON.stringify({ 
                  department_id: department.id,
                  department_name: department.value
                })
              };
            }

            case 'search_freshservice_tickets': {
              const { connection_id, department_id, status_names } = args;
              console.log('Searching tickets - Connection:', connection_id, 'Department:', department_id, 'Statuses:', status_names);

              const { data: connection } = await supabase
                .from('connections')
                .select('*')
                .eq('id', connection_id)
                .eq('user_id', user.id)
                .single();

              if (!connection) {
                console.error('Connection not found for ticket search:', connection_id);
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: 'Connection not found' })
                };
              }

              console.log('Using connection:', connection.name);

              let endpoint = connection.endpoint;
              // Ensure endpoint has protocol
              if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
                endpoint = `https://${endpoint}`;
              }
              const apiKey = connection.auth_config?.api_key || connection.auth_config?.password;
              const authHeaderValue = `Basic ${btoa(apiKey + ':X')}`;

              const statuses = status_names || ['Open', 'Pending', 'In Progress', 'Waiting on Customer', 'Waiting on Third Party'];
              console.log('Status names to search:', statuses);

              const fieldsResponse = await fetch(
                `${endpoint}/api/v2/ticket_form_fields`,
                {
                  headers: {
                    'Authorization': authHeaderValue,
                    'Content-Type': 'application/json'
                  }
                }
              );

              const fieldsData = await fieldsResponse.json();
              const ticketFields = fieldsData.ticket_fields || [];

              const statusField = ticketFields.find((f: any) => f.name === 'status');
              const statusIds: string[] = [];

              if (statusField) {
                console.log('Status field found with', statusField.choices?.length || 0, 'choices');
                for (const statusName of statuses) {
                  const choice = statusField.choices?.find((c: any) =>
                    c.value?.toLowerCase() === statusName.toLowerCase()
                  );
                  if (choice) {
                    console.log('Mapped status:', statusName, '-> ID:', choice.id);
                    statusIds.push(choice.id.toString());
                  } else {
                    console.log('Status not found:', statusName);
                  }
                }
              } else {
                console.error('Status field not found in ticket fields');
              }

              const statusQuery = statusIds.map(id => `status:${id}`).join(' OR ');
              const query = `department_id:${department_id} AND (${statusQuery})`;

              console.log('FreshService query:', query);
              console.log('Searching tickets at:', `${endpoint}/api/v2/tickets/filter`);

              // Implement pagination to fetch all results (100 per page)
              let allTickets: any[] = [];
              let page = 1;
              const perPage = 100;
              let hasMorePages = true;

              while (hasMorePages) {
                console.log(`Fetching page ${page} (${perPage} results per page)...`);
                
                const ticketsResponse = await fetch(
                  `${endpoint}/api/v2/tickets/filter?query="${encodeURIComponent(query)}"&page=${page}&per_page=${perPage}`,
                  {
                    headers: {
                      'Authorization': authHeaderValue,
                      'Content-Type': 'application/json'
                    }
                  }
                );

                if (!ticketsResponse.ok) {
                  const errorText = await ticketsResponse.text();
                  console.error('FreshService tickets error:', ticketsResponse.status, errorText);
                  return {
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ error: 'Failed to fetch tickets', details: errorText })
                  };
                }

                const ticketsData = await ticketsResponse.json();
                const pageTickets = ticketsData.tickets || [];
                
                console.log(`Page ${page}: Retrieved ${pageTickets.length} tickets`);
                
                allTickets = allTickets.concat(pageTickets);

                // Check if there are more pages
                // If we got fewer tickets than requested, we've reached the last page
                if (pageTickets.length < perPage) {
                  hasMorePages = false;
                  console.log('Last page reached');
                } else {
                  page++;
                }
              }

              const tickets = allTickets;
              console.log('Total tickets retrieved across all pages:', tickets.length);

              const statusMap = new Map(
                statusField?.choices?.map((c: any) => [c.id.toString(), c.value]) || []
              );

              const formattedTickets = tickets.map((t: any) => ({
                id: t.id,
                subject: t.subject,
                description: t.description_text?.substring(0, 500) || 'No Description Available',
                priority: t.priority,
                status: statusMap.get(t.status?.toString()) || t.status
              }));

              console.log('Formatted tickets:', formattedTickets.length);
              const result = {
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  total: tickets.length,
                  tickets: formattedTickets
                })
              };
              console.log('Returning ticket search result');
              return result;
            }

            default:
              return {
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: 'Unknown tool' })
              };
          }
          })
        );

        console.log('Tool results:', JSON.stringify(toolResults, null, 2));

        // Add tool results to conversation
        for (const result of toolResults) {
          conversationMessages.push({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            content: result.content
          });
        }

        // Continue loop to let AI process tool results and potentially call more tools
        continue;
      }

      // No more tool calls - stream final response
      console.log('No more tool calls, streaming final response');
      const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: conversationMessages,
          stream: true
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error('Final AI response error:', finalResponse.status, errorText);
        throw new Error('AI gateway error on final response');
      }

      console.log('Streaming final response to client');
      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Max iterations reached
    console.error('Max iterations reached without completion');
    throw new Error('Too many tool call iterations');


  } catch (error) {
    console.error('Chat error:', error);
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
