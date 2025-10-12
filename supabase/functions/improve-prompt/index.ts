import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { outcome, currentPrompt, type } = await req.json();
    
    if (!outcome) {
      return new Response(
        JSON.stringify({ error: "Outcome is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPromptText = type === "system" 
      ? "You are an expert at crafting system prompts for LLMs. Your task is to take a plain English description of desired system behavior and convert it into a clear, well-structured system prompt that will effectively guide an LLM's behavior. Focus on clarity, specificity, and best practices for system prompts."
      : "You are an expert at crafting user prompts for LLMs. Your task is to take a plain English description of a desired outcome and convert it into a clear, well-structured prompt that will get the best results from an LLM. Include necessary formats, specific instructions, and any constraints mentioned in the outcome description.";

    const userPromptText = currentPrompt
      ? `Here is the current ${type} prompt:\n\n${currentPrompt}\n\nPlease improve it based on this outcome description:\n\n${outcome}\n\nProvide an improved version that is more effective and follows best practices.`
      : `Please create a ${type} prompt based on this outcome description:\n\n${outcome}\n\nCreate a clear, effective prompt that will achieve this outcome.`;

    console.log(`Generating improved ${type} prompt for outcome:`, outcome);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPromptText },
          { role: "user", content: userPromptText }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate prompt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const improvedPrompt = data.choices?.[0]?.message?.content;

    if (!improvedPrompt) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Failed to generate prompt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully generated improved ${type} prompt`);

    return new Response(
      JSON.stringify({ improvedPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in improve-prompt function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});