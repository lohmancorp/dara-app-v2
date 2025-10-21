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
  const statusMap: Record<number, string> = {
    2: 'Open', 3: 'Pending', 4: 'Resolved', 5: 'Closed', 6: 'New',
    7: 'Pending access', 8: 'Waiting for RnD', 9: 'Pending other ticket',
    10: 'Waiting for maintenance', 11: 'Waiting for bugfix',
    12: 'Service request triage', 15: 'Awaiting validation',
    16: 'Conditional Hold', 17: 'Waiting for 3rd Party'
  };
  return statusMap[statusId] || `Status ${statusId}`;
}

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
    1: 'Email', 2: 'Portal', 3: 'Phone', 7: 'Chat', 8: 'Feedback Widget', 
    9: 'Yammer', 10: 'AWS Cloudwatch', 11: 'Pagerduty', 12: 'Walkup', 13: 'Slack'
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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId } = await req.json();
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    console.log('Processing chat job:', jobId);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('chat_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // Update status to processing
    await supabase
      .from('chat_jobs')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString(),
        progress: 10,
        progress_message: 'Fetching FreshService connection...'
      })
      .eq('id', jobId);

    // Get FreshService MCP service
    const { data: mcpServices } = await supabase
      .from('mcp_services')
      .select('*')
      .eq('service_type', 'freshservice');

    if (!mcpServices || mcpServices.length === 0) {
      throw new Error('No FreshService service configured');
    }

    const mcpService = mcpServices[0];
    const filters = job.filters || {};
    
    // Check if this is a single ticket lookup
    const singleTicketId = filters.single_ticket_id;

    if (singleTicketId) {
      console.log('Processing single ticket lookup for ticket ID:', singleTicketId);
      
      // Update progress
      await supabase
        .from('chat_jobs')
        .update({ 
          progress: 30,
          progress_message: `Fetching ticket ${singleTicketId} from FreshService...`
        })
        .eq('id', jobId);

      // Call MCP server to get single ticket - use user's JWT token
      const userToken = job.user_token;
      if (!userToken) {
        throw new Error('User token not found in job record');
      }

      const mcpResponse = await fetch(`${supabaseUrl}/functions/v1/mcp-server`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,  // Use user's JWT token
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'tools/call',
          serviceType: 'freshservice',
          params: {
            toolName: 'get_ticket',
            arguments: {
              ticketId: Number(singleTicketId)
            }
          }
        })
      });

      if (!mcpResponse.ok) {
        const errorText = await mcpResponse.text();
        throw new Error(`Failed to fetch ticket ${singleTicketId}: ${errorText}`);
      }

      const ticketResult = await mcpResponse.json();
      
      if (ticketResult.error) {
        throw new Error(`Error retrieving ticket ${singleTicketId}: ${ticketResult.error}`);
      }

      console.log('Fetched ticket', singleTicketId, 'for job', jobId);

      // Update progress
      await supabase
        .from('chat_jobs')
        .update({ 
          progress: 60,
          progress_message: `Processing ticket ${singleTicketId}...`
        })
        .eq('id', jobId);

      // Get ticket fields for formatting
      const { data: connection } = await supabase
        .from('connections')
        .select('endpoint')
        .eq('user_id', job.user_id)
        .eq('connection_type', 'freshservice')
        .eq('is_active', true)
        .single();

      if (!connection?.endpoint) {
        throw new Error('FreshService connection not found');
      }

      // Fetch ticket fields for proper formatting
      const fieldsResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-freshservice-fields`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: connection.endpoint,
          userId: job.user_id
        })
      });

      let ticketFields: any[] = [];
      if (fieldsResponse.ok) {
        const fieldsResult = await fieldsResponse.json();
        ticketFields = fieldsResult.fields || [];
      }

      // Format single ticket
      const safeString = (val: any, fallback = 'N/A'): string => {
        if (val === null || val === undefined || val === '') return fallback;
        return String(val).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
      };

      const t = ticketResult;
      const formattedTicket = {
        id: t.id,
        company: safeString(typeof t.department_id === 'number' ? getCompanyName(t.department_id, ticketFields) : t.department_id),
        subject: safeString(t.subject, 'No Subject'),
        description_text: safeString(t.description_text?.substring(0, 500), 'No Description Available'),
        priority: safeString(typeof t.priority === 'number' ? getPriorityName(t.priority, ticketFields) : t.priority),
        priority_value: typeof t.priority === 'number' ? t.priority : 0,
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
        score: safeString(t.score, '0'),
        ticket_type: safeString(t.custom_fields?.ticket_type)
      };

      // Store single ticket result
      const result = {
        total: 1,
        total_matching: 1,
        tickets: [formattedTicket],
        available_fields: Object.keys(formattedTicket)
      };

      // Mark as completed
      await supabase
        .from('chat_jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          result,
          total_tickets: 1,
          progress: 100,
          progress_message: 'Completed'
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ success: true, total_tickets: 1 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update progress for multi-ticket search
    await supabase
      .from('chat_jobs')
      .update({ 
        progress: 30,
        progress_message: 'Fetching tickets from FreshService...'
      })
      .eq('id', jobId);

    // Use user's JWT token for MCP filter tickets call
    const userToken = job.user_token;
    if (!userToken) {
      throw new Error('User token not found in job record');
    }

    // Fetch tickets with high limit (no limit for async jobs)
    const mcpResponse = await fetch(`${supabaseUrl}/functions/v1/mcp-freshservice-filter-tickets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,  // Use user's JWT token
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serviceId: mcpService.id,
        filters: {
          ...filters,
          limit: undefined // No limit for async processing
        },
        ownerType: 'user',
        ownerId: job.user_id
      })
    });

    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      throw new Error(`Failed to fetch tickets: ${errorText}`);
    }

    const mcpResult = await mcpResponse.json();
    const ticketFields = mcpResult.ticket_form_fields || [];
    const tickets = mcpResult.tickets || [];

    console.log('Fetched', tickets.length, 'tickets for job', jobId);

    // Update progress
    await supabase
      .from('chat_jobs')
      .update({ 
        progress: 60,
        progress_message: `Processing ${tickets.length} tickets...`
      })
      .eq('id', jobId);

    // Format tickets
    const safeString = (val: any, fallback = 'N/A'): string => {
      if (val === null || val === undefined || val === '') return fallback;
      // Escape backslashes first, then pipes, and replace newlines with spaces
      return String(val).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
    };

    const formattedTickets = tickets.map((t: any) => ({
      id: t.id,
      company: safeString(typeof t.department_id === 'number' ? getCompanyName(t.department_id, ticketFields) : t.department_id),
      subject: safeString(t.subject, 'No Subject'),
      description_text: safeString(t.description_text?.substring(0, 500), 'No Description Available'),
      priority: safeString(typeof t.priority === 'number' ? getPriorityName(t.priority, ticketFields) : t.priority),
      priority_value: typeof t.priority === 'number' ? t.priority : 0,
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
      score: safeString(t.score, '0'),
      ticket_type: safeString(t.custom_fields?.ticket_type)
    }));

    // Update progress
    await supabase
      .from('chat_jobs')
      .update({ 
        progress: 90,
        progress_message: 'Finalizing results...'
      })
      .eq('id', jobId);

    // Store results
    const result = {
      total: formattedTickets.length,
      total_matching: mcpResult.total_matching || formattedTickets.length,
      tickets: formattedTickets,
      available_fields: Object.keys(formattedTickets[0] || {})
    };

    // Mark as completed
    await supabase
      .from('chat_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        result,
        total_tickets: formattedTickets.length,
        progress: 100,
        progress_message: 'Completed'
      })
      .eq('id', jobId);

    console.log('Job completed:', jobId);
    
    // Update the chat message with the results
    const tableContent = `Found ${formattedTickets.length} tickets:\n\n` +
      '| Ticket ID | Company | Subject | Priority | Status | created_at | updated_at | type | escalated | module | score | ticket_type |\n' +
      '|-----------|---------|---------|----------|--------|------------|------------|------|-----------|--------|-------|-------------|\n' +
      formattedTickets.map((t: any) => 
        `| ${t.id} | ${t.company} | ${t.subject} | ${t.priority} | ${t.status} | ${t.created_at} | ${t.updated_at} | ${t.type} | ${t.escalated} | ${t.module} | ${t.score} | ${t.ticket_type} |`
      ).join('\n');
    
    const { error: msgUpdateError } = await supabase
      .from('chat_messages')
      .update({ content: tableContent })
      .eq('job_id', jobId);
      
    if (msgUpdateError) {
      console.error('Failed to update chat message:', msgUpdateError);
    } else {
      console.log('Chat message updated with results');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Process chat job error:', error);
    
    // Try to update job status to failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { jobId } = await req.json().catch(() => ({}));
      
      if (jobId) {
        await supabase
          .from('chat_jobs')
          .update({ 
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    } catch (e) {
      console.error('Failed to update job status:', e);
    }

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
