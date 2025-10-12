import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLang } = await req.json();
    
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'texts array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!targetLang) {
      return new Response(
        JSON.stringify({ error: 'targetLang is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If target language is English, return texts as-is
    if (targetLang === 'en') {
      const translations = texts.reduce((acc, text, index) => {
        acc[index] = text;
        return acc;
      }, {} as Record<number, string>);
      
      return new Response(
        JSON.stringify({ translations, source: 'passthrough' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
    
    if (!apiKey) {
      console.warn('No API key configured, returning original texts');
      const translations = texts.reduce((acc, text, index) => {
        acc[index] = text;
        return acc;
      }, {} as Record<number, string>);
      
      return new Response(
        JSON.stringify({ translations, source: 'no-api-key', warning: 'Translation API not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Translating ${texts.length} texts to ${targetLang}`);
    
    // Call Google Cloud Translation API
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: texts,
          target: targetLang,
          format: 'text'
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Translation API error:', response.status, errorText);
      
      // Fallback: return original texts
      const translations = texts.reduce((acc, text, index) => {
        acc[index] = text;
        return acc;
      }, {} as Record<number, string>);
      
      return new Response(
        JSON.stringify({ 
          translations, 
          source: 'api-error', 
          warning: `Translation API error: ${response.status}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Transform response to indexed translations
    const translations = data.data.translations.reduce((acc: Record<number, string>, trans: any, index: number) => {
      acc[index] = trans.translatedText;
      return acc;
    }, {});

    console.log(`Successfully translated ${Object.keys(translations).length} texts`);

    return new Response(
      JSON.stringify({ translations, source: 'api' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in translate-text function:', error);
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
