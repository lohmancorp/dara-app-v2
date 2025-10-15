import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { TagInput } from "@/components/TagInput";
import { SingleSelectTagInput } from "@/components/SingleSelectTagInput";
import { MultiSelectTagInput } from "@/components/MultiSelectTagInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const RESEARCH_DEPTH_OPTIONS = ["Quick Research", "Deep Research"];
const RESEARCH_EXACTNESS_OPTIONS = ["Creative", "Precise", "Strict", "Balanced"];
const RESEARCH_TYPE_OPTIONS = ["Per Object", "Per Outcome", "Overall", "Data Synthesis"];

const EditJobTemplate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    jobName: "",
    jobDescription: "",
    jobTeam: [] as string[],
    jobTags: [] as string[],
    jobConnection: "",
    jobPrompt: "",
    researchType: "",
    researchDepth: "Quick Research",
    researchExactness: "Balanced",
    jobOutcome: "",
  });

  const [existingTeams, setExistingTeams] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [availableConnections] = useState([
    { id: "1", name: "Google Scholar" },
    { id: "2", name: "PubMed" },
    { id: "3", name: "arXiv" },
    { id: "4", name: "IEEE Xplore" },
  ]);
  const [availablePrompts, setAvailablePrompts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("job_templates")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        setFormData({
          jobName: data.job_name,
          jobDescription: data.job_description,
          jobTeam: data.job_team || [],
          jobTags: data.job_tags || [],
          jobConnection: data.job_connection,
          jobPrompt: data.job_prompt,
          researchType: data.research_type,
          researchDepth: data.research_depth,
          researchExactness: data.research_exactness,
          jobOutcome: data.job_outcome || "",
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
      const { data } = await supabase.from("prompt_templates").select("prompt_team, prompt_tags, id, prompt_name");
      
      if (data && data.length > 0) {
        const teams = new Set<string>();
        const tags = new Set<string>();
        
        data.forEach((item) => {
          item.prompt_team?.forEach((team: string) => teams.add(team));
          item.prompt_tags?.forEach((tag: string) => tags.add(tag));
        });
        
        setExistingTeams(Array.from(teams));
        setExistingTags(Array.from(tags));
        setAvailablePrompts(data.map(item => ({ id: item.id, name: item.prompt_name })));
      }
    };

    fetchTemplate();
    fetchExistingData();
  }, [id, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.jobName || !formData.jobDescription || !formData.jobConnection || 
        !formData.jobPrompt || !formData.researchType || !formData.researchDepth || 
        !formData.researchExactness) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-add "Job" tag if not already present
      const tagsWithType = formData.jobTags.includes("Job") 
        ? formData.jobTags 
        : [...formData.jobTags, "Job"];

      const { error } = await supabase
        .from("job_templates")
        .update({
          job_name: formData.jobName,
          job_description: formData.jobDescription,
          job_connection: formData.jobConnection,
          job_prompt: formData.jobPrompt,
          job_team: formData.jobTeam,
          job_tags: tagsWithType,
          research_type: formData.researchType,
          research_depth: formData.researchDepth,
          research_exactness: formData.researchExactness,
          job_outcome: formData.jobOutcome,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Job Template Updated",
        description: "Your job template has been updated successfully.",
      });
      navigate("/templates");
    } catch (error) {
      console.error("Error updating job template:", error);
      toast({
        title: "Error",
        description: "Failed to update job template. Please try again.",
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
        icon={Briefcase}
        title="Edit Job Template"
        description="Update your job template"
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
                <Label htmlFor="jobName">
                  Job Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="jobName"
                  value={formData.jobName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, jobName: e.target.value }))}
                  placeholder="Enter a unique job name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">
                  Job Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="jobDescription"
                  value={formData.jobDescription}
                  onChange={(e) => setFormData((prev) => ({ ...prev, jobDescription: e.target.value }))}
                  placeholder="Enter a helpful description"
                  rows={3}
                  required
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Organization</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobTeam">Job Team</Label>
                <TagInput
                  id="jobTeam"
                  value={formData.jobTeam}
                  onChange={(tags) => setFormData((prev) => ({ ...prev, jobTeam: tags }))}
                  placeholder="Type to search or create teams..."
                  suggestions={existingTeams}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTags">Job Tags</Label>
                <TagInput
                  id="jobTags"
                  value={formData.jobTags}
                  onChange={(tags) => setFormData((prev) => ({ ...prev, jobTags: tags }))}
                  placeholder="Type to search or create tags..."
                  suggestions={existingTags}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Job Configuration</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobConnection">
                  Job Connection <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.jobConnection}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, jobConnection: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableConnections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id}>
                        {connection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobPrompt">
                  Job Prompt <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.jobPrompt}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, jobPrompt: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a prompt template" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrompts.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Research Settings</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="researchType">
                  Research Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.researchType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, researchType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select research type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESEARCH_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="researchDepth">
                  Research Depth <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.researchDepth}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, researchDepth: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESEARCH_DEPTH_OPTIONS.map((depth) => (
                      <SelectItem key={depth} value={depth}>
                        {depth}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="researchExactness">
                  Research Exactness <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.researchExactness}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, researchExactness: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESEARCH_EXACTNESS_OPTIONS.map((exactness) => (
                      <SelectItem key={exactness} value={exactness}>
                        {exactness}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Additional Settings</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobOutcome">Job Outcome Details</Label>
                <Textarea
                  id="jobOutcome"
                  value={formData.jobOutcome}
                  onChange={(e) => setFormData((prev) => ({ ...prev, jobOutcome: e.target.value }))}
                  placeholder="Enter additional job outcome details..."
                  rows={3}
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

export default EditJobTemplate;
