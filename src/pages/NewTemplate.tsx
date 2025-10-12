import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AVAILABLE_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

const NewTemplate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingSystemPrompt, setIsGeneratingSystemPrompt] = useState(false);

  const [formData, setFormData] = useState({
    promptName: "",
    promptDescription: "",
    promptOutcome: "",
    prompt: "",
    systemOutcome: "",
    systemPrompt: "",
    promptModel: "google/gemini-2.5-flash",
    totalTokens: 0,
    totalPromptCost: 0,
  });

  const handleGeneratePrompt = async () => {
    if (!formData.promptOutcome) {
      toast({
        title: "Missing Prompt Outcome",
        description: "Please provide a Prompt Outcome to generate the prompt.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", {
        body: {
          outcome: formData.promptOutcome,
          currentPrompt: formData.prompt,
          type: "prompt",
        },
      });

      if (error) throw error;

      setFormData((prev) => ({ ...prev, prompt: data.improvedPrompt }));
      toast({
        title: "Prompt Generated",
        description: "The prompt has been improved successfully.",
      });
    } catch (error) {
      console.error("Error generating prompt:", error);
      toast({
        title: "Error",
        description: "Failed to generate prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGenerateSystemPrompt = async () => {
    if (!formData.systemOutcome) {
      toast({
        title: "Missing System Outcome",
        description: "Please provide a System Outcome to generate the system prompt.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingSystemPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", {
        body: {
          outcome: formData.systemOutcome,
          currentPrompt: formData.systemPrompt,
          type: "system",
        },
      });

      if (error) throw error;

      setFormData((prev) => ({ ...prev, systemPrompt: data.improvedPrompt }));
      toast({
        title: "System Prompt Generated",
        description: "The system prompt has been improved successfully.",
      });
    } catch (error) {
      console.error("Error generating system prompt:", error);
      toast({
        title: "Error",
        description: "Failed to generate system prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSystemPrompt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.promptName || !formData.promptDescription || !formData.promptOutcome || 
        !formData.prompt || !formData.systemOutcome || !formData.systemPrompt || !formData.promptModel) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.promptDescription.length > 255) {
      toast({
        title: "Description Too Long",
        description: "Prompt description must be 255 characters or less.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const { error } = await supabase.from("prompt_templates").insert({
        user_id: userData.user.id,
        prompt_name: formData.promptName,
        prompt_description: formData.promptDescription,
        prompt_outcome: formData.promptOutcome,
        prompt: formData.prompt,
        system_outcome: formData.systemOutcome,
        system_prompt: formData.systemPrompt,
        prompt_model: formData.promptModel,
        total_tokens: formData.totalTokens,
        total_prompt_cost: formData.totalPromptCost,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Duplicate Name",
            description: "A prompt template with this name already exists.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Template Created",
        description: "Your prompt template has been created successfully.",
      });
      navigate("/templates");
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={FilePlus}
        title="Create Prompt Template"
        description="Define a new prompt template for your research workflow"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="promptName">
              Prompt Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="promptName"
              value={formData.promptName}
              onChange={(e) => setFormData((prev) => ({ ...prev, promptName: e.target.value }))}
              placeholder="Enter a unique prompt name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promptDescription">
              Prompt Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="promptDescription"
              value={formData.promptDescription}
              onChange={(e) => setFormData((prev) => ({ ...prev, promptDescription: e.target.value }))}
              placeholder="Enter a helpful description (max 255 characters)"
              maxLength={255}
              rows={2}
              required
            />
            <p className="text-sm text-muted-foreground">
              {formData.promptDescription.length}/255 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promptModel">
              Prompt Model <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.promptModel}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, promptModel: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promptOutcome">
              Prompt Outcome <span className="text-destructive">*</span>
            </Label>
            <WysiwygEditor
              value={formData.promptOutcome}
              onChange={(value) => setFormData((prev) => ({ ...prev, promptOutcome: value }))}
              placeholder="Describe what you want the prompt to achieve..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt">
                Prompt <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                size="icon"
                variant="default"
                onClick={handleGeneratePrompt}
                disabled={isGeneratingPrompt || !formData.promptOutcome}
                className="rounded-full h-10 w-10"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData((prev) => ({ ...prev, prompt: e.target.value }))}
              placeholder="The final prompt text..."
              className="min-h-[200px] resize-y"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemOutcome">
              System Outcome <span className="text-destructive">*</span>
            </Label>
            <WysiwygEditor
              value={formData.systemOutcome}
              onChange={(value) => setFormData((prev) => ({ ...prev, systemOutcome: value }))}
              placeholder="Describe the desired system prompt behavior..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="systemPrompt">
                System Prompt <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                size="icon"
                variant="default"
                onClick={handleGenerateSystemPrompt}
                disabled={isGeneratingSystemPrompt || !formData.systemOutcome}
                className="rounded-full h-10 w-10"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              id="systemPrompt"
              value={formData.systemPrompt}
              onChange={(e) => setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))}
              placeholder="The final system prompt text..."
              className="min-h-[200px] resize-y"
              required
            />
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/templates")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTemplate;