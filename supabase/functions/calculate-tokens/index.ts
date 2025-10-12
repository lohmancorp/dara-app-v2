import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Approximate token costs per 1M tokens (as of 2025)
const MODEL_COSTS = {
  "google/gemini-2.5-pro": { input: 1.25, output: 5.0 },
  "google/gemini-2.5-flash": { input: 0.075, output: 0.3 },
  "google/gemini-2.5-flash-lite": { input: 0.0375, output: 0.15 },
  "openai/gpt-5": { input: 2.5, output: 10.0 },
  "openai/gpt-5-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-5-nano": { input: 0.03, output: 0.12 },
};

// Rough estimation: 1 token ≈ 4 characters for English text
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, systemPrompt, model } = await req.json();

    if (!prompt || !systemPrompt || !model) {
      throw new Error("Missing required fields: prompt, systemPrompt, or model");
    }

    const promptTokens = estimateTokens(prompt);
    const systemPromptTokens = estimateTokens(systemPrompt);
    const totalTokens = promptTokens + systemPromptTokens;

    // Get model costs
    const modelCost = MODEL_COSTS[model as keyof typeof MODEL_COSTS];
    if (!modelCost) {
      throw new Error(`Unknown model: ${model}`);
    }

    // Calculate cost (assuming equal input/output for estimation)
    // In reality, you'd need to know the expected output length
    const inputCost = (totalTokens / 1_000_000) * modelCost.input;
    const outputCost = (totalTokens / 1_000_000) * modelCost.output; // Rough estimate
    const totalCost = inputCost + outputCost;

    return new Response(
      JSON.stringify({
        totalTokens,
        promptTokens,
        systemPromptTokens,
        totalCost,
        model,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error calculating tokens:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
