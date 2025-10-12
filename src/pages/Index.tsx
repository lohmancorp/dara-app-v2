import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, FileText, Activity, Library } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your Digital Automated Research Assistant
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
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
              <Button asChild className="w-full" variant="outline">
                <Link to="/templates">Browse Templates</Link>
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
              <Button asChild className="w-full" variant="outline">
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
              <Button asChild className="w-full" variant="outline">
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
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      Research Report {i}
                    </h3>
                    <p className="text-sm text-muted-foreground">
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
