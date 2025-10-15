import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { VoteButtons } from "@/components/VoteButtons";

const ViewPromptTemplate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [userVote, setUserVote] = useState<number | null>(null);

  const fetchTemplate = async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [templateResult, votesResult, userVoteResult] = await Promise.all([
        supabase.from("prompt_templates").select("*").eq("id", id).single(),
        supabase.from("template_votes").select("vote").eq("template_id", id).eq("template_type", "prompt"),
        user ? supabase.from("template_votes").select("vote").eq("template_id", id).eq("template_type", "prompt").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (templateResult.error) throw templateResult.error;
      setTemplate(templateResult.data);
      
      if (votesResult.data) {
        const totalScore = votesResult.data.reduce((sum, v) => sum + v.vote, 0);
        setScore(totalScore);
      }
      
      if (userVoteResult.data) {
        setUserVote(userVoteResult.data.vote);
      } else {
        setUserVote(null);
      }
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

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Sparkles}
        title={template.prompt_name}
        description="View prompt template details"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Button variant="outline" onClick={() => navigate("/templates")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">Basic Information</h2>
              <VoteButtons
                templateId={id!}
                templateType="prompt"
                score={score}
                userVote={userVote}
                onVoteChange={fetchTemplate}
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prompt Name</label>
                <p className="mt-1">{template.prompt_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1">{template.prompt_description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Model</label>
                <p className="mt-1">{template.prompt_model}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Organization</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Teams</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {template.prompt_team?.map((team: string) => (
                    <Badge key={team} variant="default" className="bg-primary text-primary-foreground">
                      {team}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {template.prompt_tags?.map((tag: string) => (
                    <Badge key={tag} variant="default" className="bg-primary text-primary-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Prompt Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prompt Outcome</label>
                <div className="mt-1 p-3 bg-muted rounded-md" dangerouslySetInnerHTML={{ __html: template.prompt_outcome }} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prompt</label>
                <pre className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap font-mono text-sm">
                  {template.prompt}
                </pre>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">System Prompt Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">System Outcome</label>
                <div className="mt-1 p-3 bg-muted rounded-md" dangerouslySetInnerHTML={{ __html: template.system_outcome }} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">System Prompt</label>
                <pre className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap font-mono text-sm">
                  {template.system_prompt}
                </pre>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Metrics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Tokens</label>
                <p className="mt-1 text-2xl font-bold">{template.total_tokens || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estimated Cost</label>
                <p className="mt-1 text-2xl font-bold">${(template.total_prompt_cost || 0).toFixed(4)}</p>
              </div>
            </div>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => navigate(`/templates/prompt/${id}/edit`)}>
              Edit Template
            </Button>
            <Button onClick={() => navigate(`/active-jobs?promptId=${id}`)}>
              Use Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPromptTemplate;
