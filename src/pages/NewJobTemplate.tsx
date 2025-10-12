import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { TagInput } from "@/components/TagInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const RESEARCH_DEPTH_OPTIONS = ["Quick Research", "Deep Research"];
const RESEARCH_EXACTNESS_OPTIONS = ["Creative", "Precise", "Strict", "Balanced"];
const RESEARCH_TYPE_OPTIONS = ["Per Object", "Per Outcome", "Overall", "Data Synthesis"];
const DATA_TYPE_OPTIONS = ["File", "Site Link", "JQL", "Dynamic Search Fields"];
const JOB_TYPE_OPTIONS = ["Scheduled", "One-Time", "Recurring", "On-going"];

const NewJobTemplate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    jobName: "",
    jobDescription: "",
    jobTeam: [] as string[],
    jobTags: [] as string[],
    jobConnection: "",
    jobPrompt: "",
    jobDataType: [] as string[],
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
  const [availableConnections] = useState([
    { id: "1", name: "Google Scholar" },
    { id: "2", name: "PubMed" },
    { id: "3", name: "arXiv" },
    { id: "4", name: "IEEE Xplore" },
  ]);
  const [availablePrompts, setAvailablePrompts] = useState<{ id: string; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchExistingData = async () => {
      const { data } = await supabase.from("prompt_templates").select("prompt_team, prompt_tags, id, prompt_name");
      
      if (data) {
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

    fetchExistingData();
  }, []);

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

  const handleDataTypeToggle = (dataType: string) => {
    setFormData((prev) => ({
      ...prev,
      jobDataType: prev.jobDataType.includes(dataType)
        ? prev.jobDataType.filter((t) => t !== dataType)
        : [...prev.jobDataType, dataType],
    }));
  };

  const renderDataTypeField = () => {
    if (formData.jobDataType.length === 0) return null;

    return (
      <div className="space-y-4">
        <Label>Job Data Type Fields</Label>
        {formData.jobDataType.map((dataType) => (
          <div key={dataType} className="space-y-2 p-4 border rounded-md">
            <Label className="text-sm font-medium">{dataType}</Label>
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
              />
            )}
            {dataType === "JQL" && (
              <Textarea
                placeholder="Enter JQL statement..."
                rows={3}
              />
            )}
            {dataType === "Dynamic Search Fields" && (
              <Input
                placeholder="Will be dynamically pulled from connection settings"
                disabled
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.jobName || !formData.jobDescription || !formData.jobConnection || 
        !formData.jobPrompt) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.jobTeam.length === 0) {
      toast({
        title: "Missing Team",
        description: "Please assign at least one team.",
        variant: "destructive",
      });
      return;
    }

    if (formData.jobTags.length === 0) {
      toast({
        title: "Missing Tags",
        description: "Please add at least one tag.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Save job template to database
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
        icon={Briefcase}
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
                <Label htmlFor="jobTeam">
                  Job Team <span className="text-destructive">*</span>
                </Label>
                <TagInput
                  id="jobTeam"
                  value={formData.jobTeam}
                  onChange={(tags) => setFormData((prev) => ({ ...prev, jobTeam: tags }))}
                  placeholder="Type to search or create teams..."
                  suggestions={existingTeams}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTags">
                  Job Tags <span className="text-destructive">*</span>
                </Label>
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

              <div className="space-y-2">
                <Label>Job Data Type</Label>
                <div className="flex flex-wrap gap-2">
                  {DATA_TYPE_OPTIONS.map((dataType) => (
                    <Badge
                      key={dataType}
                      variant={formData.jobDataType.includes(dataType) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleDataTypeToggle(dataType)}
                    >
                      {dataType}
                    </Badge>
                  ))}
                </div>
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
                <Label htmlFor="researchType">Research Type</Label>
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
                <Label htmlFor="researchDepth">Research Depth</Label>
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
                <Label htmlFor="researchExactness">Research Exactness</Label>
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
              <div className="space-y-2">
                <Label>Job Chunking</Label>
                <div className="flex gap-2">
                  <Badge
                    variant={formData.jobChunking ? "default" : "outline"}
                    className="cursor-pointer px-6 py-2"
                    onClick={() => setFormData((prev) => ({ ...prev, jobChunking: true }))}
                  >
                    Yes
                  </Badge>
                  <Badge
                    variant={!formData.jobChunking ? "default" : "outline"}
                    className="cursor-pointer px-6 py-2"
                    onClick={() => setFormData((prev) => ({ ...prev, jobChunking: false }))}
                  >
                    No
                  </Badge>
                </div>
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
              <div className="flex flex-wrap gap-2">
                {JOB_TYPE_OPTIONS.map((type) => (
                  <Badge
                    key={type}
                    variant={formData.jobType.includes(type) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        jobType: prev.jobType.includes(type)
                          ? prev.jobType.filter((t) => t !== type)
                          : [...prev.jobType, type],
                      }))
                    }
                  >
                    {type}
                  </Badge>
                ))}
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
              {isSubmitting ? "Creating..." : "Create Job Template"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewJobTemplate;
