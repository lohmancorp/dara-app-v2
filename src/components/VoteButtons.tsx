import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type VoteButtonsProps = {
  templateId: string;
  templateType: "prompt" | "job";
  positiveScore: number;
  negativeScore: number;
  userVote: number | null;
  onVoteChange: () => void;
  size?: "sm" | "default" | "lg";
  showScore?: boolean;
};

export const VoteButtons = ({
  templateId,
  templateType,
  positiveScore,
  negativeScore,
  userVote,
  onVoteChange,
  size = "default",
  showScore = true,
}: VoteButtonsProps) => {
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pendingVote, setPendingVote] = useState<-1 | null>(null);

  const handleVote = async (voteValue: 1 | -1) => {
    // If voting negative, show feedback dialog
    if (voteValue === -1 && userVote !== -1) {
      setPendingVote(-1);
      setShowFeedbackDialog(true);
      return;
    }
    
    await processVote(voteValue);
  };

  const processVote = async (voteValue: 1 | -1, feedbackText?: string) => {
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
      if (userVote === voteValue) {
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

      onVoteChange();
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
    if (pendingVote === null) return;
    
    await processVote(pendingVote, feedback);
    setShowFeedbackDialog(false);
    setFeedback("");
    setPendingVote(null);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size={size}
          variant={userVote === 1 ? "default" : "outline"}
          onClick={() => handleVote(1)}
          disabled={isVoting}
          className="gap-1"
        >
          <ThumbsUp className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
          {showScore && <span className="text-sm">{positiveScore}</span>}
        </Button>
        <Button
          size={size}
          variant={userVote === -1 ? "default" : "outline"}
          onClick={() => handleVote(-1)}
          disabled={isVoting}
          className="gap-1"
        >
          <ThumbsDown className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
          {showScore && <span className="text-sm">{negativeScore}</span>}
        </Button>
      </div>

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
              setPendingVote(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleFeedbackSubmit} disabled={!feedback.trim()}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
