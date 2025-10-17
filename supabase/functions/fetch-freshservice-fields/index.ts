import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { endpoint, apiKey } = await req.json()

    if (!endpoint || !apiKey) {
      throw new Error('Endpoint and API key are required')
    }

    const ticketFieldsUrl = `https://${endpoint}/api/v2/ticket_form_fields`
    const conversationFieldsUrl = `https://${endpoint}/api/v2/conversation_form_fields`
    
    const authHeader = `Basic ${btoa(apiKey + ':X')}`
    const headers = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    }

    console.log('Fetching FreshService fields from:', ticketFieldsUrl)

    // Fetch both ticket and conversation fields
    const [ticketResponse, conversationResponse] = await Promise.all([
      fetch(ticketFieldsUrl, { headers }),
      fetch(conversationFieldsUrl, { headers }).catch(() => null), // Conversation fields may not exist
    ])

    if (!ticketResponse.ok) {
      const errorText = await ticketResponse.text()
      console.error('FreshService API error:', errorText)
      throw new Error(`FreshService API error: ${ticketResponse.status} ${ticketResponse.statusText}`)
    }

    const ticketData = await ticketResponse.json()
    let conversationData = { conversation_fields: [] }
    
    if (conversationResponse && conversationResponse.ok) {
      conversationData = await conversationResponse.json()
    }

    console.log('Successfully fetched FreshService fields')
    
    return new Response(
      JSON.stringify({
        success: true,
        ticket_fields: ticketData.ticket_fields || [],
        conversation_fields: conversationData.conversation_fields || [],
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error fetching FreshService fields:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})