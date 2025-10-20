import { useState, useEffect, useRef, useMemo } from "react";
import { Activity, Clock, CheckCircle, AlertCircle, Search, PlayCircle, XCircle, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  chat_session_id: string | null;
  job_sequence: number | null;
}

type SortField = "query" | "created_at" | "completed_at";
type SortDirection = "asc" | "desc";

const Jobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("completed_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
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

        if (error) {
          console.error('Error polling jobs:', error);
          throw error;
        }

        if (data) {
          // Only update if there are actual changes
          const hasChanges = data.some((newJob, idx) => {
            const oldJob = activeJobs[idx];
            return !oldJob || 
                   oldJob.progress !== newJob.progress || 
                   oldJob.status !== newJob.status ||
                   oldJob.progress_message !== newJob.progress_message;
          });

          if (hasChanges || data.length !== activeJobs.length) {
            setActiveJobs(data);
          }
          
          // If all jobs are done, refetch to update completed list
          if (data.length === 0 && activeJobs.length > 0) {
            fetchJobs();
          }
        }
      } catch (error) {
        console.error('Error polling jobs:', error);
      }
    };

    // Initial poll
    pollActiveJobs();

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
      console.log('Fetching all jobs for user:', user.id);
      const { data, error } = await supabase
        .from('chat_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Fetched jobs:', data?.length || 0);

      const active = data?.filter(job => 
        job.status === 'pending' || job.status === 'processing' || job.status === 'running'
      ) || [];
      
      const completed = data?.filter(job => 
        job.status === 'completed' || job.status === 'failed'
      ) || [];

      console.log('Active:', active.length, 'Completed:', completed.length);
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
    // Navigate to chat with the job context and session ID
    navigate('/chat', { 
      state: { 
        jobId: job.id, 
        jobQuery: job.query,
        sessionId: job.chat_session_id 
      } 
    });
  };

  const filteredCompletedJobs = useMemo(() => {
    let filtered = completedJobs.filter(job =>
      job.query.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case "query":
          aVal = a.query.toLowerCase();
          bVal = b.query.toLowerCase();
          break;
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "completed_at":
          aVal = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          bVal = b.completed_at ? new Date(b.completed_at).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [completedJobs, searchQuery, sortField, sortDirection]);

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(filteredCompletedJobs.length / itemsPerPage);
  
  const paginatedJobs = useMemo(() => {
    if (itemsPerPage === -1) return filteredCompletedJobs;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCompletedJobs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCompletedJobs, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, sortField, sortDirection, searchQuery]);

  const getSortLabel = () => {
    const labels = {
      query: "Query",
      created_at: "Created",
      completed_at: "Completed",
    };
    return labels[sortField];
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value === 'all' ? -1 : parseInt(value));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const renderJob = (job: Job) => {
    // Generate display name
    const jobName = job.chat_session_id && job.job_sequence 
      ? `${job.chat_session_id.substring(0, 8)}-${String(job.job_sequence).padStart(3, '0')}`
      : job.id.substring(0, 8);

    return (
    <Card key={job.id} className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary group cursor-pointer">
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold text-base sm:text-lg text-foreground">{job.query}</h3>
            <p className="text-xs text-muted-foreground font-mono">{jobName}</p>
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
            <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
              <span className="text-muted-foreground flex-1">
                {job.progress_message || 'Processing...'}
              </span>
              <span className="font-semibold text-foreground">{job.progress || 0}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  await supabase
                    .from('chat_jobs')
                    .update({ 
                      status: 'failed',
                      error: 'Stopped by user',
                      completed_at: new Date().toISOString()
                    })
                    .eq('id', job.id);
                  
                  toast.success("Job stopped");
                  fetchJobs();
                }}
                className="h-7 px-2"
              >
                <XCircle className="h-3 w-3" />
              </Button>
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
  };

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
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Completed Jobs
            </h2>
            
            {/* Search and Sort on a new line */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search completed jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-10 w-full"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      {getSortLabel()}
                      {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background z-50">
                    <DropdownMenuItem
                      onClick={() => { setSortField("query"); setSortDirection("asc"); }}
                      className={sortField === "query" && sortDirection === "asc" ? "bg-accent text-white" : ""}
                    >
                      Query (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setSortField("query"); setSortDirection("desc"); }}
                      className={sortField === "query" && sortDirection === "desc" ? "bg-accent text-white" : ""}
                    >
                      Query (Z-A)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setSortField("created_at"); setSortDirection("asc"); }}
                      className={`justify-between ${sortField === "created_at" && sortDirection === "asc" ? "bg-accent text-white" : ""}`}
                    >
                      Created
                      <ArrowUp className="h-4 w-4 ml-2" />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setSortField("created_at"); setSortDirection("desc"); }}
                      className={`justify-between ${sortField === "created_at" && sortDirection === "desc" ? "bg-accent text-white" : ""}`}
                    >
                      Created
                      <ArrowDown className="h-4 w-4 ml-2" />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setSortField("completed_at"); setSortDirection("asc"); }}
                      className={`justify-between ${sortField === "completed_at" && sortDirection === "asc" ? "bg-accent text-white" : ""}`}
                    >
                      Completed
                      <ArrowUp className="h-4 w-4 ml-2" />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setSortField("completed_at"); setSortDirection("desc"); }}
                      className={`justify-between ${sortField === "completed_at" && sortDirection === "desc" ? "bg-accent text-white" : ""}`}
                    >
                      Completed
                      <ArrowDown className="h-4 w-4 ml-2" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Rows per page */}
                <Select value={itemsPerPage === -1 ? 'all' : itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-[50px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {itemsPerPage === -1 ? filteredCompletedJobs.length : Math.min((currentPage - 1) * itemsPerPage + 1, filteredCompletedJobs.length)} to {itemsPerPage === -1 ? filteredCompletedJobs.length : Math.min(currentPage * itemsPerPage, filteredCompletedJobs.length)} of {filteredCompletedJobs.length} results
          </div>
          
          {filteredCompletedJobs.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                {searchQuery ? 'No jobs found matching your search' : 'No completed jobs'}
              </p>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedJobs.map(renderJob)}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-center items-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>
                  
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    {getPageNumbers().map((page, idx) => (
                      typeof page === 'number' ? (
                        <Button
                          key={idx}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px]"
                        >
                          {page}
                        </Button>
                      ) : (
                        <span key={idx} className="px-2 text-muted-foreground">
                          {page}
                        </span>
                      )
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
