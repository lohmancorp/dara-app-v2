import { Activity, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";

const ActiveJobs = () => {
  const jobs = [
    {
      id: 1,
      name: "Literature Review - AI Ethics",
      status: "running",
      progress: 65,
      startedAt: "2 hours ago",
    },
    {
      id: 2,
      name: "Data Synthesis - Climate Change",
      status: "completed",
      progress: 100,
      startedAt: "Yesterday",
    },
    {
      id: 3,
      name: "Gap Analysis - Quantum Computing",
      status: "running",
      progress: 30,
      startedAt: "30 minutes ago",
    },
    {
      id: 4,
      name: "Citation Report - Machine Learning",
      status: "failed",
      progress: 45,
      startedAt: "3 hours ago",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
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
        return "default";
      case "completed":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Activity}
        title="Active Jobs"
        description="Monitor your running research tasks"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary group cursor-pointer">
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold text-base sm:text-lg text-foreground">{job.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Started {job.startedAt}
                    </p>
                  </div>
                  <Badge 
                    variant={getStatusColor(job.status) as any}
                    className="flex items-center gap-1.5 self-start text-xs"
                  >
                    {getStatusIcon(job.status)}
                    <span className="capitalize">{job.status}</span>
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold text-foreground">{job.progress}%</span>
                  </div>
                  <Progress value={job.progress} className="h-2" />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="default" size="sm" className="w-full sm:w-auto">
                    View Details
                  </Button>
                  {job.status === "running" && (
                    <Button variant="default" size="sm" className="w-full sm:w-auto">
                      Pause
                    </Button>
                  )}
                  {job.status === "completed" && (
                    <Button size="sm" variant="accent" className="w-full sm:w-auto">View Results</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveJobs;
