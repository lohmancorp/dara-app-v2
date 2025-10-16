import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Pencil, Play, ThumbsUp, ThumbsDown, Copy } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import confluenceIcon from "@/assets/connection-icons/confluence.png";
import freshserviceIcon from "@/assets/connection-icons/freshservice.svg";
import geminiIcon from "@/assets/connection-icons/gemini.png";
import googleAlertsIcon from "@/assets/connection-icons/google-alerts.ico";
import jiraIcon from "@/assets/connection-icons/jira.png";
import openaiIcon from "@/assets/connection-icons/openai.png";

const JOB_TYPE_OPTIONS = ["Scheduled", "One-Time", "Recurring", "On-going"];

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
  const [jobChunking, setJobChunking] = useState(false);
  const [chunkSize, setChunkSize] = useState(20);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [jobDataType, setJobDataType] = useState("");
  const [connectionDetails, setConnectionDetails] = useState<{ name: string; connection_type: string } | null>(null);
  const [promptTemplateName, setPromptTemplateName] = useState<string>("");
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [userConnection, setUserConnection] = useState<{ id: string; name: string } | null>(null);

  const getConnectionIcon = (connectionType: string): string | null => {
    const iconMap: Record<string, string> = {
      confluence: confluenceIcon,
      freshservice: freshserviceIcon,
      gemini: geminiIcon,
      google_alerts: googleAlertsIcon,
      jira: jiraIcon,
      openai: openaiIcon,
    };
    
    return iconMap[connectionType.toLowerCase()] || null;
  };

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
          .select("feedback, created_at, user_id")
          .eq("template_id", id)
          .eq("template_type", "job")
          .order("created_at", { ascending: false }),
      ]);

      if (templateResult.error) throw templateResult.error;
      setTemplate(templateResult.data);
      
      // Check if current user is the author
      setIsAuthor(user?.id === templateResult.data.user_id);

      // Fetch author name
      if (templateResult.data.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", templateResult.data.user_id)
          .maybeSingle();
        
        if (profileData && profileData.full_name) {
          setAuthorName(profileData.full_name);
        }
      }

      // Fetch connection details
      if (templateResult.data.job_connection) {
        const { data: connectionData } = await supabase
          .from("connections")
          .select("name, connection_type")
          .eq("id", templateResult.data.job_connection)
          .maybeSingle();
        
        if (connectionData) {
          setConnectionDetails(connectionData);
          
          // If current user is not the author, find their connection of the same type
          if (user && user.id !== templateResult.data.user_id) {
            const { data: userConnectionData } = await supabase
              .from("connections")
              .select("id, name")
              .eq("user_id", user.id)
              .eq("connection_type", connectionData.connection_type)
              .eq("is_active", true)
              .maybeSingle();
            
            setUserConnection(userConnectionData);
          }
        }
      }

      // Fetch prompt template name
      if (templateResult.data.job_prompt) {
        const { data: promptData } = await supabase
          .from("prompt_templates")
          .select("prompt_name")
          .eq("id", templateResult.data.job_prompt)
          .single();
        
        if (promptData) {
          setPromptTemplateName(promptData.prompt_name);
        }
      }

      // Parse job_outcome to extract chunking and job type data
      const outcome = templateResult.data.job_outcome || "";
      const dataTypeMatch = outcome.match(/Data Type: ([^,]+)/);
      const chunkingMatch = outcome.match(/Chunking: (true|false)/);
      const chunkSizeMatch = outcome.match(/Chunk Size: (\d+)/);
      const jobTypesMatch = outcome.match(/Job Types: (.+)$/);

      setJobDataType(dataTypeMatch ? dataTypeMatch[1] : "");
      setJobChunking(chunkingMatch ? chunkingMatch[1] === "true" : false);
      setChunkSize(chunkSizeMatch ? parseInt(chunkSizeMatch[1]) : 20);
      setJobTypes(jobTypesMatch && jobTypesMatch[1] ? jobTypesMatch[1].split(", ").filter(t => t) : []);
      
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

      if (feedbackResult.data && feedbackResult.data.length > 0) {
        // Fetch user profiles for feedback
        const userIds = feedbackResult.data.map((item: any) => item.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const formattedFeedback = feedbackResult.data.map((item: any) => {
          const profile = profilesMap.get(item.user_id);
          return {
            feedback: item.feedback,
            created_at: item.created_at,
            user_email: profile?.email || 'Unknown',
            user_name: profile?.full_name || null,
          };
        });
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

          // Only add feedback if voting negative and feedback is provided and doesn't exist yet
          if (vote === -1 && feedbackText) {
            const { data: existingFeedback } = await supabase
              .from("vote_feedback")
              .select("id")
              .eq("user_id", user.id)
              .eq("template_id", id)
              .eq("template_type", "job")
              .maybeSingle();

            if (!existingFeedback) {
              await supabase.from("vote_feedback").insert({
                vote_id: existingVote.id,
                template_id: id,
                template_type: "job",
                user_id: user.id,
                feedback: feedbackText,
              });
            }
          }
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

  const handleClone = async () => {
    if (!template) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to clone templates.",
          variant: "destructive",
        });
        return;
      }

      // Check if user has a connection of the required type
      if (!userConnection && connectionDetails) {
        toast({
          title: "Connection Required",
          description: `You need to configure a ${connectionDetails.connection_type.replace(/_/g, ' ')} connection first.`,
          variant: "destructive",
        });
        navigate(`/connections/new?type=${connectionDetails.connection_type}`);
        return;
      }

      // Navigate to new job template page with cloned data (but empty name)
      navigate('/templates/new-job', {
        state: {
          cloneData: {
            jobName: '', // Empty name for uniqueness
            jobDescription: template.job_description,
            jobTeam: template.job_team,
            jobTags: template.job_tags,
            jobConnection: userConnection?.id || '',
            jobPrompt: template.job_prompt,
            researchType: template.research_type,
            researchDepth: template.research_depth,
            researchExactness: template.research_exactness,
            jobOutcome: template.job_outcome,
            connectionType: connectionDetails?.connection_type,
          }
        }
      });
    } catch (error) {
      console.error("Error cloning template:", error);
      toast({
        title: "Error",
        description: "Failed to clone template. Please try again.",
        variant: "destructive",
      });
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
        icon={Activity}
        title={template.job_name}
        description="View job template details"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/templates")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <div className="flex gap-2">
            {isAuthor ? (
              <Button variant="outline" onClick={() => navigate(`/templates/job/${id}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Template
              </Button>
            ) : (
              <Button variant="outline" onClick={handleClone}>
                <Copy className="h-4 w-4 mr-2" />
                Clone Template
              </Button>
            )}
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
              {authorName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Author</label>
                  <p className="mt-1">{authorName}</p>
                </div>
              )}
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
                {connectionDetails ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mt-2 p-3 border rounded-md bg-muted">
                      {getConnectionIcon(connectionDetails.connection_type) && (
                        <img 
                          src={getConnectionIcon(connectionDetails.connection_type)!} 
                          alt={connectionDetails.connection_type}
                          className="h-5 w-5 object-contain"
                        />
                      )}
                      <span className="capitalize">{connectionDetails.connection_type.replace(/_/g, ' ')}</span>
                    </div>
                    {!isAuthor && !userConnection && (
                      <div className="p-3 border border-destructive rounded-md bg-destructive/10 text-sm">
                        <p className="text-destructive font-medium mb-2">Connection Required</p>
                        <p className="text-muted-foreground mb-2">
                          You need a {connectionDetails.connection_type.replace(/_/g, ' ')} connection to use this template.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/connections/new?type=${connectionDetails.connection_type}`)}
                        >
                          Configure Connection
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 p-3 border rounded-md bg-muted text-muted-foreground">Loading connection...</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prompt Template</label>
                <div className="mt-2 p-3 border rounded-md bg-muted">
                  {promptTemplateName || "Loading prompt template..."}
                </div>
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
            <h2 className="text-lg font-semibold mb-4">Data Type</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Job Data Type</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted min-h-[42px]">
                  {jobDataType ? (
                    <Badge variant="default" className="bg-primary text-primary-foreground">
                      {jobDataType}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">No data type selected</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Chunking Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="jobChunking">Job Chunking</Label>
                <Switch
                  id="jobChunking"
                  checked={jobChunking}
                  disabled
                />
              </div>

              {jobChunking && (
                <div className="space-y-2">
                  <Label htmlFor="chunkSize">Chunk Size</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="chunkSize"
                      type="number"
                      value={chunkSize}
                      disabled
                      className="bg-muted"
                    />
                    <span className="text-sm text-muted-foreground">objects</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Job Type</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Job Type(s)</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted min-h-[42px]">
                  {jobTypes.length > 0 ? (
                    jobTypes.map((type) => (
                      <Badge key={type} variant="default" className="bg-primary text-primary-foreground">
                        {type}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No job types selected</span>
                  )}
                </div>
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
