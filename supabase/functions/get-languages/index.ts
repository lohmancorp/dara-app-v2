import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Static fallback language list
const FALLBACK_LANGUAGES = [
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Albanian" },
  { code: "am", name: "Amharic" },
  { code: "ar", name: "Arabic" },
  { code: "hy", name: "Armenian" },
  { code: "az", name: "Azerbaijani" },
  { code: "eu", name: "Basque" },
  { code: "be", name: "Belarusian" },
  { code: "bn", name: "Bengali" },
  { code: "bs", name: "Bosnian" },
  { code: "bg", name: "Bulgarian" },
  { code: "ca", name: "Catalan" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "et", name: "Estonian" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "ms", name: "Malay" },
  { code: "no", name: "Norwegian" },
  { code: "fa", name: "Persian" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sr", name: "Serbian" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "es", name: "Spanish" },
  { code: "sv", name: "Swedish" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "ur", name: "Urdu" },
  { code: "vi", name: "Vietnamese" }
];

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
        JSON.stringify({ languages: cachedLanguages, cached: true, source: 'cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to fetch from Google Cloud Translation API
    const apiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
    
    if (apiKey) {
      try {
        console.log('Fetching languages from Google Cloud Translation API');
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}&target=en`,
          { method: 'GET' }
        );

        if (response.ok) {
          const data = await response.json();
          
          // Transform to our format
          const languages = data.data.languages.map((lang: { language: string; name: string }) => ({
            code: lang.language,
            name: lang.name
          }));

          // Update cache
          cachedLanguages = languages;
          cacheTimestamp = now;

          console.log(`Fetched and cached ${languages.length} languages from API`);

          return new Response(
            JSON.stringify({ languages, cached: false, source: 'api' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const errorText = await response.text();
          console.warn('Google API error, falling back to static list:', response.status, errorText);
        }
      } catch (apiError) {
        console.warn('Google API request failed, falling back to static list:', apiError);
      }
    } else {
      console.log('No API key configured, using static language list');
    }

    // Fallback to static list
    console.log('Using static language list');
    return new Response(
      JSON.stringify({ languages: FALLBACK_LANGUAGES, cached: false, source: 'fallback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-languages function:', error);
    // Even on error, return fallback languages
    return new Response(
      JSON.stringify({ 
        languages: FALLBACK_LANGUAGES,
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
