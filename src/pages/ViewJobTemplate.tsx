import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Pencil, Play, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const ViewJobTemplate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [positiveScore, setPositiveScore] = useState(0);
  const [negativeScore, setNegativeScore] = useState(0);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Array<{ feedback: string; created_at: string; user_email: string; user_name: string | null }>>([]);
  const [isVoting, setIsVoting] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [pendingVoteData, setPendingVoteData] = useState<{ vote: number } | null>(null);

  const fetchTemplate = async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [templateResult, votesResult, userVoteResult, feedbackResult] = await Promise.all([
        supabase.from("job_templates").select("*").eq("id", id).single(),
        supabase.from("template_votes").select("vote").eq("template_id", id).eq("template_type", "job"),
        user ? supabase.from("template_votes").select("vote").eq("template_id", id).eq("template_type", "job").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
        supabase
          .from("vote_feedback")
          .select(`
            feedback,
            created_at,
            profiles:user_id (
              email,
              full_name
            )
          `)
          .eq("template_id", id)
          .eq("template_type", "job")
          .order("created_at", { ascending: false }),
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
        const formattedFeedback = feedbackResult.data.map((item: any) => ({
          feedback: item.feedback,
          created_at: item.created_at,
          user_email: item.profiles?.email || 'Unknown',
          user_name: item.profiles?.full_name || null,
        }));
        setFeedback(formattedFeedback);
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

  const handleVote = async (vote: number, currentUserVote: number | null) => {
    if (isVoting) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to vote.",
        variant: "destructive",
      });
      return;
    }

    if (vote === -1) {
      setPendingVoteData({ vote });
      setShowFeedbackDialog(true);
      return;
    }

    await submitVote(vote, currentUserVote, null);
  };

  const submitVote = async (vote: number, currentUserVote: number | null, feedbackText: string | null) => {
    setIsVoting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (currentUserVote === vote) {
        const { error: deleteError } = await supabase
          .from("template_votes")
          .delete()
          .eq("template_id", id)
          .eq("template_type", "job")
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;
      } else {
        const { data: existingVote } = await supabase
          .from("template_votes")
          .select("id")
          .eq("template_id", id)
          .eq("template_type", "job")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingVote) {
          const { error: updateError } = await supabase
            .from("template_votes")
            .update({ vote })
            .eq("id", existingVote.id);

          if (updateError) throw updateError;
        } else {
          const { data: voteData, error: insertError } = await supabase
            .from("template_votes")
            .insert({
              template_id: id,
              template_type: "job",
              user_id: user.id,
              vote,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          if (vote === -1 && feedbackText && voteData) {
            await supabase.from("vote_feedback").insert({
              vote_id: voteData.id,
              template_id: id,
              template_type: "job",
              user_id: user.id,
              feedback: feedbackText,
            });
          }
        }
      }

      await fetchTemplate();
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: "Failed to submit vote.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!pendingVoteData) return;
    await submitVote(pendingVoteData.vote, userVote, feedbackText);
    setShowFeedbackDialog(false);
    setFeedbackText("");
    setPendingVoteData(null);
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
        icon={Activity}
        title={template.job_name}
        description="View job template details"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={() => navigate("/templates")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/templates/job/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Template
            </Button>
            <Button onClick={() => navigate(`/active-jobs?jobTemplateId=${id}`)}>
              <Play className="h-4 w-4 mr-2" />
              Use Template
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">Basic Information</h2>
              <div className="flex items-center gap-2 text-sm">
                <button 
                  onClick={() => handleVote(1, userVote)}
                  disabled={isVoting}
                  className="flex items-center gap-1 hover:opacity-70 transition-opacity disabled:opacity-50"
                >
                  <ThumbsUp className={`h-4 w-4 ${userVote === 1 ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-muted-foreground">{positiveScore}</span>
                </button>
                <span className="text-muted-foreground">·</span>
                <button 
                  onClick={() => handleVote(-1, userVote)}
                  disabled={isVoting}
                  className="flex items-center gap-1 hover:opacity-70 transition-opacity disabled:opacity-50"
                >
                  <ThumbsDown className={`h-4 w-4 ${userVote === -1 ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-muted-foreground">{negativeScore}</span>
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Template Type</label>
                <div className="mt-2">
                  <Badge variant="default" className="bg-purple-600 text-white hover:bg-purple-700">
                    Job
                  </Badge>
                </div>
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Job Outcome Details</label>
                <p className="mt-1">{template.job_outcome}</p>
              </div>
            </div>
          </Card>

          {feedback.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">User Feedback</h2>
              <div className="space-y-3">
                {feedback.map((item, index) => (
                  <div key={index} className="p-3 bg-muted rounded-md">
                    <p className="text-sm">{item.feedback}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-muted-foreground">
                        {item.user_name || item.user_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help Us Improve</DialogTitle>
            <DialogDescription>
              We'd love to hear your feedback. What could make this template better?
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Your feedback..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFeedbackDialog(false);
                setFeedbackText("");
                setPendingVoteData(null);
              }}
            >
              Skip
            </Button>
            <Button onClick={handleFeedbackSubmit} disabled={!feedbackText.trim()}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewJobTemplate;
