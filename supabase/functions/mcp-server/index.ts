import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MCPRequest {
  method: string; // 'tools/list', 'tools/call', 'resources/list', 'resources/read'
  params?: any;
  serviceType?: string; // 'freshservice', 'jira', etc.
  jobTemplateId?: string; // to infer service from job template
  ownerType?: 'user' | 'team' | 'account';
  ownerId?: string;
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

    const body: MCPRequest = await req.json();
    const { method, params, serviceType, jobTemplateId, ownerType, ownerId } = body;

    console.log('MCP Request:', { method, serviceType, jobTemplateId, ownerType, ownerId });

    // If jobTemplateId provided, get service from job template's connection
    let resolvedServiceType = serviceType;
    if (jobTemplateId && !serviceType) {
      const { data: template } = await supabase
        .from('job_templates')
        .select('job_connection')
        .eq('id', jobTemplateId)
        .single();
      
      if (template?.job_connection) {
        const { data: connection } = await supabase
          .from('connections')
          .select('connection_type, mcp_service_id')
          .eq('id', template.job_connection)
          .single();
        
        resolvedServiceType = connection?.connection_type;
      }
    }

    if (!resolvedServiceType) {
      throw new Error('Service type not specified or could not be inferred');
    }

    // Get MCP service configuration
    const { data: mcpService, error: serviceError } = await supabase
      .from('mcp_services')
      .select('*')
      .eq('service_type', resolvedServiceType)
      .single();

    if (serviceError || !mcpService) {
      throw new Error(`MCP service not configured for ${resolvedServiceType}`);
    }

    // Handle MCP methods
    switch (method) {
      case 'tools/list':
        return new Response(
          JSON.stringify({
            tools: mcpService.tools_config || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'resources/list':
        return new Response(
          JSON.stringify({
            resources: mcpService.resources_config || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'tools/call': {
        // Get authentication token for the service
        const tokenResult = await getServiceToken(
          supabase,
          mcpService.id,
          user.id,
          ownerType,
          ownerId
        );

        if (!tokenResult.token) {
          return new Response(
            JSON.stringify({
              error: 'TOKEN_REQUIRED',
              message: tokenResult.message,
              serviceType: resolvedServiceType,
              usesAppToken: mcpService.uses_app_token
            }),
            { 
              status: 402, // Payment Required (or token required in this case)
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Execute the tool call
        const result = await executeToolCall(
          mcpService,
          params,
          tokenResult.token,
          tokenResult.authType,
          tokenResult.authConfig,
          tokenResult.endpoint
        );

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'resources/read': {
        // Get authentication token for the service
        const tokenResult = await getServiceToken(
          supabase,
          mcpService.id,
          user.id,
          ownerType,
          ownerId
        );

        if (!tokenResult.token) {
          return new Response(
            JSON.stringify({
              error: 'TOKEN_REQUIRED',
              message: tokenResult.message,
              serviceType: resolvedServiceType,
              usesAppToken: mcpService.uses_app_token
            }),
            { 
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Read the resource
        const result = await readResource(
          mcpService,
          params,
          tokenResult.token,
          tokenResult.authType,
          tokenResult.authConfig,
          tokenResult.endpoint
        );

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown MCP method: ${method}`);
    }

  } catch (error) {
    console.error('MCP Server Error:', error);
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
    message: `No authentication token configured for this service. Please add your API key in settings.`
  };
}

async function executeToolCall(
  mcpService: any,
  params: any,
  token: string,
  authType: string,
  authConfig: any,
  customEndpoint: string | null
) {
  const { toolName, arguments: toolArgs } = params;
  
  // Find tool configuration
  const tools = mcpService.tools_config || [];
  const tool = tools.find((t: any) => t.name === toolName);
  
  if (!tool) {
    throw new Error(`Tool ${toolName} not found in service configuration`);
  }

  // Build API request based on tool configuration
  const endpoint = customEndpoint || mcpService.endpoint_template;
  const url = buildUrl(endpoint, tool.endpoint, toolArgs);
  
  const headers = buildAuthHeaders(authType, token, authConfig);
  
  const requestConfig: RequestInit = {
    method: tool.method || 'GET',
    headers
  };

  if (tool.method !== 'GET' && toolArgs) {
    requestConfig.body = JSON.stringify(toolArgs);
  }

  console.log(`Executing ${toolName} at ${url}`);
  
  const response = await fetch(url, requestConfig);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(data, null, 2)
    }]
  };
}

async function readResource(
  mcpService: any,
  params: any,
  token: string,
  authType: string,
  authConfig: any,
  customEndpoint: string | null
) {
  const { uri } = params;
  
  // Find resource configuration
  const resources = mcpService.resources_config || [];
  const resource = resources.find((r: any) => uri.startsWith(r.uriTemplate));
  
  if (!resource) {
    throw new Error(`Resource ${uri} not found in service configuration`);
  }

  // Build API request
  const endpoint = customEndpoint || mcpService.endpoint_template;
  const url = buildUrl(endpoint, resource.endpoint, { uri });
  
  const headers = buildAuthHeaders(authType, token, authConfig);
  
  const response = await fetch(url, { method: 'GET', headers });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  return {
    contents: [{
      uri,
      mimeType: resource.mimeType || 'application/json',
      text: JSON.stringify(data, null, 2)
    }]
  };
}

function buildUrl(baseEndpoint: string, toolEndpoint: string, args: any): string {
  let url = baseEndpoint + toolEndpoint;
  
  // Replace path parameters
  if (args) {
    for (const [key, value] of Object.entries(args)) {
      url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
    }
  }
  
  return url;
}

function buildAuthHeaders(authType: string, token: string, authConfig: any): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  switch (authType) {
    case 'api_key':
      if (authConfig?.headerName) {
        headers[authConfig.headerName] = token;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
      }
      break;
    
    case 'basic':
      const username = authConfig?.username || '';
      const credentials = btoa(`${username}:${token}`);
      headers['Authorization'] = `Basic ${credentials}`;
      break;
    
    case 'oauth':
      headers['Authorization'] = `Bearer ${token}`;
      break;
    
    default:
      headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}
