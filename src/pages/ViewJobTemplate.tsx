import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Briefcase, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VoteButtons } from "@/components/VoteButtons";

const ViewJobTemplate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [positiveScore, setPositiveScore] = useState(0);
  const [negativeScore, setNegativeScore] = useState(0);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Array<{ feedback: string; created_at: string }>>([]);

  const fetchTemplate = async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [templateResult, votesResult, userVoteResult, feedbackResult] = await Promise.all([
        supabase.from("job_templates").select("*").eq("id", id).single(),
        supabase.from("template_votes").select("vote").eq("template_id", id).eq("template_type", "job"),
        user ? supabase.from("template_votes").select("vote").eq("template_id", id).eq("template_type", "job").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("vote_feedback").select("feedback, created_at").eq("template_id", id).eq("template_type", "job").order("created_at", { ascending: false }),
      ]);

      if (templateResult.error) throw templateResult.error;
      setTemplate(templateResult.data);
      
      if (votesResult.data) {
        const positive = votesResult.data.filter(v => v.vote === 1).length;
        const negative = votesResult.data.filter(v => v.vote === -1).length;
        setPositiveScore(positive);
        setNegativeScore(negative);
      }
      
      if (userVoteResult.data) {
        setUserVote(userVoteResult.data.vote);
      } else {
        setUserVote(null);
      }

      if (feedbackResult.data) {
        setFeedback(feedbackResult.data);
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
        icon={Briefcase}
        title={template.job_name}
        description="View job template details"
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
                templateType="job"
                positiveScore={positiveScore}
                negativeScore={negativeScore}
                userVote={userVote}
                onVoteChange={fetchTemplate}
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Job Name</label>
                <p className="mt-1">{template.job_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1">{template.job_description}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Organization</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Teams</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {template.job_team?.map((team: string) => (
                    <Badge key={team} variant="default" className="bg-primary text-primary-foreground">
                      {team}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {template.job_tags?.map((tag: string) => (
                    <Badge key={tag} variant="default" className="bg-primary text-primary-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Job Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Connection</label>
                <p className="mt-1">{template.job_connection}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prompt Template</label>
                <p className="mt-1">{template.job_prompt}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Research Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Research Type</label>
                <p className="mt-1">{template.research_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Research Depth</label>
                <p className="mt-1">{template.research_depth}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Research Exactness</label>
                <p className="mt-1">{template.research_exactness}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Additional Settings</h2>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job Outcome Details</label>
              <p className="mt-1 text-sm">{template.job_outcome}</p>
            </div>
          </Card>

          {feedback.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">User Feedback</h2>
              <div className="space-y-3">
                {feedback.map((item, index) => (
                  <div key={index} className="p-3 bg-muted rounded-md">
                    <p className="text-sm">{item.feedback}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => navigate(`/templates/job/${id}/edit`)}>
              Edit Template
            </Button>
            <Button onClick={() => navigate(`/active-jobs?jobTemplateId=${id}`)}>
              Use Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewJobTemplate;
