import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfigureServiceRequest {
  action: 'create' | 'update' | 'delete' | 'set_token' | 'remove_token';
  serviceId?: string;
  serviceData?: {
    service_name: string;
    service_type: string;
    description?: string;
    uses_app_token: boolean;
    endpoint_template?: string;
    rate_limit_per_minute?: number;
    retry_delay_sec?: number;
    max_retries?: number;
    call_delay_ms?: number;
    tools_config?: any[];
    resources_config?: any[];
  };
  tokenData?: {
    encrypted_token: string;
    auth_type: string;
    auth_config?: any;
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

    // Check if user is app admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'app_admin')
      .single();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Only app admins can configure MCP services' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body: ConfigureServiceRequest = await req.json();
    const { action, serviceId, serviceData, tokenData } = body;

    console.log('MCP Configure Service:', { action, serviceId });

    switch (action) {
      case 'create': {
        if (!serviceData) {
          throw new Error('Service data required for create action');
        }

        const { data: service, error } = await supabase
          .from('mcp_services')
          .insert(serviceData)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, service }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!serviceId || !serviceData) {
          throw new Error('Service ID and data required for update action');
        }

        const { data: service, error } = await supabase
          .from('mcp_services')
          .update(serviceData)
          .eq('id', serviceId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, service }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!serviceId) {
          throw new Error('Service ID required for delete action');
        }

        const { error } = await supabase
          .from('mcp_services')
          .delete()
          .eq('id', serviceId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'set_token': {
        if (!serviceId || !tokenData) {
          throw new Error('Service ID and token data required for set_token action');
        }

        // Upsert app-provided token
        const { data: token, error } = await supabase
          .from('mcp_service_tokens')
          .upsert({
            service_id: serviceId,
            ...tokenData
          })
          .select()
          .single();

        if (error) throw error;

        // Update service to indicate it uses app token
        await supabase
          .from('mcp_services')
          .update({ uses_app_token: true })
          .eq('id', serviceId);

        return new Response(
          JSON.stringify({ success: true, token }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'remove_token': {
        if (!serviceId) {
          throw new Error('Service ID required for remove_token action');
        }

        const { error } = await supabase
          .from('mcp_service_tokens')
          .delete()
          .eq('service_id', serviceId);

        if (error) throw error;

        // Update service to indicate it doesn't use app token
        await supabase
          .from('mcp_services')
          .update({ uses_app_token: false })
          .eq('id', serviceId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('MCP Configure Service Error:', error);
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
