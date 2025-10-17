import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FreshServiceField {
  id: number;
  name: string;
  label: string;
  description?: string;
  field_type: string;
  required: boolean;
  choices?: Array<{ id: number; value: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, apiKey } = await req.json();

    if (!endpoint || !apiKey) {
      throw new Error('Endpoint and API key are required');
    }

    // Construct the FreshService API URL
    const url = `https://${endpoint}/api/v2/ticket_form_fields`;
    
    console.log('Fetching FreshService fields from:', url);

    // Make request to FreshService API with proper authentication
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${apiKey}:X`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FreshService API error:', errorText);
      throw new Error(`FreshService API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched FreshService fields');

    return new Response(
      JSON.stringify({ 
        success: true, 
        fields: data.ticket_fields || data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching FreshService fields:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});