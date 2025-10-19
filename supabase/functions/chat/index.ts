import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to map status IDs to names
function getStatusName(statusId: number, ticketFields: any[]): string {
  const statusField = ticketFields.find((f: any) => f.name === 'status');
  if (statusField?.choices) {
    const choice = statusField.choices.find((c: any) => c.id === statusId);
    if (choice) return choice.value;
  }
  // Fallback mapping
  const statusMap: Record<number, string> = {
    2: 'Open', 3: 'Pending', 4: 'Resolved', 5: 'Closed', 6: 'New',
    7: 'Pending access', 8: 'Waiting for RnD', 9: 'Pending other ticket',
    10: 'Waiting for maintenance', 11: 'Waiting for bugfix',
    12: 'Service request triage', 15: 'Awaiting validation',
    16: 'Conditional Hold', 17: 'Waiting for 3rd Party'
  };
  return statusMap[statusId] || `Status ${statusId}`;
}

// Helper function to map priority IDs to names
function getPriorityName(priorityId: number, ticketFields: any[]): string {
  const priorityField = ticketFields.find((f: any) => f.name === 'priority');
  if (priorityField?.choices) {
    const choice = priorityField.choices.find((c: any) => c.id === priorityId);
    if (choice) return choice.value;
  }
  // Fallback mapping
  const priorityMap: Record<number, string> = {
    1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent'
  };
  return priorityMap[priorityId] || `Priority ${priorityId}`;
}

// Helper function to map department IDs to names
function getDepartmentName(deptId: number | null, ticketFields: any[]): string {
  if (!deptId) return 'N/A';
  const deptField = ticketFields.find((f: any) => f.name === 'department');
  if (deptField?.choices) {
    const choice = deptField.choices.find((c: any) => c.id === deptId);
    if (choice) return choice.value;
  }
  return `Department ${deptId}`;
}

// Helper function to get company name (same as department, labeled as "Company" for customers)
function getCompanyName(deptId: number | null, ticketFields: any[]): string {
  return getDepartmentName(deptId, ticketFields);
}

// Helper function to map group IDs to names
function getGroupName(groupId: number, ticketFields: any[]): string {
  const groupField = ticketFields.find((f: any) => f.name === 'group_id');
  if (groupField?.choices) {
    const choice = groupField.choices.find((c: any) => c.id === groupId);
    if (choice) return choice.value;
  }
  return `Group ${groupId}`;
}

// Helper function to map source IDs to names
function getSourceName(sourceId: number, ticketFields: any[]): string {
  const sourceField = ticketFields.find((f: any) => f.name === 'source');
  if (sourceField?.choices) {
    const choice = sourceField.choices.find((c: any) => c.id === sourceId);
    if (choice) return choice.value;
  }
  // Common source mappings
  const sourceMap: Record<number, string> = {
    1: 'Email', 2: 'Portal', 3: 'Phone', 7: 'Chat', 8: 'Feedback Widget', 9: 'Yammer', 10: 'AWS Cloudwatch', 11: 'Pagerduty', 12: 'Walkup', 13: 'Slack'
  };
  return sourceMap[sourceId] || `Source ${sourceId}`;
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
- 6 = New
- 7 = Pending access
- 8 = Waiting for RnD
- 9 = Pending other ticket
- 10 = Waiting for maintenance
- 11 = Waiting for bugfix
- 12 = Service request triage
- 15 = Awaiting validation
- 16 = Conditional Hold
- 17 = Waiting for 3rd Party

**How to handle requests:**
- "not closed" or "not resolved" → use exclude_status: ['4', '5']
- "unresolved" → use status: ['2', '3', '6', '7', '8', '9', '10', '11', '12', '15', '16', '17']
- "waiting for RnD" → use status: ['8']
- "last month" → use created_after with date 1 month ago
- "last N days" → use created_after with date N days ago
- If no filters specified → use exclude_status: ['4', '5'] to show all non-closed

Always format results as a clear, readable markdown table. 

**Default columns to show:** Ticket ID, Company, Subject, Description (first 500 chars), Priority, Status

**All available ticket fields you can reference:**
- id, company, subject, description_text, priority, status, department, group, source, type
- created_at, updated_at, due_by, fr_due_by
- requester_id, responder_id, workspace_id
- category, sub_category, item_category
- is_escalated, fr_escalated
- Plus any custom_fields that are present in the tickets

When the user asks to see specific fields or "add columns", include those additional fields in the markdown table.
Priority values: 1=Low, 2=Medium, 3=High, 4=Urgent`;


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
              
              const ticketFields = mcpResult.ticket_form_fields || [];

              // Map all ticket fields with proper name resolution
              const formattedTickets = mcpResult.tickets.map((t: any) => {
                const mapped: any = {
                  id: t.id,
                  company: typeof t.department_id === 'number' ? getCompanyName(t.department_id, ticketFields) : (t.department_id || 'N/A'),
                  subject: t.subject,
                  description_text: t.description_text?.substring(0, 500) || 'No Description Available',
                  priority: typeof t.priority === 'number' ? getPriorityName(t.priority, ticketFields) : t.priority,
                  status: typeof t.status === 'number' ? getStatusName(t.status, ticketFields) : t.status,
                  department: typeof t.department_id === 'number' ? getDepartmentName(t.department_id, ticketFields) : (t.department_id || 'N/A'),
                  group: typeof t.group_id === 'number' ? getGroupName(t.group_id, ticketFields) : (t.group_id || 'N/A'),
                  source: typeof t.source === 'number' ? getSourceName(t.source, ticketFields) : t.source,
                  type: t.type,
                  created_at: t.created_at,
                  updated_at: t.updated_at,
                  due_by: t.due_by,
                  fr_due_by: t.fr_due_by,
                  requester_id: t.requester_id,
                  responder_id: t.responder_id,
                  workspace_id: t.workspace_id,
                  category: t.category,
                  sub_category: t.sub_category,
                  item_category: t.item_category,
                  is_escalated: t.is_escalated,
                  fr_escalated: t.fr_escalated
                };
                
                // Include custom fields if present
                if (t.custom_fields) {
                  Object.keys(t.custom_fields).forEach(key => {
                    if (t.custom_fields[key] !== null && t.custom_fields[key] !== undefined) {
                      mapped[key] = t.custom_fields[key];
                    }
                  });
                }
                
                return mapped;
              });

              console.log('Formatted tickets:', formattedTickets.length);
              return {
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  total: formattedTickets.length,
                  tickets: formattedTickets,
                  available_fields: Object.keys(formattedTickets[0] || {})
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
