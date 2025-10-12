import { Link2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useFloatingAction } from "@/components/AppLayout";
import { useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";

const Connections = () => {
  const { setActionButton } = useFloatingAction();

  useEffect(() => {
    setActionButton(<FloatingActionButton label="Add Connection" />);
    return () => setActionButton(null);
  }, [setActionButton]);
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
      <PageHeader 
        icon={Link2}
        title="Data Connections"
        description="Connect to research databases and sources"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {connections.map((connection) => (
            <Card 
              key={connection.id} 
              className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Link2 className="h-7 w-7 text-primary" />
                  </div>
                  <Badge
                    variant={
                      connection.status === "connected"
                        ? "secondary"
                        : connection.status === "error"
                        ? "destructive"
                        : "outline"
                    }
                    className="flex items-center gap-1.5"
                  >
                    {connection.status === "connected" ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : connection.status === "error" ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : null}
                    <span className="capitalize">{connection.status}</span>
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">
                    {connection.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4rem]">
                    {connection.type}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last sync: {connection.lastSync}
                </div>
                <div className="flex gap-2">
                  {connection.status === "connected" && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1">
                        Configure
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Sync Now
                      </Button>
                    </>
                  )}
                  {connection.status === "disconnected" && (
                    <Button size="sm" variant="accent" className="w-full">Connect</Button>
                  )}
                  {connection.status === "error" && (
                    <Button size="sm" variant="destructive" className="w-full">
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
