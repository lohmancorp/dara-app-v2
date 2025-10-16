import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FilePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { TagInput } from "@/components/TagInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

const AVAILABLE_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

const EditPromptTemplate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
    promptTeam: [] as string[],
    promptTags: [] as string[],
  });

  const [existingTeams, setExistingTeams] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!id) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase
          .from("prompt_templates")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        // Check if current user is the author
        if (user?.id !== data.user_id) {
          toast({
            title: "Access Denied",
            description: "You can only edit your own templates. You can clone this template instead.",
            variant: "destructive",
          });
          navigate(`/templates/prompt/${id}/view`);
          return;
        }

        setFormData({
          promptName: data.prompt_name,
          promptDescription: data.prompt_description,
          promptOutcome: data.prompt_outcome,
          prompt: data.prompt,
          systemOutcome: data.system_outcome,
          systemPrompt: data.system_prompt,
          promptModel: data.prompt_model,
          promptTeam: data.prompt_team || [],
          promptTags: data.prompt_tags || [],
        });
      } catch (error) {
        console.error("Error fetching template:", error);
        toast({
          title: "Error",
          description: "Failed to load template.",
          variant: "destructive",
        });
        navigate("/templates");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchExistingData = async () => {
      const { data } = await supabase.from("prompt_templates").select("prompt_team, prompt_tags");
      
      if (data) {
        const teams = new Set<string>();
        const tags = new Set<string>();
        
        data.forEach((item) => {
          item.prompt_team?.forEach((team: string) => teams.add(team));
          item.prompt_tags?.forEach((tag: string) => tags.add(tag));
        });
        
        setExistingTeams(Array.from(teams));
        setExistingTags(Array.from(tags));
      }
    };

    fetchTemplate();
    fetchExistingData();
  }, [id, navigate, toast]);

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

    setIsSubmitting(true);
    try {
      const { data: tokenData } = await supabase.functions.invoke("calculate-tokens", {
        body: {
          prompt: formData.prompt,
          systemPrompt: formData.systemPrompt,
          model: formData.promptModel,
        },
      });

      const totalTokens = tokenData?.totalTokens || 0;
      const totalPromptCost = tokenData?.totalCost || 0;

      // Auto-add "Prompt" tag if not already present
      const tagsWithType = formData.promptTags.includes("Prompt") 
        ? formData.promptTags 
        : [...formData.promptTags, "Prompt"];

      const { error } = await supabase
        .from("prompt_templates")
        .update({
          prompt_name: formData.promptName,
          prompt_description: formData.promptDescription,
          prompt_outcome: formData.promptOutcome,
          prompt: formData.prompt,
          system_outcome: formData.systemOutcome,
          system_prompt: formData.systemPrompt,
          prompt_model: formData.promptModel,
          prompt_team: formData.promptTeam,
          prompt_tags: tagsWithType,
          total_tokens: totalTokens,
          total_prompt_cost: totalPromptCost,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Template Updated",
        description: "Your template has been updated successfully.",
      });
      navigate("/templates");
    } catch (error) {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Sparkles}
        title="Edit Prompt Template"
        description="Update your prompt template"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="templateId">Template ID</Label>
                <Input
                  id="templateId"
                  value={id}
                  disabled
                  className="bg-muted"
                />
              </div>

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
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Organization</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promptTeam">Prompt Team</Label>
                <TagInput
                  id="promptTeam"
                  value={formData.promptTeam}
                  onChange={(tags) => setFormData((prev) => ({ ...prev, promptTeam: tags }))}
                  placeholder="Type to search or create teams..."
                  suggestions={existingTeams}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promptTags">Prompt Tags</Label>
                <TagInput
                  id="promptTags"
                  value={formData.promptTags}
                  onChange={(tags) => setFormData((prev) => ({ ...prev, promptTags: tags }))}
                  placeholder="Type to search or create tags..."
                  suggestions={existingTags}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Prompt Configuration</h2>
            <div className="space-y-4">
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
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">System Prompt Configuration</h2>
            <div className="space-y-4">
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
            </div>
          </div>

          <Separator />

          <div className="flex gap-4 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/templates")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Template"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPromptTemplate;
