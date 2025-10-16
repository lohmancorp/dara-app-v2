import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Activity, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { TagInput } from "@/components/TagInput";
import { SingleSelectTagInput } from "@/components/SingleSelectTagInput";
import { MultiSelectTagInput } from "@/components/MultiSelectTagInput";
import { ConnectionSelect } from "@/components/ConnectionSelect";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const RESEARCH_DEPTH_OPTIONS = ["Quick Research", "Deep Research"];
const RESEARCH_EXACTNESS_OPTIONS = ["Creative", "Precise", "Strict", "Balanced"];
const RESEARCH_TYPE_OPTIONS = ["Per Object", "Per Outcome", "Overall", "Data Synthesis"];
const DATA_TYPE_OPTIONS = ["File", "Site Link", "JQL", "Dynamic Search Fields"];
const JOB_TYPE_OPTIONS = ["Scheduled", "One-Time", "Recurring", "On-going"];

const NewJobTemplate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    jobName: "",
    jobDescription: "",
    jobTeam: [] as string[],
    jobTags: [] as string[],
    jobConnection: "",
    jobPrompt: "",
    jobDataType: "",
    jobDataTypeField: "",
    researchType: "",
    researchDepth: "Quick Research",
    researchExactness: "Balanced",
    jobChunking: false,
    chunkSize: 20,
    jobType: [] as string[],
  });

  const [existingTeams, setExistingTeams] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [availableConnections, setAvailableConnections] = useState<Array<{ id: string; name: string; connection_type: string }>>([]);
  const [availablePrompts, setAvailablePrompts] = useState<{ id: string; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchExistingData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [promptsData, connectionsData] = await Promise.all([
        supabase.from("prompt_templates").select("prompt_team, prompt_tags, id, prompt_name"),
        supabase.from("connections").select("id, name, connection_type, is_active").eq("user_id", user.id).eq("is_active", true),
      ]);
      
      if (promptsData.data && promptsData.data.length > 0) {
        const teams = new Set<string>();
        const tags = new Set<string>();
        
        promptsData.data.forEach((item) => {
          item.prompt_team?.forEach((team: string) => teams.add(team));
          item.prompt_tags?.forEach((tag: string) => tags.add(tag));
        });
        
        setExistingTeams(Array.from(teams));
        setExistingTags(Array.from(tags));
        setAvailablePrompts(promptsData.data.map(item => ({ id: item.id, name: item.prompt_name })));
      }

      if (connectionsData.data) {
        setAvailableConnections(connectionsData.data.map(conn => ({
          id: conn.id,
          name: conn.name,
          connection_type: conn.connection_type,
        })));
      }

      // Handle clone data from location state
      const cloneData = (location.state as any)?.cloneData;
      if (cloneData) {
        const outcome = cloneData.job_outcome || "";
        const dataTypeMatch = outcome.match(/Data Type: ([^,]+)/);
        const chunkingMatch = outcome.match(/Chunking: (true|false)/);
        const chunkSizeMatch = outcome.match(/Chunk Size: (\d+)/);
        const jobTypesMatch = outcome.match(/Job Types: (.+)$/);

        // Map connection and prompt to current user's equivalent
        let mappedConnectionId = '';
        let mappedPromptId = '';

        // Fetch original connection type
        if (cloneData.job_connection) {
          const { data: originalConnection } = await supabase
            .from("connections")
            .select("connection_type")
            .eq("id", cloneData.job_connection)
            .single();

          if (originalConnection && connectionsData.data) {
            const userEquivalentConnection = connectionsData.data.find(
              conn => conn.connection_type === originalConnection.connection_type
            );
            
            if (userEquivalentConnection) {
              mappedConnectionId = userEquivalentConnection.id;
            } else {
              toast({
                title: "Connection Not Found",
                description: `You don't have a ${originalConnection.connection_type} connection. Please create one to use this template.`,
                variant: "destructive",
              });
            }
          }
        }

        // Fetch original prompt name
        if (cloneData.job_prompt) {
          const { data: originalPrompt } = await supabase
            .from("prompt_templates")
            .select("prompt_name")
            .eq("id", cloneData.job_prompt)
            .single();

          if (originalPrompt && promptsData.data) {
            const userEquivalentPrompt = promptsData.data.find(
              prompt => prompt.prompt_name === originalPrompt.prompt_name
            );
            
            if (userEquivalentPrompt) {
              mappedPromptId = userEquivalentPrompt.id;
            }
          }
        }

        setFormData({
          jobName: '', // Always empty for uniqueness
          jobDescription: cloneData.job_description || '',
          jobTeam: cloneData.job_team || [],
          jobTags: cloneData.job_tags || [],
          jobConnection: mappedConnectionId,
          jobPrompt: mappedPromptId,
          jobDataType: dataTypeMatch ? dataTypeMatch[1] : '',
          jobDataTypeField: '',
          researchType: cloneData.research_type || '',
          researchDepth: cloneData.research_depth || 'Quick Research',
          researchExactness: cloneData.research_exactness || 'Balanced',
          jobChunking: chunkingMatch ? chunkingMatch[1] === 'true' : false,
          chunkSize: chunkSizeMatch ? parseInt(chunkSizeMatch[1]) : 20,
          jobType: jobTypesMatch && jobTypesMatch[1] ? jobTypesMatch[1].split(", ").filter((t: string) => t) : [],
        });
      }
    };

    fetchExistingData();
  }, [location, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/json',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, JSON, CSV, XLSX, XLS, DOC, or DOCX file.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 20MB.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleDataTypeSelect = (dataType: string) => {
    setFormData((prev) => ({
      ...prev,
      jobDataType: dataType,
    }));
  };

  const handleJobTypeToggle = (jobType: string) => {
    setFormData((prev) => ({
      ...prev,
      jobType: prev.jobType.includes(jobType)
        ? prev.jobType.filter((t) => t !== jobType)
        : [...prev.jobType, jobType],
    }));
  };

  const renderDataTypeField = () => {
    if (!formData.jobDataType) return null;

    const dataType = formData.jobDataType;

    return (
      <div className="space-y-2 p-4 border rounded-md bg-muted/30">
        <Label className="text-sm font-medium text-muted-foreground">{dataType} (Informational)</Label>
        {dataType === "File" && (
          <div className="space-y-2">
            <div className="border-2 border-dashed border-border rounded-md p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <Input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.json,.csv,.xlsx,.xls,.doc,.docx"
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-sm text-muted-foreground">
                  {selectedFile ? selectedFile.name : "Drop file here or click to browse"}
                </span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JSON, CSV, XLSX, XLS, DOC, DOCX (Max 20MB)
              </p>
            </div>
          </div>
        )}
        {dataType === "Site Link" && (
          <Input
            placeholder="https://example.com/research-article"
            type="url"
            disabled
          />
        )}
        {dataType === "JQL" && (
          <Textarea
            placeholder="Enter JQL statement..."
            rows={3}
            disabled
          />
        )}
        {dataType === "Dynamic Search Fields" && (
          <Input
            placeholder="Will be dynamically pulled from connection settings"
            disabled
          />
        )}
      </div>
    );
  };

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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Check if job name already exists for this user
      const { data: existingJob } = await supabase
        .from("job_templates")
        .select("id")
        .eq("user_id", userData.user.id)
        .eq("job_name", formData.jobName)
        .maybeSingle();

      if (existingJob) {
        toast({
          title: "Duplicate Job Name",
          description: "A job template with this name already exists. Please choose a unique name.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Auto-add "Job" tag if not already present
      const tagsWithType = formData.jobTags.includes("Job") 
        ? formData.jobTags 
        : [...formData.jobTags, "Job"];

      const { error } = await supabase.from("job_templates").insert({
        user_id: userData.user.id,
        job_name: formData.jobName,
        job_description: formData.jobDescription,
        job_connection: formData.jobConnection,
        job_prompt: formData.jobPrompt,
        job_team: formData.jobTeam,
        job_tags: tagsWithType,
        research_type: formData.researchType,
        research_depth: formData.researchDepth,
        research_exactness: formData.researchExactness,
        job_outcome: `Data Type: ${formData.jobDataType}, Chunking: ${formData.jobChunking}, Chunk Size: ${formData.chunkSize}, Job Types: ${formData.jobType.join(", ")}`,
      });

      if (error) throw error;

      toast({
        title: "Job Template Created",
        description: "Your job template has been created successfully.",
      });
      navigate("/templates");
    } catch (error) {
      console.error("Error creating job template:", error);
      toast({
        title: "Error",
        description: "Failed to create job template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Activity}
        title="Create Job Template"
        description="Define a new job template for your research workflow"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>
            <div className="space-y-4">
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

          {/* Organization */}
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

          {/* Job Configuration */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Job Configuration</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobConnection">
                  Job Connection <span className="text-destructive">*</span>
                </Label>
                <ConnectionSelect
                  value={formData.jobConnection}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, jobConnection: value }))}
                  connections={availableConnections}
                />
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

              <div className="space-y-2">
                <Label>Job Data Type</Label>
                <SingleSelectTagInput
                  value={formData.jobDataType}
                  onChange={handleDataTypeSelect}
                  options={DATA_TYPE_OPTIONS}
                  placeholder="Select a data type"
                />
              </div>

              {renderDataTypeField()}
            </div>
          </div>

          <Separator />

          {/* Research Settings */}
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

          {/* Chunking Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Chunking Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="jobChunking">Job Chunking</Label>
                <Switch
                  id="jobChunking"
                  checked={formData.jobChunking}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, jobChunking: checked }))}
                />
              </div>

              {formData.jobChunking && (
                <div className="space-y-2">
                  <Label htmlFor="chunkSize">Chunk Size</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="chunkSize"
                      type="number"
                      value={formData.chunkSize}
                      onChange={(e) => setFormData((prev) => ({ ...prev, chunkSize: Math.max(10, parseInt(e.target.value) || 10) }))}
                      step={10}
                      min={10}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">items per chunk</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Job Type */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Job Type</h2>
            <div className="space-y-2">
              <Label>Job Type Tags</Label>
              <MultiSelectTagInput
                value={formData.jobType}
                onChange={(types) => setFormData((prev) => ({ ...prev, jobType: types }))}
                options={JOB_TYPE_OPTIONS}
                placeholder="Select job types"
              />
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
              {isSubmitting ? "Creating..." : "Create Job Template"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewJobTemplate;
