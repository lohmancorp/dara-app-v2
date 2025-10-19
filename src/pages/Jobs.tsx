import { useState, useEffect, useRef } from "react";
import { Activity, Clock, CheckCircle, AlertCircle, Search, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Job {
  id: string;
  query: string;
  status: string;
  progress: number;
  progress_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  total_tickets: number | null;
  error: string | null;
}

const Jobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    fetchJobs();

    // Set up real-time subscription
    const channel = supabase
      .channel('chat_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_jobs',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [user]);

  // Poll active jobs for progress updates
  useEffect(() => {
    if (activeJobs.length === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start polling for active jobs
    const pollActiveJobs = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('chat_jobs')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['pending', 'processing', 'running']);

        if (error) throw error;

        if (data) {
          setActiveJobs(data);
          
          // If all jobs are done, refetch to update completed list
          if (data.length === 0) {
            fetchJobs();
          }
        }
      } catch (error) {
        console.error('Error polling jobs:', error);
      }
    };

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(pollActiveJobs, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [activeJobs.length, user]);

  const fetchJobs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const active = data?.filter(job => 
        job.status === 'pending' || job.status === 'processing' || job.status === 'running'
      ) || [];
      
      const completed = data?.filter(job => 
        job.status === 'completed' || job.status === 'failed'
      ) || [];

      setActiveJobs(active);
      setCompletedJobs(completed);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
      case "processing":
      case "pending":
        return <Activity className="h-4 w-4 animate-pulse" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "failed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
      case "processing":
      case "pending":
        return "default";
      case "completed":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleOpenChat = (job: Job) => {
    // Navigate to chat with the job context
    navigate('/chat', { state: { jobId: job.id, jobQuery: job.query } });
  };

  const filteredCompletedJobs = completedJobs.filter(job =>
    job.query.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderJob = (job: Job) => (
    <Card key={job.id} className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary group cursor-pointer">
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold text-base sm:text-lg text-foreground">{job.query}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {job.created_at && formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </p>
            {job.total_tickets && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                {job.total_tickets} tickets processed
              </p>
            )}
          </div>
          <Badge 
            variant={getStatusColor(job.status) as any}
            className="flex items-center gap-1.5 self-start text-xs"
          >
            {getStatusIcon(job.status)}
            <span className="capitalize">{job.status}</span>
          </Badge>
        </div>

        {(job.status === 'running' || job.status === 'processing' || job.status === 'pending') && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">
                {job.progress_message || 'Processing...'}
              </span>
              <span className="font-semibold text-foreground">{job.progress || 0}%</span>
            </div>
            <Progress value={job.progress || 0} className="h-2" />
          </div>
        )}

        {job.error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {job.error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="w-full sm:w-auto"
            onClick={() => handleOpenChat(job)}
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Open in Chat
          </Button>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          icon={Activity}
          title="Jobs"
          description="Track your research jobs"
        />
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center text-muted-foreground">Loading jobs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Activity}
        title="Jobs"
        description="Track your research jobs"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-8">
        {/* Active Jobs Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Active Jobs
          </h2>
          {activeJobs.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">No active jobs</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeJobs.map(renderJob)}
            </div>
          )}
        </div>

        {/* Completed Jobs Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Completed Jobs
            </h2>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search completed jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
          </div>
          {filteredCompletedJobs.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                {searchQuery ? 'No jobs found matching your search' : 'No completed jobs'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCompletedJobs.map(renderJob)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
