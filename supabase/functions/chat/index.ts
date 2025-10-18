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
          description: "Search FreshService tickets by department and status. Returns ticket ID, subject, description, and status.",
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

    const systemPrompt = "You are a helpful AI assistant that can search FreshService tickets.\n\nWhen a user asks for tickets for a company/department:\n1. First call get_freshservice_connections to get their FreshService connection\n2. Then call get_department_id with the company/department name to get the ID\n3. Finally call search_freshservice_tickets with the department_id to get tickets\n4. Format the results as a clear, readable table showing: Ticket ID, Subject, Description (brief), and Status\n\nIf the user doesn't specify status, search for all open statuses: Open, Pending, In Progress, Waiting on Customer, Waiting on Third Party.\n\nAlways be helpful and clear in your responses.";

    // Call Lovable AI with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools,
        stream: true
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

    // Check if AI wants to call tools
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let toolCalls: any[] = [];
    let currentToolCall: any = null;

    // Stream and collect tool calls
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) continue;
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = {
                    id: tc.id || `call_${tc.index}`,
                    type: 'function',
                    function: { name: '', arguments: '' }
                  };
                }
                if (tc.function?.name) {
                  toolCalls[tc.index].function.name = tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCalls[tc.index].function.arguments += tc.function.arguments;
                }
              }
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    // If no tool calls, just stream the response
    if (toolCalls.length === 0) {
      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Execute tool calls
    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const { name, arguments: argsStr } = toolCall.function;
        const args = JSON.parse(argsStr);

        console.log('Executing tool:', name, args);

        switch (name) {
          case 'get_freshservice_connections': {
            const { data, error } = await supabase
              .from('connections')
              .select('*')
              .eq('user_id', user.id)
              .eq('connection_type', 'freshservice')
              .eq('is_active', true);

            if (error) throw error;
            
            return {
              tool_call_id: toolCall.id,
              content: JSON.stringify(data || [])
            };
          }

          case 'get_department_id': {
            const { connection_id, department_name } = args;

            // Get connection
            const { data: connection } = await supabase
              .from('connections')
              .select('*')
              .eq('id', connection_id)
              .eq('user_id', user.id)
              .single();

            if (!connection) {
              return {
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: 'Connection not found' })
              };
            }

            // Fetch ticket form fields
            const endpoint = connection.endpoint;
            const apiKey = connection.auth_config?.api_key || connection.auth_config?.password;
            const authHeaderValue = `Basic ${btoa(apiKey + ':X')}`;

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
              return {
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: 'Failed to fetch ticket fields' })
              };
            }

            const fieldsData = await fieldsResponse.json();
            const ticketFields = fieldsData.ticket_fields || [];

            // Find department field
            const departmentField = ticketFields.find((f: any) => 
              f.name === 'department_id' || f.label === 'Department'
            );

            if (!departmentField) {
              return {
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: 'Department field not found' })
              };
            }

            // Find matching department
            const department = departmentField.choices?.find((c: any) =>
              c.value?.toLowerCase().includes(department_name.toLowerCase()) ||
              department_name.toLowerCase().includes(c.value?.toLowerCase())
            );

            if (!department) {
              return {
                tool_call_id: toolCall.id,
                content: JSON.stringify({ 
                  error: `Department "${department_name}" not found`,
                  available: departmentField.choices?.map((c: any) => c.value) || []
                })
              };
            }

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

            // Get connection
            const { data: connection } = await supabase
              .from('connections')
              .select('*')
              .eq('id', connection_id)
              .eq('user_id', user.id)
              .single();

            if (!connection) {
              return {
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: 'Connection not found' })
              };
            }

            const endpoint = connection.endpoint;
            const apiKey = connection.auth_config?.api_key || connection.auth_config?.password;
            const authHeaderValue = `Basic ${btoa(apiKey + ':X')}`;

            // Default to open statuses if not specified
            const statuses = status_names || ['Open', 'Pending', 'In Progress', 'Waiting on Customer', 'Waiting on Third Party'];

            // Fetch ticket fields to map status names
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
              for (const statusName of statuses) {
                const choice = statusField.choices?.find((c: any) =>
                  c.value?.toLowerCase() === statusName.toLowerCase()
                );
                if (choice) {
                  statusIds.push(choice.id.toString());
                }
              }
            }

            // Build query
            const statusQuery = statusIds.map(id => `status:${id}`).join(' OR ');
            const query = `department_id:${department_id} AND (${statusQuery})`;

            console.log('FreshService query:', query);

            // Execute query
            const ticketsResponse = await fetch(
              `${endpoint}/api/v2/tickets/filter?query="${encodeURIComponent(query)}"`,
              {
                headers: {
                  'Authorization': authHeaderValue,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (!ticketsResponse.ok) {
              const errorText = await ticketsResponse.text();
              console.error('FreshService error:', errorText);
              return {
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: 'Failed to fetch tickets' })
              };
            }

            const ticketsData = await ticketsResponse.json();
            const tickets = ticketsData.tickets || [];

            // Map status IDs back to names for display
            const statusMap = new Map(
              statusField?.choices?.map((c: any) => [c.id.toString(), c.value]) || []
            );

            const formattedTickets = tickets.map((t: any) => ({
              id: t.id,
              subject: t.subject,
              description: t.description_text?.substring(0, 100) || '',
              status: statusMap.get(t.status?.toString()) || t.status
            }));

            return {
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                total: tickets.length,
                tickets: formattedTickets
              })
            };
          }

          default:
            return {
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: 'Unknown tool' })
            };
        }
      })
    );

    // Call AI again with tool results
    const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
          {
            role: 'assistant',
            tool_calls: toolCalls
          },
          ...toolResults.map(result => ({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            content: result.content
          }))
        ],
        stream: true
      }),
    });

    return new Response(finalResponse.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

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
