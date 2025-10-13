import { FileText, Briefcase, Eye, Pencil, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useFloatingAction } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        <Tabs defaultValue="prompt" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="prompt">Prompt Templates</TabsTrigger>
            <TabsTrigger value="job">Job Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt">
            {isLoading ? (
              <div className="text-center py-12">Loading templates...</div>
            ) : promptTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No prompt templates yet. Create your first one!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {promptTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary">
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <FileText className="h-7 w-7 text-primary" />
                        </div>
                        <div className="flex gap-1">
                          {template.prompt_tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="default" className="bg-primary text-primary-foreground text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
                          {template.prompt_name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4rem]">
                          {template.prompt_description}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/templates/prompt/${template.id}/view`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/templates/prompt/${template.id}/edit`)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/active-jobs?promptId=${template.id}`)}>
                          <Play className="h-4 w-4 mr-1" />
                          Use
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteClick(template.id, "prompt", template.prompt_name)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="job">
            {isLoading ? (
              <div className="text-center py-12">Loading templates...</div>
            ) : jobTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No job templates yet. Create your first one!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {jobTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary">
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Briefcase className="h-7 w-7 text-primary" />
                        </div>
                        <div className="flex gap-1">
                          {template.job_tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="default" className="bg-primary text-primary-foreground text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
                          {template.job_name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4rem]">
                          {template.job_description}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/templates/job/${template.id}/view`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/templates/job/${template.id}/edit`)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/active-jobs?jobTemplateId=${template.id}`)}>
                          <Play className="h-4 w-4 mr-1" />
                          Use
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteClick(template.id, "job", template.job_name)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
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
