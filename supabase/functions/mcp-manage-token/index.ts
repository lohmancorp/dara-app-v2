import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageTokenRequest {
  action: 'set' | 'remove' | 'get';
  serviceId: string;
  ownerType: 'user' | 'team' | 'account';
  ownerId?: string; // optional, defaults to current user
  tokenData?: {
    encrypted_token: string;
    auth_type: string;
    auth_config?: any;
    endpoint?: string;
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

    const body: ManageTokenRequest = await req.json();
    const { action, serviceId, ownerType, ownerId, tokenData } = body;

    // Determine owner ID (default to current user)
    const resolvedOwnerId = ownerId || user.id;

    // Verify user has permission to manage this token
    if (ownerType === 'team' && ownerId) {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', ownerId)
        .eq('user_id', user.id)
        .single();

      if (!teamMember || teamMember.role === 'user') {
        return new Response(
          JSON.stringify({ error: 'Only team managers can manage team tokens' }),
          { 
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    if (ownerType === 'account' && ownerId) {
      const { data: accountMember } = await supabase
        .from('account_members')
        .select('role')
        .eq('account_id', ownerId)
        .eq('user_id', user.id)
        .single();

      if (!accountMember || accountMember.role !== 'account_admin') {
        return new Response(
          JSON.stringify({ error: 'Only account admins can manage account tokens' }),
          { 
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log('MCP Manage Token:', { action, serviceId, ownerType, resolvedOwnerId });

    switch (action) {
      case 'set': {
        if (!tokenData) {
          throw new Error('Token data required for set action');
        }

        const { data: connectionToken, error } = await supabase
          .from('connection_tokens')
          .upsert({
            service_id: serviceId,
            owner_type: ownerType,
            owner_id: resolvedOwnerId,
            ...tokenData
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, token: connectionToken }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'remove': {
        const { error } = await supabase
          .from('connection_tokens')
          .delete()
          .eq('service_id', serviceId)
          .eq('owner_type', ownerType)
          .eq('owner_id', resolvedOwnerId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        const { data: connectionToken, error } = await supabase
          .from('connection_tokens')
          .select('*')
          .eq('service_id', serviceId)
          .eq('owner_type', ownerType)
          .eq('owner_id', resolvedOwnerId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        return new Response(
          JSON.stringify({ 
            success: true, 
            hasToken: !!connectionToken,
            token: connectionToken ? {
              id: connectionToken.id,
              auth_type: connectionToken.auth_type,
              endpoint: connectionToken.endpoint,
              created_at: connectionToken.created_at
            } : null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('MCP Manage Token Error:', error);
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
