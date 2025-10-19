import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to map status IDs to names
function getStatusName(statusId: number): string {
  const statusMap: Record<number, string> = {
    2: 'Open',
    3: 'Pending',
    4: 'Resolved',
    5: 'Closed',
    6: 'Waiting on Customer',
    7: 'Waiting on Third Party',
    8: 'In Progress',
    9: 'On Hold',
    10: 'Scheduled',
    11: 'Awaiting Approval',
    12: 'Reopened',
    15: 'Waiting for Customer Response',
    16: 'Customer Response Received',
    17: 'Escalated'
  };
  return statusMap[statusId] || `Status ${statusId}`;
}

// Helper function to map priority IDs to names
function getPriorityName(priorityId: number): string {
  const priorityMap: Record<number, string> = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Urgent'
  };
  return priorityMap[priorityId] || `Priority ${priorityId}`;
}

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
          name: "search_freshservice_tickets",
          description: "Search FreshService tickets using flexible filters. Common status IDs: 2=Open, 3=Pending, 4=Resolved, 5=Closed, 6=Waiting on Customer, 7=Waiting on Third Party, 8=In Progress. Returns ticket ID, subject, description, priority, and status.",
          parameters: {
            type: "object",
            properties: {
              mcp_service_id: {
                type: "string",
                description: "The MCP service ID for FreshService"
              },
              department: {
                type: "string",
                description: "Department name or ID to filter by (optional)"
              },
              status: {
                type: "array",
                items: { type: "string" },
                description: "Array of status IDs to INCLUDE (e.g., ['2', '3', '8'] for Open, Pending, In Progress). Uses OR logic."
              },
              exclude_status: {
                type: "array",
                items: { type: "string" },
                description: "Array of status IDs to EXCLUDE (e.g., ['4', '5'] to exclude Resolved and Closed)"
              },
              created_after: {
                type: "string",
                description: "ISO date string to filter tickets created after this date (e.g., '2024-01-01T00:00:00Z')"
              },
              priority: {
                type: "array",
                items: { type: "string" },
                description: "Array of priority IDs (1=Low, 2=Medium, 3=High, 4=Urgent)"
              }
            },
            required: ["mcp_service_id"]
          }
        }
      }
    ];

    const systemPrompt = `You are a helpful AI assistant that can search FreshService tickets.

When a user asks for tickets:
1. First call get_freshservice_connections to get their MCP service configuration
2. Use the mcp_service_id (NOT connection_id) from the response
3. Call search_freshservice_tickets with appropriate filters

**Important Status IDs:**
- 2 = Open
- 3 = Pending  
- 4 = Resolved
- 5 = Closed
- 6 = Waiting on Customer
- 7 = Waiting on Third Party
- 8 = In Progress
- 9 = On Hold
- 10 = Scheduled
- 11 = Awaiting Approval
- 12 = Reopened
- 15 = Waiting for Customer Response
- 16 = Customer Response Received
- 17 = Escalated

**How to handle requests:**
- "not closed" or "not resolved" → use exclude_status: ['4', '5']
- "unresolved" → use status: ['6', '2', '3', '7', '8', '9', '10', '11', '17', '12', '16']
- "waiting on customer" → use status: ['15', '3', '7', '16']
- "last month" → use created_after with date 1 month ago
- "last N days" → use created_after with date N days ago
- If no filters specified → use exclude_status: ['4', '5'] to show all non-closed

Always format results as a clear, readable markdown table with columns: Ticket ID, Subject, Description, Priority, Status.
Priority: 1=Low, 2=Medium, 3=High, 4=Urgent`;


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
              console.log('Fetching FreshService MCP service for user:', user.id);
              
              // Get the FreshService MCP service
              const { data: mcpServices, error: mcpError } = await supabase
                .from('mcp_services')
                .select('*')
                .eq('service_type', 'freshservice');

              if (mcpError) {
                console.error('Error fetching MCP service:', mcpError);
                throw mcpError;
              }

              if (!mcpServices || mcpServices.length === 0) {
                console.error('No FreshService MCP service configured');
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: 'No FreshService service configured' })
                };
              }

              const mcpService = mcpServices[0];
              console.log('Found MCP service:', mcpService.id);
              
              const result = {
                tool_call_id: toolCall.id,
                content: JSON.stringify([{ 
                  mcp_service_id: mcpService.id,
                  service_name: mcpService.service_name,
                  service_type: mcpService.service_type
                }])
              };
              console.log('Returning MCP service result:', result);
              return result;
            }

            case 'search_freshservice_tickets': {
              const { mcp_service_id, department, status, exclude_status, created_after, priority } = args;
              console.log('Searching tickets via MCP - Service:', mcp_service_id, 'Filters:', { department, status, exclude_status, created_after, priority });

              // Call the MCP FreshService filter function with auth header
              const filters: any = {};
              
              if (department) filters.department = department;
              if (status && status.length > 0) filters.status = status;
              if (exclude_status && exclude_status.length > 0) filters.excludeStatus = exclude_status;
              if (created_after) filters.createdAfter = created_after;
              if (priority && priority.length > 0) filters.priority = priority;

              // Pass the auth header to the MCP function
              const mcpResponse = await fetch(`${supabaseUrl}/functions/v1/mcp-freshservice-filter-tickets`, {
                method: 'POST',
                headers: {
                  'Authorization': req.headers.get('Authorization') || '',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  serviceId: mcp_service_id,
                  filters,
                  ownerType: 'user',
                  ownerId: user.id
                })
              });

              if (!mcpResponse.ok) {
                const errorText = await mcpResponse.text();
                console.error('MCP filter error:', mcpResponse.status, errorText);
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: 'Failed to search tickets', details: errorText })
                };
              }

              const mcpResult = await mcpResponse.json();
              console.log('MCP returned', mcpResult.total, 'tickets');

              const formattedTickets = mcpResult.tickets.map((t: any) => ({
                id: t.id,
                subject: t.subject,
                description: t.description_text?.substring(0, 500) || 'No Description Available',
                priority: typeof t.priority === 'number' ? getPriorityName(t.priority) : t.priority,
                status: typeof t.status === 'number' ? getStatusName(t.status) : t.status
              }));

              console.log('Formatted tickets:', formattedTickets.length);
              return {
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  total: formattedTickets.length,
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
