import { FileText, Briefcase, Eye, Pencil, Trash2, Play, Search, X, Sparkles, Activity, ArrowUpDown } from "lucide-react";
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
import { VoteButtons } from "@/components/VoteButtons";
import { Separator } from "@/components/ui/separator";
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
};

type JobTemplate = {
  id: string;
  job_name: string;
  job_description: string;
  job_team: string[];
  job_tags: string[];
  created_at: string;
  updated_at: string;
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

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [promptResult, jobResult, votesResult, userVotesResult] = await Promise.all([
        supabase.from("prompt_templates").select("id, prompt_name, prompt_description, prompt_team, prompt_tags, created_at, updated_at").order("created_at", { ascending: false }),
        supabase.from("job_templates").select("id, job_name, job_description, job_team, job_tags, created_at, updated_at").order("created_at", { ascending: false }),
        supabase.from("template_votes").select("template_id, template_type, vote"),
        user ? supabase.from("template_votes").select("template_id, template_type, vote").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      ]);

      if (promptResult.data) setPromptTemplates(promptResult.data);
      if (jobResult.data) setJobTemplates(jobResult.data);
      if (votesResult.data) setVotes(votesResult.data);
      if (userVotesResult.data) setUserVotes(userVotesResult.data);
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
        };
      }),
    ];

    return unified;
  }, [promptTemplates, jobTemplates, votes, userVotes]);

  // Filter templates based on search and type
  const searchFilteredTemplates = useMemo(() => {
    return unifiedTemplates.filter(template => {
      // Search filter
      const matchesSearch = !searchQuery || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

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
                navigate("/templates/new-prompt");
              }}
            >
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-6 w-6 text-primary" />
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
                    <Briefcase className="h-6 w-6 text-primary" />
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
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Row 1: Search Bar */}
        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, description, type, or tags..."
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
              <DropdownMenuItem onClick={() => { setSortField("created_at"); setSortDirection("desc"); }}>
                Newest Created
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("created_at"); setSortDirection("asc"); }}>
                Oldest Created
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("updated_at"); setSortDirection("desc"); }}>
                Recently Updated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("updated_at"); setSortDirection("asc"); }}>
                Least Recently Updated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("score"); setSortDirection("desc"); }}>
                Highest Score
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("score"); setSortDirection("asc"); }}>
                Lowest Score
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
              <Card key={template.id} className="p-4 hover:shadow-lg transition-shadow flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  {template.type === "prompt" ? (
                    <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <Activity className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{template.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {template.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {template.team.map((team) => (
                    <Badge key={team} variant="default" className="text-xs">
                      {team}
                    </Badge>
                  ))}
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="default" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    👍 {template.positiveScore}
                  </span>
                  <span className="mx-1">•</span>
                  <span className="flex items-center gap-1">
                    👎 {template.negativeScore}
                  </span>
                </div>

                <TooltipProvider>
                  <div className="flex gap-1 mt-auto">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            navigate(
                              template.type === "prompt"
                                ? `/templates/prompt/${template.id}`
                                : `/templates/job/${template.id}`
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
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

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
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
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDeleteClick(template.id, template.type, template.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>

                    <VoteButtons
                      templateId={template.id}
                      templateType={template.type}
                      positiveScore={template.positiveScore}
                      negativeScore={template.negativeScore}
                      userVote={template.userVote}
                      onVoteChange={fetchTemplates}
                      size="sm"
                      showScore={false}
                    />
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
    </div>
  );
};

export default Templates;
