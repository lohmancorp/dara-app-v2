import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Templates = () => {
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
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Research Templates</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Start with pre-configured research workflows
                </p>
              </div>
            </div>
            <Button variant="accent" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Create Custom Template</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
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
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
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
