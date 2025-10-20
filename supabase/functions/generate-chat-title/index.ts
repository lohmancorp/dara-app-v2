import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: string;
  content: string;
}

// Helper to call LLM based on connection type
async function callLLM(
  connectionType: 'gemini' | 'openai',
  apiKey: string,
  messages: any[]
) {
  if (connectionType === 'gemini') {
    const geminiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }]
      }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response from Gemini');
    }

    const textContent = candidate.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('');

    return {
      choices: [{
        message: {
          role: 'assistant',
          content: textContent || null
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
        messages
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    return await response.json();
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    // Get default LLM connection
    const { data: defaultConnection, error: connError } = await supabaseClient
      .from('connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_chat_default', true)
      .eq('is_active', true)
      .in('connection_type', ['gemini', 'openai'])
      .single();

    if (connError || !defaultConnection) {
      console.error('No default LLM connection found:', connError);
      throw new Error('No default LLM connection configured. Please go to Connections and mark a Gemini or OpenAI connection as your chat default.');
    }

    const apiKey = defaultConnection.auth_config?.api_key;
    if (!apiKey) {
      throw new Error('LLM connection is missing API key. Please update your connection configuration.');
    }

    const connectionType = defaultConnection.connection_type as 'gemini' | 'openai';
    console.log('Generating title using:', connectionType);

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

    // Use the default chat connection
    const llmMessages = [
      {
        role: 'system',
        content: 'Generate a concise, descriptive title that is 5-7 words long and summarizes the main topic of this chat conversation. Return ONLY the title text, nothing else. Do not use quotes.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await callLLM(connectionType, apiKey, llmMessages);

    let title = response.choices?.[0]?.message?.content?.trim() || 'New Chat';
    
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
