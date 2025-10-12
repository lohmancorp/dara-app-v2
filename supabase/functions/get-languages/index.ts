import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache duration: 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
let cachedLanguages: Array<{ code: string; name: string }> | null = null;
let cacheTimestamp = 0;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();
    
    // Return cached data if valid
    if (cachedLanguages && (now - cacheTimestamp) < CACHE_DURATION_MS) {
      console.log('Returning cached languages');
      return new Response(
        JSON.stringify({ languages: cachedLanguages, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from Google Cloud Translation API
    const apiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_TRANSLATE_API_KEY not configured');
    }

    console.log('Fetching languages from Google Cloud Translation API');
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}&target=en`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', response.status, errorText);
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform to our format
    const languages = data.data.languages.map((lang: { language: string; name: string }) => ({
      code: lang.language,
      name: lang.name
    }));

    // Update cache
    cachedLanguages = languages;
    cacheTimestamp = now;

    console.log(`Fetched and cached ${languages.length} languages`);

    return new Response(
      JSON.stringify({ languages, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-languages function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        languages: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
