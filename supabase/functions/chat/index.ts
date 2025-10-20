import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { format, parseISO } from "https://esm.sh/date-fns@3.6.0";

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

// Helper to get priority name
function getPriorityName(priorityId: number, ticketFields: any[]): string {
  const priorityField = ticketFields.find((f: any) => f.name === 'priority');
  if (priorityField?.choices) {
    const choice = priorityField.choices.find((c: any) => c.id === priorityId);
    if (choice) return choice.value;
  }
  const priorityMap: Record<number, string> = {
    1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent'
  };
  return priorityMap[priorityId] || `Priority ${priorityId}`;
}

function getDepartmentName(deptId: number | null, ticketFields: any[]): string {
  if (!deptId) return 'N/A';
  const deptField = ticketFields.find((f: any) => f.name === 'department');
  if (deptField?.choices) {
    const choice = deptField.choices.find((c: any) => c.id === deptId);
    if (choice) return choice.value;
  }
  return `Department ${deptId}`;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = parseISO(dateString);
    if (dateString.includes('T')) {
      return format(date, 'MMM d, yyyy h:mm a');
    }
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    return dateString;
  }
}

function getCompanyName(deptId: number | null, ticketFields: any[]): string {
  return getDepartmentName(deptId, ticketFields);
}

function getGroupName(groupId: number, ticketFields: any[]): string {
  const groupField = ticketFields.find((f: any) => f.name === 'group_id');
  if (groupField?.choices) {
    const choice = groupField.choices.find((c: any) => c.id === groupId);
    if (choice) return choice.value;
  }
  return `Group ${groupId}`;
}

function getSourceName(sourceId: number, ticketFields: any[]): string {
  const sourceField = ticketFields.find((f: any) => f.name === 'source');
  if (sourceField?.choices) {
    const choice = sourceField.choices.find((c: any) => c.id === sourceId);
    if (choice) return choice.value;
  }
  const sourceMap: Record<number, string> = {
    1: 'Email', 2: 'Portal', 3: 'Phone', 7: 'Chat', 8: 'Feedback Widget', 9: 'Yammer', 10: 'AWS Cloudwatch', 11: 'Pagerduty', 12: 'Walkup', 13: 'Slack'
  };
  return sourceMap[sourceId] || `Source ${sourceId}`;
}

// Helper to call LLM based on connection type
async function callLLM(
  connectionType: 'gemini' | 'openai',
  apiKey: string,
  messages: any[],
  tools?: any[],
  stream: boolean = false
) {
  if (connectionType === 'gemini') {
    // Gemini API call - need to handle tool results specially
    const geminiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        if (m.role === 'tool') {
          // Gemini expects function responses in a specific format
          return {
            role: 'user',
            parts: [{
              functionResponse: {
                name: m.name || 'function', // Get function name from message
                response: {
                  content: m.content
                }
              }
            }]
          };
        } else if (m.role === 'assistant' && m.tool_calls) {
          // Assistant message with tool calls
          return {
            role: 'model',
            parts: [
              ...(m.content ? [{ text: m.content }] : []),
              ...m.tool_calls.map((tc: any) => ({
                functionCall: {
                  name: tc.function.name,
                  args: JSON.parse(tc.function.arguments)
                }
              }))
            ]
          };
        } else {
          // Regular message
          return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
          };
        }
      });

    const systemInstruction = messages.find(m => m.role === 'system')?.content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:${stream ? 'streamGenerateContent' : 'generateContent'}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          tools: tools ? [{
            functionDeclarations: tools.map(t => ({
              name: t.function.name,
              description: t.function.description,
              parameters: t.function.parameters
            }))
          }] : undefined
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    if (stream) {
      // Transform Gemini's streaming format to OpenAI SSE format
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      
      (async () => {
        try {
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let braceCount = 0;
          let currentObject = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              await writer.write(encoder.encode('data: [DONE]\n\n'));
              break;
            }
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process character by character to detect complete JSON objects
            for (let i = 0; i < buffer.length; i++) {
              const char = buffer[i];
              currentObject += char;
              
              if (char === '{') {
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                
                // When braceCount reaches 0, we have a complete JSON object
                if (braceCount === 0 && currentObject.trim()) {
                  try {
                    const geminiData = JSON.parse(currentObject.trim());
                    console.log('Parsed Gemini data:', JSON.stringify(geminiData, null, 2));
                    
                    // Extract text from Gemini response
                    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                    console.log('Extracted text:', text);
                    
                    if (text) {
                      // Convert to OpenAI SSE format
                      const openaiFormat = {
                        choices: [{
                          delta: {
                            content: text
                          }
                        }]
                      };
                      await writer.write(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                    }
                  } catch (e) {
                    console.error('Error parsing Gemini JSON object:', e, 'Object:', currentObject.trim().substring(0, 200));
                  }
                  currentObject = '';
                }
              }
            }
            
            // Clear the buffer as we've processed all characters
            buffer = '';
          }
        } catch (error) {
          console.error('Error transforming Gemini stream:', error);
        } finally {
          writer.close();
        }
      })();
      
      return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    }

    const data = await response.json();
    
    // Convert Gemini response to OpenAI format
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response from Gemini');
    }

    const functionCalls = candidate.content?.parts
      ?.filter((p: any) => p.functionCall)
      .map((p: any) => ({
        id: `call_${Date.now()}`,
        type: 'function',
        function: {
          name: p.functionCall.name,
          arguments: JSON.stringify(p.functionCall.args || {})
        }
      }));

    const textContent = candidate.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('');

    return {
      choices: [{
        message: {
          role: 'assistant',
          content: textContent || null,
          tool_calls: functionCalls && functionCalls.length > 0 ? functionCalls : undefined
        }
      }]
    };
  } else {
    // OpenAI API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools,
        stream
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    if (stream) {
      return response;
    }

    return await response.json();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { messages, sessionId } = body;
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get default LLM connection
    const { data: defaultConnection, error: connError } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_chat_default', true)
      .eq('is_active', true)
      .in('connection_type', ['gemini', 'openai'])
      .single();

    if (connError || !defaultConnection) {
      console.error('No default LLM connection found:', connError);
      return new Response(
        JSON.stringify({ 
          error: 'No default LLM connection configured. Please go to Connections and mark a Gemini or OpenAI connection as your chat default.',
          requiresSetup: true,
          setupUrl: '/connections'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = defaultConnection.auth_config?.api_key;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'LLM connection is missing API key. Please update your connection configuration.',
          requiresSetup: true,
          setupUrl: '/connections'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const connectionType = defaultConnection.connection_type as 'gemini' | 'openai';
    console.log('Chat request from user:', user.id, 'using', connectionType);
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
          description: "Search FreshService tickets using flexible filters. Returns up to 200 tickets max to prevent timeouts. Common status IDs: 2=Open, 3=Pending, 4=Resolved, 5=Closed, 6=Waiting on Customer, 7=Waiting on Third Party, 8=In Progress. Returns ticket ID, subject, description, priority, and status.",
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
              },
              limit: {
                type: "number",
                description: "Maximum number of tickets to return (default: 200, max: 200)"
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

**Important: Query Limits**
- For queries expected to return >200 tickets, automatically use async job processing
- Async jobs can handle up to 1000+ tickets and run for up to 20 minutes
- For smaller queries (<200 tickets), use synchronous processing for immediate results
- If the result is limited in sync mode, inform the user and suggest more specific filters

Always format results as a clear, readable markdown table. 

**CRITICAL TABLE FORMATTING RULES:**
1. ALWAYS escape pipe characters in cell values by replacing "|" with "\\|"
2. ALWAYS escape backslashes in cell values by replacing "\\" with "\\\\"
3. Keep cell values on a single line - replace newlines with spaces
4. Ensure proper column alignment by checking your data before generating the table

**REQUIRED: Include ALL of these columns in every ticket table:**
| Ticket ID | Company | Subject | Priority | Status | created_at | updated_at | type | escalated | module | score | ticket_type |

- Ticket ID: The ticket number
- Company: The department/company name
- Subject: The ticket subject line
- Priority: Mapped name (Low, Medium, High, Urgent)
- Status: Mapped status name
- created_at: ISO date when ticket was created
- updated_at: ISO date when ticket was last updated
- type: Ticket type (e.g., "Service Request", "Incident")
- escalated: Custom field for escalation status (or "N/A" if null)
- module: Custom field for module name (or "N/A" if null)
- score: Custom field for score value (or "0" if null)
- ticket_type: Custom field for ticket type classification (or "N/A" if null)

The UI table component will handle column visibility settings, but you MUST include all columns in the markdown.
Priority values: 1=Low, 2=Medium, 3=High, 4=Urgent`;

    // Build conversation with tool call loop
    const conversationMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Track async job info across tool calls
    let asyncJobInfo: any = null;

    // Keep calling AI until no more tool calls (max 10 iterations to prevent infinite loops)
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;
      console.log(`AI call iteration ${iterations}`);

      const aiResponse = await callLLM(
        connectionType,
        apiKey,
        conversationMessages,
        tools,
        false
      );

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
              const { mcp_service_id, department, status, exclude_status, created_after, priority, limit } = args;
              console.log('Searching tickets via MCP - Service:', mcp_service_id, 'Filters:', { department, status, exclude_status, created_after, priority, limit });

              const userQuery = messages[messages.length - 1]?.content || 'Ticket search query';

              const requestedLimit = limit || 200;
              const hasMultipleStatuses = status && status.length > 5;
              const hasNoFilters = !department && !created_after && !priority && (!status || status.length > 5);
              const shouldUseAsyncJob = requestedLimit > 200 || hasMultipleStatuses || hasNoFilters;
              
              if (shouldUseAsyncJob) {
                console.log('Creating async job for large query');
                
                const { data: seqData } = await supabase.rpc('get_next_job_sequence', {
                  p_session_id: sessionId
                });
                const jobSequence = seqData || 1;
                
                const { data: job, error: jobError } = await supabase
                  .from('chat_jobs')
                  .insert({
                    user_id: user.id,
                    chat_session_id: sessionId,
                    job_sequence: jobSequence,
                    query: userQuery,
                    filters: {
                      mcp_service_id,
                      department,
                      status,
                      excludeStatus: exclude_status,
                      createdAfter: created_after,
                      priority
                    }
                  })
                  .select()
                  .single();

                if (jobError || !job) {
                  console.error('Failed to create job:', jobError);
                  return {
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ error: 'Failed to create async job' })
                  };
                }

                const backgroundJobPromise = fetch(`${supabaseUrl}/functions/v1/process-chat-job`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ jobId: job.id })
                });

                backgroundJobPromise.catch(async (err) => {
                  console.error('Failed to trigger background job:', err);
                  await supabase
                    .from('chat_jobs')
                    .update({ 
                      status: 'failed',
                      error: 'Failed to start background processing: ' + (err instanceof Error ? err.message : String(err)),
                      completed_at: new Date().toISOString()
                    })
                    .eq('id', job.id);
                });

                backgroundJobPromise.then(async (response) => {
                  if (!response.ok) {
                    console.error('Background job trigger failed with status:', response.status);
                    const errorText = await response.text().catch(() => 'Unknown error');
                    await supabase
                      .from('chat_jobs')
                      .update({ 
                        status: 'failed',
                        error: `Background processing failed to start: ${response.status} - ${errorText}`,
                        completed_at: new Date().toISOString()
                      })
                      .eq('id', job.id);
                  } else {
                    console.log('Background job triggered successfully for job:', job.id);
                  }
                }).catch(err => console.error('Error checking background job response:', err));

                const jobName = `${sessionId.substring(0, 8)}-${String(jobSequence).padStart(3, '0')}`;

                const initialMessage = `Processing large query in background...\n\nJob: ${jobName}\n\nThis may take 1-20 minutes depending on the dataset size.`;
                
                const { error: msgError } = await supabase
                  .from('chat_messages')
                  .insert({
                    session_id: sessionId,
                    role: 'assistant',
                    content: initialMessage,
                    job_id: job.id
                  });
                
                if (msgError) {
                  console.error('Failed to create assistant message:', msgError);
                }

                asyncJobInfo = {
                  async_job: true,
                  job_id: job.id,
                  job_name: jobName,
                  message: initialMessage
                };

                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    async_job: true,
                    job_id: job.id,
                    job_name: jobName,
                    message: `Large query detected. Processing in background. Job: ${jobName}`,
                    estimated_time: 'This may take 1-20 minutes depending on the dataset size.'
                  })
                };
              }

              // Synchronous processing for smaller queries
              const filters: any = {};
              
              if (department) filters.department = department;
              if (status && status.length > 0) filters.status = status;
              if (exclude_status && exclude_status.length > 0) filters.excludeStatus = exclude_status;
              if (created_after) filters.createdAfter = created_after;
              if (priority && priority.length > 0) filters.priority = priority;
              
              const maxLimit = Math.min(requestedLimit, 200);
              filters.limit = maxLimit;

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
              const totalTickets = mcpResult.total || 0;
              const totalMatching = mcpResult.total_matching || mcpResult.total || 0;
              const returnedTickets = mcpResult.tickets?.length || 0;
              console.log('MCP returned', returnedTickets, 'tickets (total matching:', totalMatching, ')');
              
              const ticketFields = mcpResult.ticket_form_fields || [];
              
              const wasLimited = mcpResult.limited || (returnedTickets >= maxLimit && totalMatching > maxLimit);

              const formattedTickets = mcpResult.tickets.map((t: any) => {
                const safeString = (val: any, fallback = 'N/A'): string => {
                  if (val === null || val === undefined || val === '') return fallback;
                  return String(val).replace(/\|/g, '\\|').replace(/\\n/g, ' ').trim();
                };

                const mapped: any = {
                  id: t.id,
                  company: safeString(typeof t.department_id === 'number' ? getCompanyName(t.department_id, ticketFields) : t.department_id),
                  subject: safeString(t.subject, 'No Subject'),
                  description_text: safeString(t.description_text?.substring(0, 500), 'No Description Available'),
                  priority: safeString(typeof t.priority === 'number' ? getPriorityName(t.priority, ticketFields) : t.priority),
                  status: safeString(typeof t.status === 'number' ? getStatusName(t.status, ticketFields) : t.status),
                  department: safeString(typeof t.department_id === 'number' ? getDepartmentName(t.department_id, ticketFields) : t.department_id),
                  group: safeString(typeof t.group_id === 'number' ? getGroupName(t.group_id, ticketFields) : t.group_id),
                  source: safeString(typeof t.source === 'number' ? getSourceName(t.source, ticketFields) : t.source),
                  type: safeString(t.type),
                  created_at: safeString(formatDate(t.created_at)),
                  updated_at: safeString(formatDate(t.updated_at)),
                  due_by: t.due_by,
                  fr_due_by: t.fr_due_by,
                  requester_id: t.requester_id,
                  responder_id: t.responder_id,
                  workspace_id: t.workspace_id,
                  category: t.category,
                  sub_category: t.sub_category,
                  item_category: t.item_category,
                  is_escalated: t.is_escalated,
                  fr_escalated: t.fr_escalated,
                  escalated: safeString(t.custom_fields?.escalated),
                  module: safeString(t.custom_fields?.module),
                  score: safeString(t.custom_fields?.score, '0'),
                  ticket_type: safeString(t.custom_fields?.ticket_type)
                };
                
                if (t.custom_fields) {
                  Object.keys(t.custom_fields).forEach(key => {
                    if (!mapped.hasOwnProperty(key) && t.custom_fields[key] !== null && t.custom_fields[key] !== undefined) {
                      mapped[key] = safeString(t.custom_fields[key]);
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
                  total_matching: totalMatching,
                  limited: wasLimited,
                  limit_applied: maxLimit,
                  tickets: formattedTickets,
                  available_fields: Object.keys(formattedTickets[0] || {}),
                  message: wasLimited 
                    ? `Note: Showing ${returnedTickets} of ${totalMatching}+ total matching tickets. Results limited to prevent timeout. Use more specific filters (department, date range, status) to narrow results.`
                    : undefined
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

        // Check if any tool result contains async job info
        for (const result of toolResults) {
          try {
            const parsed = JSON.parse(result.content);
            if (parsed.async_job && parsed.job_id) {
              asyncJobInfo = parsed;
              break;
            }
          } catch (e) {
            // Not JSON, skip
          }
        }

        // Add tool results to conversation with function name
        for (const result of toolResults) {
          conversationMessages.push({
            role: 'tool',
            name: toolCalls.find((tc: any) => tc.id === result.tool_call_id)?.function?.name || 'function',
            tool_call_id: result.tool_call_id,
            content: result.content
          });
        }

        // Continue loop to let AI process tool results and potentially call more tools
        continue;
      }

      // No more tool calls - stream final response
      console.log('No more tool calls, streaming final response');
      console.log('Connection type:', defaultConnection.connection_type);
      console.log('Conversation has', conversationMessages.length, 'messages');
      
      const finalResponse = await callLLM(
        defaultConnection.connection_type,
        apiKey,
        conversationMessages,
        undefined,
        true
      );

      if (!finalResponse.body) {
        throw new Error('No response body from LLM');
      }

      // If there's async job info, inject it into the stream
      if (asyncJobInfo) {
        console.log('Emitting async job metadata in stream');
        
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Emit job metadata first
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          async_job: true,
          job_id: asyncJobInfo.job_id,
          message: asyncJobInfo.message,
          estimated_time: asyncJobInfo.estimated_time
        })}\n\n`));

        // Then pipe the AI response
        (async () => {
          try {
            const reader = finalResponse.body!.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              await writer.write(value);
            }
          } finally {
            writer.close();
          }
        })();

        console.log('Streaming final response with job metadata to client');
        return new Response(readable, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });
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
