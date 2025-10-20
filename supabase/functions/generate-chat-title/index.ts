import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: string;
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { userMessage, assistantMessage, sessionId } = await req.json();

    let contextMessages = '';
    
    // If sessionId is provided, fetch messages from the session
    if (sessionId) {
      console.log('Fetching messages for session:', sessionId);
      const { data: messages, error: messagesError } = await supabaseClient
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(10); // Get first 10 messages for context

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      } else if (messages && messages.length > 0) {
        // Build context from messages
        contextMessages = messages
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 200)}`)
          .join('\n');
      }
    } else if (!userMessage) {
      throw new Error('Either sessionId or userMessage is required');
    }

    const prompt = sessionId && contextMessages
      ? `Based on this conversation:\n${contextMessages}\n\nGenerate a concise title (5-7 words):`
      : `User asked: "${userMessage}"\n${assistantMessage ? `Assistant responded: "${assistantMessage.substring(0, 200)}..."` : ''}\n\nGenerate a concise title (5-7 words):`;

    console.log('Generating chat title with prompt length:', prompt.length);

    // Use Lovable AI to generate a concise title
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Generate a concise, descriptive title that is 5-7 words long and summarizes the main topic of this chat conversation. Return ONLY the title text, nothing else. Do not use quotes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      // Handle rate limiting or payment errors
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      
      // Fallback to truncated user message
      const fallbackTitle = userMessage 
        ? (userMessage.length > 50 ? userMessage.substring(0, 50).trim() + '...' : userMessage.trim())
        : 'New Chat';
      
      return new Response(
        JSON.stringify({ title: fallbackTitle }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || 'New Chat';
    
    // Remove quotes if present
    title = title.replace(/^["']|["']$/g, '');
    
    // Ensure title is reasonable length
    if (title.length > 100) {
      title = title.substring(0, 100).trim() + '...';
    }

    console.log('Generated title:', title);

    return new Response(
      JSON.stringify({ title }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating chat title:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
