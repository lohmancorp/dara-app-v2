import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type VoteButtonsProps = {
  templateId: string;
  templateType: "prompt" | "job";
  score: number;
  userVote: number | null;
  onVoteChange: () => void;
  size?: "sm" | "default";
  showScore?: boolean;
};

export const VoteButtons = ({
  templateId,
  templateType,
  score,
  userVote,
  onVoteChange,
  size = "default",
  showScore = true,
}: VoteButtonsProps) => {
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteValue: 1 | -1) => {
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
      } else {
        // Otherwise, upsert the vote
        const { error } = await supabase
          .from("template_votes")
          .upsert({
            user_id: user.id,
            template_id: templateId,
            template_type: templateType,
            vote: voteValue,
          }, {
            onConflict: "user_id,template_id,template_type"
          });

        if (error) throw error;
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

  return (
    <div className="flex items-center gap-2">
      <Button
        size={size}
        variant={userVote === 1 ? "default" : "outline"}
        onClick={() => handleVote(1)}
        disabled={isVoting}
        className="gap-1"
      >
        <ThumbsUp className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      </Button>
      {showScore && (
        <span className="text-sm font-medium min-w-[2rem] text-center">
          {score}
        </span>
      )}
      <Button
        size={size}
        variant={userVote === -1 ? "default" : "outline"}
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        className="gap-1"
      >
        <ThumbsDown className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      </Button>
    </div>
  );
};
