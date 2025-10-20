import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, FileText, Activity, Library, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Home}
        title="Dashboard"
        description="Your Digital Automated Research Assistant"
      />
      
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary group cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg group-hover:text-primary transition-colors">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                Ask Question
              </CardTitle>
              <CardDescription>
                Get instant answers to your research questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="accent">
                <Link to="/chat">Start Asking</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary group cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg group-hover:text-primary transition-colors">
                <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                Use Template
              </CardTitle>
              <CardDescription>
                Quick start with pre-built research templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="default">
                <Link to="/blueprints">Browse Blueprints</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary group cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg group-hover:text-primary transition-colors">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Library className="h-5 w-5 text-primary" />
                </div>
                My Library
              </CardTitle>
              <CardDescription>
                Access your saved research and reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="default">
                <Link to="/library">View Library</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary group cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg group-hover:text-primary transition-colors">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                Active Jobs
              </CardTitle>
              <CardDescription>
                Monitor ongoing research tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="default">
                <Link to="/active-jobs">View Jobs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">Recent Results</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card 
                key={i} 
                className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-7 w-7 text-primary" />
                    </div>
                    <Badge variant="secondary" className="bg-muted">
                      Completed
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">
                      Research Report {i}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4rem]">
                      Completed {i} day{i > 1 ? "s" : ""} ago
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
