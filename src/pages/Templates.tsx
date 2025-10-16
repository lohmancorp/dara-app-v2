import { FileText, Briefcase, Eye, Pencil, Trash2, Play, Search, X, Sparkles, Activity, ArrowUpDown, ThumbsUp, ThumbsDown, ArrowUp, ArrowDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useFloatingAction } from "@/components/AppLayout";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PromptTemplate = {
  id: string;
  prompt_name: string;
  prompt_description: string;
  prompt_team: string[];
  prompt_tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
};

type JobTemplate = {
  id: string;
  job_name: string;
  job_description: string;
  job_team: string[];
  job_tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
};

type UnifiedTemplate = {
  id: string;
  name: string;
  description: string;
  team: string[];
  tags: string[];
  type: "prompt" | "job";
  created_at: string;
  updated_at: string;
  positiveScore: number;
  negativeScore: number;
  userVote: number | null;
  authorName: string | null;
  user_id: string;
};

type SortField = "name" | "created_at" | "updated_at" | "score";
type SortDirection = "asc" | "desc";

const Templates = () => {
  const { setActionButton } = useFloatingAction();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [jobTemplates, setJobTemplates] = useState<JobTemplate[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; type: "prompt" | "job"; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<"job" | "prompt" | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [votes, setVotes] = useState<any[]>([]);
  const [userVotes, setUserVotes] = useState<any[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pendingVoteData, setPendingVoteData] = useState<{ templateId: string; templateType: "prompt" | "job" } | null>(null);
  const [authorNames, setAuthorNames] = useState<Map<string, string | null>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      const [promptResult, jobResult, votesResult, userVotesResult] = await Promise.all([
        supabase.from("prompt_templates").select("id, prompt_name, prompt_description, prompt_team, prompt_tags, created_at, updated_at, user_id").order("created_at", { ascending: false }),
        supabase.from("job_templates").select("id, job_name, job_description, job_team, job_tags, created_at, updated_at, user_id").order("created_at", { ascending: false }),
        supabase.from("template_votes").select("template_id, template_type, vote"),
        user ? supabase.from("template_votes").select("template_id, template_type, vote").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      ]);

      if (promptResult.data) setPromptTemplates(promptResult.data);
      if (jobResult.data) setJobTemplates(jobResult.data);
      if (votesResult.data) setVotes(votesResult.data);
      if (userVotesResult.data) setUserVotes(userVotesResult.data);

      // Fetch author names
      const allUserIds = [
        ...(promptResult.data || []).map(t => t.user_id),
        ...(jobResult.data || []).map(t => t.user_id),
      ].filter(Boolean);

      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", allUserIds);

        setAuthorNames(new Map(profilesData?.map(p => [p.id, p.full_name]) || []));
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    setActionButton(
      <FloatingActionButton 
        label="New Template" 
        onClick={() => setShowTemplateDialog(true)} 
      />
    );
    return () => setActionButton(null);
  }, [setActionButton]);

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      const table = templateToDelete.type === "prompt" ? "prompt_templates" : "job_templates";
      const { error } = await supabase.from(table).delete().eq("id", templateToDelete.id);

      if (error) throw error;

      toast({
        title: "Template Deleted",
        description: `${templateToDelete.name} has been deleted successfully.`,
      });
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleDeleteClick = (id: string, type: "prompt" | "job", name: string) => {
    setTemplateToDelete({ id, type, name });
    setDeleteDialogOpen(true);
  };

  // Unify templates with vote data
  const unifiedTemplates = useMemo(() => {
    const unified: UnifiedTemplate[] = [
      ...promptTemplates.map(t => {
        const templateVotes = votes.filter(v => v.template_id === t.id && v.template_type === "prompt");
        const positiveScore = templateVotes.filter(v => v.vote === 1).length;
        const negativeScore = templateVotes.filter(v => v.vote === -1).length;
        const userVote = userVotes.find(v => v.template_id === t.id && v.template_type === "prompt")?.vote || null;
        
        return {
          id: t.id,
          name: t.prompt_name,
          description: t.prompt_description,
          team: t.prompt_team,
          tags: t.prompt_tags,
          type: "prompt" as const,
          created_at: t.created_at,
          updated_at: t.updated_at,
          positiveScore,
          negativeScore,
          userVote,
          authorName: authorNames.get(t.user_id) || null,
          user_id: t.user_id,
        };
      }),
      ...jobTemplates.map(t => {
        const templateVotes = votes.filter(v => v.template_id === t.id && v.template_type === "job");
        const positiveScore = templateVotes.filter(v => v.vote === 1).length;
        const negativeScore = templateVotes.filter(v => v.vote === -1).length;
        const userVote = userVotes.find(v => v.template_id === t.id && v.template_type === "job")?.vote || null;
        
        return {
          id: t.id,
          name: t.job_name,
          description: t.job_description,
          team: t.job_team,
          tags: t.job_tags,
          type: "job" as const,
          created_at: t.created_at,
          updated_at: t.updated_at,
          positiveScore,
          negativeScore,
          userVote,
          authorName: authorNames.get(t.user_id) || null,
          user_id: t.user_id,
        };
      }),
    ];

    return unified;
  }, [promptTemplates, jobTemplates, votes, userVotes, authorNames]);

  // Filter templates based on search and type
  const searchFilteredTemplates = useMemo(() => {
    return unifiedTemplates.filter(template => {
      // Search filter
      const matchesSearch = !searchQuery || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (template.authorName && template.authorName.toLowerCase().includes(searchQuery.toLowerCase()));

      // Type filter
      const matchesType = !typeFilter || template.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [unifiedTemplates, searchQuery, typeFilter]);

  // Get top 5 tags from filtered results
  const allTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    searchFilteredTemplates.forEach(template => {
      template.tags?.forEach(tag => {
        if (tag !== "Job" && tag !== "Prompt") {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      });
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }, [searchFilteredTemplates]);

  // Apply tag filters and sorting
  const filteredTemplates = useMemo(() => {
    let filtered = searchFilteredTemplates.filter(template => {
      const matchesFilters = selectedFilters.length === 0 || 
        selectedFilters.every(filter => template.tags?.includes(filter));
      return matchesFilters;
    });

    // Sort templates
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "updated_at":
          aVal = new Date(a.updated_at).getTime();
          bVal = new Date(b.updated_at).getTime();
          break;
        case "score":
          aVal = a.positiveScore - a.negativeScore;
          bVal = b.positiveScore - b.negativeScore;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [searchFilteredTemplates, selectedFilters, sortField, sortDirection]);

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const toggleTypeFilter = (type: "job" | "prompt") => {
    setTypeFilter(prev => prev === type ? null : type);
  };

  const clearFilters = () => {
    setSelectedFilters([]);
    setTypeFilter(null);
  };

  const getSortLabel = () => {
    const labels = {
      name: "Name",
      created_at: "Creation Date",
      updated_at: "Update Date",
      score: "Score",
    };
    return labels[sortField];
  };

  const handleVote = async (templateId: string, templateType: "prompt" | "job", voteValue: 1 | -1, currentUserVote: number | null) => {
    // If voting negative, show feedback dialog
    if (voteValue === -1 && currentUserVote !== -1) {
      setPendingVoteData({ templateId, templateType });
      setShowFeedbackDialog(true);
      return;
    }
    
    await processVote(templateId, templateType, voteValue, currentUserVote);
  };

  const processVote = async (templateId: string, templateType: "prompt" | "job", voteValue: 1 | -1, currentUserVote: number | null, feedbackText?: string) => {
    setIsVoting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to vote.",
          variant: "destructive",
        });
        return;
      }

      // If clicking the same vote, remove it
      if (currentUserVote === voteValue) {
        const { error } = await supabase
          .from("template_votes")
          .delete()
          .eq("user_id", user.id)
          .eq("template_id", templateId)
          .eq("template_type", templateType);

        if (error) throw error;

        // Also delete feedback if it exists
        await supabase
          .from("vote_feedback")
          .delete()
          .eq("user_id", user.id)
          .eq("template_id", templateId)
          .eq("template_type", templateType);
      } else {
        // Otherwise, upsert the vote
        const { data: voteData, error } = await supabase
          .from("template_votes")
          .upsert({
            user_id: user.id,
            template_id: templateId,
            template_type: templateType,
            vote: voteValue,
          }, {
            onConflict: "user_id,template_id,template_type"
          })
          .select()
          .single();

        if (error) throw error;

        // If negative vote with feedback, store it
        if (voteValue === -1 && feedbackText) {
          await supabase
            .from("vote_feedback")
            .upsert({
              vote_id: voteData.id,
              user_id: user.id,
              template_id: templateId,
              template_type: templateType,
              feedback: feedbackText,
            }, {
              onConflict: "user_id,template_id,template_type"
            });
        }
      }

      fetchTemplates();
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: "Failed to register vote.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!pendingVoteData) return;
    
    const template = unifiedTemplates.find(t => t.id === pendingVoteData.templateId && t.type === pendingVoteData.templateType);
    if (!template) return;

    await processVote(pendingVoteData.templateId, pendingVoteData.templateType, -1, template.userVote, feedback);
    setShowFeedbackDialog(false);
    setFeedback("");
    setPendingVoteData(null);
  };

  const handleClonePrompt = async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to clone templates.",
          variant: "destructive",
        });
        return;
      }

      const { data: template, error } = await supabase
        .from("prompt_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;

      navigate('/templates/new-prompt', {
        state: {
          cloneData: {
            promptName: '',
            promptDescription: template.prompt_description,
            promptOutcome: template.prompt_outcome,
            prompt: template.prompt,
            systemOutcome: template.system_outcome,
            systemPrompt: template.system_prompt,
            promptModel: template.prompt_model,
            promptTeam: template.prompt_team,
            promptTags: template.prompt_tags,
          }
        }
      });
    } catch (error) {
      console.error("Error cloning template:", error);
      toast({
        title: "Error",
        description: "Failed to clone template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCloneJob = async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to clone templates.",
          variant: "destructive",
        });
        return;
      }

      const { data: template, error } = await supabase
        .from("job_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;

      navigate('/templates/new-job', {
        state: {
          cloneData: {
            jobName: '',
            jobDescription: template.job_description,
            jobTeam: template.job_team,
            jobTags: template.job_tags,
            jobConnection: template.job_connection,
            jobPrompt: template.job_prompt,
            researchType: template.research_type,
            researchDepth: template.research_depth,
            researchExactness: template.research_exactness,
            jobOutcome: template.job_outcome,
          }
        }
      });
    } catch (error) {
      console.error("Error cloning template:", error);
      toast({
        title: "Error",
        description: "Failed to clone template. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={FileText}
        title="Research Templates"
        description="Start with pre-configured research workflows"
      />

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Template Type</DialogTitle>
            <DialogDescription>
              Select the type of template you want to create
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 pt-4">
            <Card
              className="hover:shadow-md transition-all cursor-pointer group border-2 hover:border-primary"
              onClick={() => {
                setShowTemplateDialog(false);
                navigate("/templates/new-job");
              }}
            >
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Job Template</h3>
                    <p className="text-sm text-muted-foreground">
                      Create research job workflows
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card
              className="hover:shadow-md transition-all cursor-pointer group border-2 hover:border-primary"
              onClick={() => {
                setShowTemplateDialog(false);
                navigate("/templates/new-prompt");
              }}
            >
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Prompt Template</h3>
                    <p className="text-sm text-muted-foreground">
                      Create AI prompt configurations
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Row 1: Search Bar */}
        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, description, type, tags, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                {getSortLabel()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSortField("name"); setSortDirection("asc"); }}>
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("name"); setSortDirection("desc"); }}>
                Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("created_at"); setSortDirection("asc"); }} className="justify-between">
                Created
                <ArrowUp className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("created_at"); setSortDirection("desc"); }} className="justify-between">
                Created
                <ArrowDown className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("updated_at"); setSortDirection("asc"); }} className="justify-between">
                Last Updated
                <ArrowUp className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("updated_at"); setSortDirection("desc"); }} className="justify-between">
                Last Updated
                <ArrowDown className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("score"); setSortDirection("asc"); }} className="justify-between">
                Score
                <ArrowUp className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("score"); setSortDirection("desc"); }} className="justify-between">
                Score
                <ArrowDown className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Row 2: Filter Tags */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Badge
            variant={typeFilter === "job" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleTypeFilter("job")}
          >
            Job
          </Badge>
          <Badge
            variant={typeFilter === "prompt" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleTypeFilter("prompt")}
          >
            Prompt
          </Badge>
          {allTags.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-6" />
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedFilters.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFilter(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </>
          )}
          {(selectedFilters.length > 0 || typeFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 gap-1"
            >
              <X className="h-3 w-3" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="text-center py-12">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {unifiedTemplates.length === 0 
              ? "No templates yet. Create your first one!"
              : "No templates match your search or filters."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                    {template.type === "prompt" ? (
                      <Sparkles className="h-6 w-6 text-primary" />
                    ) : (
                      <Activity className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col items-end gap-2">
                    <div className="flex flex-wrap gap-2 justify-end">
                      {template.team.slice(0, 1).map((team) => (
                        <Badge key={team} variant="default" className="whitespace-nowrap">
                          {team}
                        </Badge>
                      ))}
                      {template.tags.slice(0, 1).map((tag) => (
                        <Badge key={tag} variant="default" className="whitespace-nowrap">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <button 
                        onClick={() => handleVote(template.id, template.type, 1, template.userVote)}
                        disabled={isVoting}
                        className="flex items-center gap-1 hover:opacity-70 transition-opacity disabled:opacity-50"
                      >
                        <ThumbsUp className={`h-4 w-4 ${template.userVote === 1 ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-muted-foreground">{template.positiveScore}</span>
                      </button>
                      <span className="text-muted-foreground">·</span>
                      <button 
                        onClick={() => handleVote(template.id, template.type, -1, template.userVote)}
                        disabled={isVoting}
                        className="flex items-center gap-1 hover:opacity-70 transition-opacity disabled:opacity-50"
                      >
                        <ThumbsDown className={`h-4 w-4 ${template.userVote === -1 ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-muted-foreground">{template.negativeScore}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex-1">
                  <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </div>

                <TooltipProvider>
                  <div className="flex gap-1.5 mt-auto">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            navigate(
                              template.type === "prompt"
                                ? `/templates/prompt/${template.id}/view`
                                : `/templates/job/${template.id}/view`
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View</TooltipContent>
                    </Tooltip>

                    {currentUserId === template.user_id ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() =>
                              navigate(
                                template.type === "prompt"
                                  ? `/templates/prompt/${template.id}/edit`
                                  : `/templates/job/${template.id}/edit`
                              )
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              if (template.type === "prompt") {
                                handleClonePrompt(template.id);
                              } else {
                                handleCloneJob(template.id);
                              }
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clone</TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            navigate(
                              template.type === "prompt"
                                ? `/active-jobs?promptId=${template.id}`
                                : `/active-jobs?jobTemplateId=${template.id}`
                            )
                          }
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Use</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDeleteClick(template.id, template.type, template.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help us improve</DialogTitle>
            <DialogDescription>
              Please let us know why you're voting this template down. Your feedback helps others.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What could be improved?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowFeedbackDialog(false);
              setFeedback("");
              setPendingVoteData(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleFeedbackSubmit} disabled={!feedback.trim()}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
