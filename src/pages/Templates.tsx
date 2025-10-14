import { FileText, Briefcase, Eye, Pencil, Trash2, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useFloatingAction } from "@/components/AppLayout";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
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

type PromptTemplate = {
  id: string;
  prompt_name: string;
  prompt_description: string;
  prompt_team: string[];
  prompt_tags: string[];
  created_at: string;
};

type JobTemplate = {
  id: string;
  job_name: string;
  job_description: string;
  job_team: string[];
  job_tags: string[];
  created_at: string;
};

type UnifiedTemplate = {
  id: string;
  name: string;
  description: string;
  team: string[];
  tags: string[];
  type: "prompt" | "job";
  created_at: string;
};

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

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const [promptResult, jobResult] = await Promise.all([
        supabase.from("prompt_templates").select("id, prompt_name, prompt_description, prompt_team, prompt_tags, created_at").order("created_at", { ascending: false }),
        supabase.from("job_templates").select("id, job_name, job_description, job_team, job_tags, created_at").order("created_at", { ascending: false }),
      ]);

      if (promptResult.data) setPromptTemplates(promptResult.data);
      if (jobResult.data) setJobTemplates(jobResult.data);
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

  // Unify templates and get all unique tags
  const { unifiedTemplates, allTags } = useMemo(() => {
    const unified: UnifiedTemplate[] = [
      ...promptTemplates.map(t => ({
        id: t.id,
        name: t.prompt_name,
        description: t.prompt_description,
        team: t.prompt_team,
        tags: t.prompt_tags,
        type: "prompt" as const,
        created_at: t.created_at,
      })),
      ...jobTemplates.map(t => ({
        id: t.id,
        name: t.job_name,
        description: t.job_description,
        team: t.job_team,
        tags: t.job_tags,
        type: "job" as const,
        created_at: t.created_at,
      })),
    ];

    const tagCounts = new Map<string, number>();
    unified.forEach(template => {
      template.tags?.forEach(tag => {
        if (tag !== "Job" && tag !== "Prompt") {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      });
    });

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    return { unifiedTemplates: unified, allTags: topTags };
  }, [promptTemplates, jobTemplates]);

  // Filter templates based on search and filters
  const filteredTemplates = useMemo(() => {
    return unifiedTemplates.filter(template => {
      // Search filter
      const matchesSearch = !searchQuery || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Tag filters
      const matchesFilters = selectedFilters.length === 0 || 
        selectedFilters.every(filter => {
          if (filter === "Job" || filter === "Prompt") {
            return template.type === filter.toLowerCase();
          }
          return template.tags?.includes(filter);
        });

      return matchesSearch && matchesFilters;
    });
  }, [unifiedTemplates, searchQuery, selectedFilters]);

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
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
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, description, type, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Row 2: Filter Tags */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge
            variant={selectedFilters.includes("Job") ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleFilter("Job")}
          >
            Job
          </Badge>
          <Badge
            variant={selectedFilters.includes("Prompt") ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleFilter("Prompt")}
          >
            Prompt
          </Badge>
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
              <Card key={template.id} className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary">
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-primary/10">
                      {template.type === "prompt" ? (
                        <FileText className="h-7 w-7 text-primary" />
                      ) : (
                        <Briefcase className="h-7 w-7 text-primary" />
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {template.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="default" className="bg-primary text-primary-foreground text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
                      {template.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4rem]">
                      {template.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => navigate(`/templates/${template.type}/${template.id}/view`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => navigate(`/templates/${template.type}/${template.id}/edit`)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => navigate(
                        template.type === "prompt" 
                          ? `/active-jobs?promptId=${template.id}` 
                          : `/active-jobs?jobTemplateId=${template.id}`
                      )}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Use
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteClick(template.id, template.type, template.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
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
