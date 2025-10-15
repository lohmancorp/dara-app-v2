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
    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch connection details
    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (fetchError || !connection) {
      console.error('Error fetching connection:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Testing connection:', connection.name, connection.endpoint);

    // Prepare authentication headers based on auth type
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (connection.connection_type === 'freshservice') {
      // FreshService requires base64 encoded token in 'auth' header
      const apiKey = connection.auth_config?.api_key;
      if (apiKey) {
        const encodedToken = btoa(apiKey + ':X');
        headers['Authorization'] = `Basic ${encodedToken}`;
      }
    } else if (connection.auth_type === 'token') {
      const apiKey = connection.auth_config?.api_key;
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    } else if (connection.auth_type === 'basic_auth') {
      const username = connection.auth_config?.username;
      const password = connection.auth_config?.password;
      if (username && password) {
        const credentials = btoa(`${username}:${password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }
    }

    // Construct the full endpoint URL
    let testUrl = connection.endpoint;
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = `https://${testUrl}`;
    }

    // Add a simple health check endpoint path if needed
    // For FreshService, Jira, Confluence - try their respective API health endpoints
    if (connection.connection_type === 'freshservice') {
      testUrl = testUrl.endsWith('/') ? `${testUrl}api/v2/ticket_form_fields` : `${testUrl}/api/v2/ticket_form_fields`;
    } else if (connection.connection_type === 'jira') {
      testUrl = testUrl.endsWith('/') ? `${testUrl}rest/api/2/myself` : `${testUrl}/rest/api/2/myself`;
    } else if (connection.connection_type === 'confluence') {
      testUrl = testUrl.endsWith('/') ? `${testUrl}rest/api/content?limit=1` : `${testUrl}/rest/api/content?limit=1`;
    } else if (connection.connection_type === 'gemini') {
      testUrl = `${testUrl}/v1beta/models?key=${connection.auth_config?.api_key || ''}`;
    } else if (connection.connection_type === 'openai') {
      testUrl = `${testUrl}/v1/models`;
    }

    console.log('Testing URL:', testUrl);

    // Test the connection
    let isActive = false;
    let errorMessage = '';

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        isActive = true;
      } else {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      errorMessage = error.message || 'Connection failed';
    }

    // Update connection status in database
    const { error: updateError } = await supabase
      .from('connections')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', connectionId);

    if (updateError) {
      console.error('Error updating connection status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: isActive, 
        error: isActive ? null : errorMessage 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in test-connection function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
