import { FileText, Briefcase } from "lucide-react";
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

const Templates = () => {
  const { setActionButton } = useFloatingAction();
  const navigate = useNavigate();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  useEffect(() => {
    setActionButton(
      <FloatingActionButton 
        label="New Template" 
        onClick={() => setShowTemplateDialog(true)} 
      />
    );
    return () => setActionButton(null);
  }, [setActionButton]);
  const templates = [
    {
      id: 1,
      name: "Literature Review",
      description: "Comprehensive analysis of existing research",
      category: "Analysis",
    },
    {
      id: 2,
      name: "Data Synthesis",
      description: "Combine insights from multiple sources",
      category: "Synthesis",
    },
    {
      id: 3,
      name: "Gap Analysis",
      description: "Identify research gaps and opportunities",
      category: "Analysis",
    },
    {
      id: 4,
      name: "Citation Report",
      description: "Track and analyze citations",
      category: "Report",
    },
    {
      id: 5,
      name: "Methodology Comparison",
      description: "Compare research methodologies",
      category: "Comparison",
    },
    {
      id: 6,
      name: "Trend Analysis",
      description: "Identify emerging research trends",
      category: "Analysis",
    },
  ];

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-7 w-7 text-primary" />
                  </div>
                  <Badge variant="secondary" className="bg-muted">
                    {template.category}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">
                    {template.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4rem]">{template.description}</p>
                </div>
                <Button className="w-full" variant="outline">
                  Use Template
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Templates;
