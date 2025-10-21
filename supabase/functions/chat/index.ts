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

// Rate limiter to track last call times
const rateLimiter = {
  lastCallTimes: new Map<string, number>(),
  
  async waitForRateLimit(serviceType: string, callDelayMs: number) {
    const lastCallTime = this.lastCallTimes.get(serviceType) || 0;
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall < callDelayMs) {
      const waitTime = callDelayMs - timeSinceLastCall;
      console.log(`Rate limiting ${serviceType}: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCallTimes.set(serviceType, Date.now());
  }
};

// Helper to call LLM based on connection type with rate limiting
async function callLLM(
  connectionType: 'gemini' | 'openai',
  apiKey: string,
  messages: any[],
  tools?: any[],
  stream: boolean = false,
  rateLimitConfig?: { call_delay_ms: number; max_retries: number; retry_delay_sec: number }
) {
  if (connectionType === 'gemini') {
    // Apply rate limiting
    if (rateLimitConfig) {
      await rateLimiter.waitForRateLimit('gemini', rateLimitConfig.call_delay_ms);
    }
    
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

    // Add ?alt=sse for streaming to get SSE format
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:${stream ? 'streamGenerateContent' : 'generateContent'}?key=${apiKey}${stream ? '&alt=sse' : ''}`;
    
    // Retry logic for rate limits
    const maxRetries = rateLimitConfig?.max_retries || 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(apiUrl, {
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
            }] : undefined,
            toolConfig: tools ? {
              functionCallingConfig: {
                mode: 'ANY'  // Force Gemini to call tools when appropriate
              }
            } : undefined
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Handle 429 rate limit errors with retry
          if (response.status === 429 && attempt < maxRetries) {
            const retryDelay = rateLimitConfig?.retry_delay_sec || 60;
            const waitTime = retryDelay * 1000 * Math.pow(2, attempt); // Exponential backoff
            console.log(`Rate limited (429) - attempt ${attempt + 1}/${maxRetries + 1}, waiting ${waitTime}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            lastError = new Error(`Gemini API error: ${response.status}`);
            continue; // Retry
          }
          
          console.error('Gemini API error:', response.status, errorText);
          throw new Error(`Gemini API error: ${response.status}`);
        }

        // Success - process response
        if (stream) {
          // With ?alt=sse, Gemini now returns SSE format directly
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          const encoder = new TextEncoder();
          
          (async () => {
            try {
              const reader = response.body!.getReader();
              const decoder = new TextDecoder();
              let buffer = '';
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  await writer.write(encoder.encode('data: [DONE]\n\n'));
                  break;
                }
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith(':')) continue;
                  if (!trimmed.startsWith('data: ')) continue;
                  
                  const data = trimmed.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const geminiChunk = JSON.parse(data);
                    const text = geminiChunk.candidates?.[0]?.content?.parts?.[0]?.text;
                    
                    if (text) {
                      const openaiFormat = {
                        choices: [{ delta: { content: text } }]
                      };
                      await writer.write(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                    }
                  } catch (e) {
                    console.error('Error parsing Gemini SSE:', e, 'Data:', data.substring(0, 100));
                  }
                }
              }
            } catch (error) {
              console.error('Error transforming Gemini stream:', error);
            } finally {
              writer.close();
            }
          })();
          
          return new Response(readable, {
            headers: { 
              ...corsHeaders,
              'Content-Type': 'text/event-stream' 
            }
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
      } catch (error) {
        // If this isn't a 429 or we're out of retries, throw
        if (attempt >= maxRetries) {
          throw lastError || error;
        }
        // Otherwise continue to next retry
        lastError = error as Error;
      }
    }
    
    // All retries exhausted
    throw lastError || new Error('Failed to call Gemini API after retries');
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

    // Get MCP service IDs for reference
    const { data: mcpServices, error: mcpError } = await supabase
      .from('mcp_services')
      .select('id, service_type, service_name')
      .eq('is_active', true);

    if (mcpError) {
      console.error('Error loading MCP services:', mcpError);
    }

    const serviceTypeToId: Record<string, string> = {};
    if (mcpServices) {
      for (const service of mcpServices) {
        serviceTypeToId[service.service_type] = service.id;
      }
    }

    // Define tools manually with proper schemas (TODO: add schema validation for dynamic MCP tools)
    const tools = [
      {
        type: "function",
        function: {
          name: "search_freshservice_tickets",
          description: "Search FreshService tickets using flexible filters. Service resolution is automatic. Use this for complex queries with multiple filters.",
          parameters: {
            type: "object",
            properties: {
              department: { type: "string", description: "Department/company name" },
              status: { type: "array", items: { type: "string" }, description: "Status IDs to include" },
              exclude_status: { type: "array", items: { type: "string" }, description: "Status IDs to exclude" },
              created_after: { type: "string", description: "ISO date filter" },
              priority: { type: "array", items: { type: "string" }, description: "Priority IDs" },
              exclude_priority: { type: "array", items: { type: "string" }, description: "Priority IDs to exclude" },
              custom_fields: { type: "object", description: "Custom field filters" },
              exclude_custom_fields: { type: "object", description: "Custom fields to exclude" },
              limit: { type: "number", description: "Max tickets (default/max: 200)" }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_freshservice_ticket",
          description: "Get a SINGLE FreshService ticket by its ID number. Use this when user specifies a ticket number like '250989'.",
          parameters: {
            type: "object",
            properties: {
              ticketId: { 
                type: "number", 
                description: "The ticket ID number (e.g., 250989)" 
              }
            },
            required: ["ticketId"]
          }
        }
      }
    ];
    
    const rateLimitConfig = mcpServices?.find(s => s.service_type === connectionType) ? {
      call_delay_ms: 600,
      max_retries: 5,
      retry_delay_sec: 3  // 3 seconds base delay with exponential backoff (3s, 6s, 12s, 24s, 48s)
    } : undefined;
    
    if (rateLimitConfig) {
              console.log('Using MCP rate limit config:', rateLimitConfig);
    }

    const systemPrompt = `You are a helpful AI assistant with access to FreshService ticket management tools.

You have access to function calling tools that let you retrieve and search tickets. When users ask about tickets, you MUST call the appropriate tool - do not describe what you would do, actually call the tool.

Tools available:
- get_freshservice_ticket: Get a single ticket by ID
- search_freshservice_tickets: Search tickets with filters (department, status, priority, etc.)

Service resolution is automatic - no need to get service IDs first.

**Status Name Matching:**
When users mention status names, use the exact status name as it appears in FreshService:
- "Waiting on RnD" or "Waiting for RnD" → use status: ["Waiting for RnD"]
- "Open" → use status: ["Open"]
- "Pending" → use status: ["Pending"]
- "Resolved" → use status: ["Resolved"]
- "Closed" → use status: ["Closed"]
- "unresolved" or "open tickets" → exclude status: ["Resolved", "Closed"]

Use the actual status NAME in the status filter, not status codes. FreshService API accepts status names directly.

**Priority Names:** Low, Medium, High, Urgent

When formatting results, always include these columns: Ticket ID | Company | Subject | Priority | Status | created_at | updated_at | type | escalated | module | score | ticket_type`;


    // Build conversation with tool call loop
    let conversationMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Track async job info across tool calls
    let asyncJobInfo: any = null;

    // Keep calling AI until no more tool calls (max 10 iterations to prevent infinite loops)
    let iterations = 0;
    const maxIterations = 10;
    let hallucinationRetries = 0;
    const maxHallucinationRetries = 2;

    while (iterations < maxIterations) {
      iterations++;
      console.log(`AI call iteration ${iterations}`);

      const aiResponse = await callLLM(
        connectionType,
        apiKey,
        conversationMessages,
        tools,
        false,
        rateLimitConfig
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
            case 'get_freshservice_ticket': {
              const { ticketId } = args;
              
              if (!ticketId) {
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: 'ticketId is required' })
                };
              }
              
              console.log('Getting single ticket via MCP server:', ticketId);
              
              // Get FreshService MCP service ID
              const fsServiceId = serviceTypeToId['freshservice'];
              if (!fsServiceId) {
                console.error('FreshService MCP service not found in serviceTypeToId');
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: 'FreshService not configured' })
                };
              }
              
              console.log('Using FreshService MCP service ID:', fsServiceId);
              
              // Call MCP server to get ticket
              try {
                const mcpResponse = await fetch(`${supabaseUrl}/functions/v1/mcp-server`, {
                  method: 'POST',
                  headers: {
                    'Authorization': req.headers.get('Authorization') || '',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    method: 'tools/call',
                    serviceType: 'freshservice',
                    params: {
                      toolName: 'get_ticket',
                      arguments: {
                        ticketId: Number(ticketId)
                      }
                    }
                  })
                });
                
                if (!mcpResponse.ok) {
                  const errorText = await mcpResponse.text();
                  console.error('MCP server error:', mcpResponse.status, errorText);
                  return {
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ 
                      error: 'Failed to retrieve ticket from MCP server', 
                      details: errorText,
                      status: mcpResponse.status
                    })
                  };
                }
                
                const result = await mcpResponse.json();
                console.log('MCP server result:', JSON.stringify(result).substring(0, 200));
                
                if (result.error) {
                  return {
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ 
                      error: `Error retrieving ticket ${ticketId}`,
                      details: result.error
                    })
                  };
                }
                
                // MCP server returns the ticket data directly
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    ticket: result,
                    message: `Successfully retrieved ticket ${ticketId}`
                  })
                };
              } catch (error) {
                console.error('Exception calling MCP server:', error);
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ 
                    error: 'Exception calling MCP server',
                    details: error instanceof Error ? error.message : String(error)
                  })
                };
              }
            }

            case 'search_freshservice_tickets': {
              const { department, status, exclude_status, created_after, priority, exclude_priority, custom_fields, exclude_custom_fields, limit } = args;
              
              // Auto-resolve FreshService MCP service ID
              const fsServiceId = serviceTypeToId['freshservice'];
              if (!fsServiceId) {
                console.error('FreshService MCP service not configured');
                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: 'FreshService not configured in system' })
                };
              }
              
              const mcp_service_id = fsServiceId;
              
              console.log('Searching tickets via MCP - Service:', mcp_service_id, 'Filters:', { 
                department, status, exclude_status, created_after, priority, exclude_priority, 
                custom_fields, exclude_custom_fields, limit 
              });

              const userQuery = messages[messages.length - 1]?.content || 'Ticket search query';

              const requestedLimit = limit || 200;
              
              // ALWAYS use async jobs for ticket searches to prevent timeouts
              // Even simple queries can take longer than the frontend's 3-minute timeout
              // due to rate limiting, retries, and API processing time
              const shouldUseAsyncJob = true;
              
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
                    status: 'pending',
                    progress: 0,
                    filters: {
                      mcp_service_id,
                      department,
                      status,
                      excludeStatus: exclude_status,
                      excludePriority: exclude_priority,
                      createdAfter: created_after,
                      priority,
                      customFields: custom_fields,
                      excludeCustomFields: exclude_custom_fields
                    }
                  })
                  .select()
                  .single();
                
                console.log('Created job:', job?.id, 'Sequence:', jobSequence);

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

                asyncJobInfo = {
                  async_job: true,
                  job_id: job.id,
                  job_name: jobName
                };

                // Log for troubleshooting but don't show to user
                console.log(`Job created successfully. Job ID: ${job.id}. Processing in background.`);

                return {
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    async_job: true,
                    job_id: job.id,
                    job_name: jobName,
                    message: '', // Empty message - progress bar will show via realtime
                    estimated_time: '1-20 minutes depending on dataset size'
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
              if (exclude_priority && exclude_priority.length > 0) filters.excludePriority = exclude_priority;
              if (custom_fields) filters.customFields = custom_fields;
              if (exclude_custom_fields) filters.excludeCustomFields = exclude_custom_fields;
              
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

        // Check if any tool result contains async job info - if so, return immediately
        for (const result of toolResults) {
          try {
            const parsed = JSON.parse(result.content);
            if (parsed.async_job && parsed.job_id) {
              asyncJobInfo = parsed;
              console.log('Async job detected, returning job metadata immediately');
              
              // Return job metadata immediately without further AI processing
              const encoder = new TextEncoder();
              const stream = new ReadableStream({
                start(controller) {
                  try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      async_job: true,
                      job_id: asyncJobInfo.job_id,
                      message: asyncJobInfo.message || 'Job created and processing in background',
                      estimated_time: asyncJobInfo.estimated_time
                    })}\n\n`));
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  } catch (e) {
                    console.error('Error streaming job metadata:', e);
                    controller.error(e);
                  } finally {
                    controller.close();
                  }
                }
              });

              return new Response(stream, {
                headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
              });
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

      // No more tool calls - validate response before streaming
      console.log('No more tool calls, streaming final response');
      console.log('Connection type:', defaultConnection.connection_type);
      console.log('Conversation has', conversationMessages.length, 'messages');

      // Check if AI is refusing to process without calling tools
      const responseContent = choice?.message?.content || '';
      const refusesWithoutTools = /cannot fulfill|issue with.*FreshService|check.*service configuration|cannot process|sorry.*cannot/i.test(responseContent);
      const userMessage = messages[messages.length - 1]?.content || '';
      const isTicketQuery = /ticket|show me|list|find|search/i.test(userMessage);
      
      // If AI refuses a ticket query without calling tools, force it to call tools
      if (refusesWithoutTools && isTicketQuery && iterations <= 2) {
        console.error('AI refusing ticket query without calling tools - forcing tool use');
        
        // AGGRESSIVE CONVERSATION CLEANING - Remove all messages that might poison the AI
        conversationMessages = conversationMessages.filter((msg, idx) => {
          // Keep system messages, but we'll add a new override one
          if (msg.role === 'system' && idx === 0) return true;
          
          // Remove any assistant messages mentioning configuration issues or refusals
          if (msg.role === 'assistant' && msg.content) {
            const content = msg.content.toLowerCase();
            if (content.includes('cannot fulfill') || 
                content.includes('configuration issue') ||
                content.includes('check the service configuration')) {
              console.log(`Removing poisoned assistant message at index ${idx}`);
              return false;
            }
          }
          
          // Keep everything else
          return true;
        });
        
        // Add very forceful system message
        conversationMessages.push({
          role: 'system',
          content: `CRITICAL OVERRIDE: The previous attempt failed but this is a NEW request. You MUST process this ticket query by calling tools.

IGNORE any previous failures. The department/company name mentioned by the user is VALID.

REQUIRED ACTIONS NOW:
1. Call get_freshservice_connections() - no parameters needed
2. Extract the mcp_service_id from the response
3. Call search_freshservice_tickets() with:
   - mcp_service_id: <from step 1>
   - department: <exact name user mentioned>
   - Other filters as requested

DO NOT refuse. DO NOT say there is a configuration issue. CALL THE TOOLS NOW.`
        });
        continue;
      }

      // Check if the AI is trying to talk about async jobs without actually creating one
      const mentionsJob = /job.*?id.*?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(responseContent);
      
      if (mentionsJob && !asyncJobInfo) {
        console.error('AI is hallucinating async job response without calling tool');
        hallucinationRetries++;
        
        if (hallucinationRetries <= maxHallucinationRetries) {
          console.log(`Hallucination retry ${hallucinationRetries}/${maxHallucinationRetries}`);
          
          // Force the AI to use the tool by adding a system message
          conversationMessages.push({
            role: 'system',
            content: 'ERROR: You mentioned creating a job but did not call the search_freshservice_tickets tool. You MUST call the tool with the appropriate filters. Do not fabricate job IDs. Call the tool now with the filters from the user\'s request.'
          });
          
          // Retry with the corrected conversation
          continue;
        } else {
          console.error('Max hallucination retries reached, returning error to user');
          
          // Return an error message to the user
          const encoder = new TextEncoder();
          const errorMessage = 'I apologize, but I\'m having trouble processing your query correctly. Please try rephrasing your request or use more specific filters (e.g., include date ranges, specific ticket IDs, or department names).';
          
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                choices: [{
                  delta: { content: errorMessage }
                }]
              })}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          });
          
          return new Response(stream, {
            headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
          });
        }
      }
      
      const finalResponse = await callLLM(
        defaultConnection.connection_type,
        apiKey,
        conversationMessages,
        undefined,
        true,
        rateLimitConfig
      );

      if (!finalResponse.body) {
        throw new Error('No response body from LLM');
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
