import { Link2, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Connections = () => {
  const connections = [
    {
      id: 1,
      name: "Google Scholar",
      type: "Academic Database",
      status: "connected",
      lastSync: "2 hours ago",
    },
    {
      id: 2,
      name: "PubMed",
      type: "Medical Database",
      status: "connected",
      lastSync: "1 day ago",
    },
    {
      id: 3,
      name: "arXiv",
      type: "Preprint Server",
      status: "error",
      lastSync: "Failed",
    },
    {
      id: 4,
      name: "IEEE Xplore",
      type: "Academic Database",
      status: "disconnected",
      lastSync: "Never",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Link2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Data Connections</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Connect to research databases and sources
                </p>
              </div>
            </div>
            <Button variant="accent" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Connection</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {connections.map((connection) => (
            <Card key={connection.id} className="hover:shadow-md transition-all">
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold text-base sm:text-lg text-foreground">{connection.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {connection.type}
                    </p>
                  </div>
                  <Badge
                    variant={
                      connection.status === "connected"
                        ? "secondary"
                        : connection.status === "error"
                        ? "destructive"
                        : "outline"
                    }
                    className="flex items-center gap-1.5 self-start text-xs"
                  >
                    {connection.status === "connected" ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : connection.status === "error" ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : null}
                    <span className="capitalize">{connection.status}</span>
                  </Badge>
                </div>

                <div className="text-xs sm:text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded">
                  Last sync: {connection.lastSync}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {connection.status === "connected" && (
                    <>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        Configure
                      </Button>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        Sync Now
                      </Button>
                    </>
                  )}
                  {connection.status === "disconnected" && (
                    <Button size="sm" variant="accent" className="w-full sm:w-auto">Connect</Button>
                  )}
                  {connection.status === "error" && (
                    <Button size="sm" variant="destructive" className="w-full sm:w-auto">
                      Reconnect
                    </Button>
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

export default Connections;
