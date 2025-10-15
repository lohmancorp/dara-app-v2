import { Link2, CheckCircle, AlertCircle, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useFloatingAction } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConnectionConfigForm } from "@/components/ConnectionConfigForm";
import freshserviceIcon from "@/assets/connection-icons/freshservice.svg";
import jiraIcon from "@/assets/connection-icons/jira.png";
import confluenceIcon from "@/assets/connection-icons/confluence.png";
import geminiIcon from "@/assets/connection-icons/gemini.png";
import openaiIcon from "@/assets/connection-icons/openai.png";
import googleAlertsIcon from "@/assets/connection-icons/google-alerts.ico";

type ConnectionType = 'freshservice' | 'jira' | 'confluence' | 'gemini' | 'openai' | 'google_alerts';
type AuthType = 'oauth' | 'token' | 'basic_auth';

interface Connection {
  id: string;
  connection_type: ConnectionType;
  name: string;
  endpoint: string;
  auth_type: AuthType;
  auth_config: any;
  call_delay_ms: number;
  retry_delay_sec: number;
  max_retries: number;
  connection_config: any;
  is_active: boolean;
}

const CONNECTION_ICONS: Record<ConnectionType, string> = {
  freshservice: freshserviceIcon,
  jira: jiraIcon,
  confluence: confluenceIcon,
  gemini: geminiIcon,
  openai: openaiIcon,
  google_alerts: googleAlertsIcon,
};

const AVAILABLE_CONNECTIONS: { type: ConnectionType; name: string; description: string; defaultEndpoint?: string; defaultAuthType: AuthType }[] = [
  { type: 'freshservice', name: 'FreshService', description: 'IT Service Management', defaultAuthType: 'token' },
  { type: 'jira', name: 'Jira', description: 'Project Management', defaultAuthType: 'basic_auth' },
  { type: 'confluence', name: 'Confluence', description: 'Documentation Platform', defaultAuthType: 'basic_auth' },
  { type: 'gemini', name: 'Gemini', description: 'Google AI Model', defaultEndpoint: 'https://generativelanguage.googleapis.com', defaultAuthType: 'token' },
  { type: 'openai', name: 'OpenAI', description: 'OpenAI API', defaultEndpoint: 'https://api.openai.com', defaultAuthType: 'token' },
  { type: 'google_alerts', name: 'Google Alerts', description: 'Google Alerts API', defaultEndpoint: 'https://www.google.com/alerts', defaultAuthType: 'oauth' },
];

const Connections = () => {
  const { setActionButton } = useFloatingAction();
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  useEffect(() => {
    setActionButton(
      <FloatingActionButton 
        label="Add Connection" 
        onClick={() => setIsDialogOpen(true)}
      />
    );
    return () => setActionButton(null);
  }, [setActionButton]);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections((data || []) as Connection[]);
    } catch (error: any) {
      toast({
        title: "Error fetching connections",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigureConnection = (connection: Connection) => {
    setEditingConnection(connection);
    setSelectedConnection(connection.connection_type);
    setIsDialogOpen(true);
  };

  const getConnectionInfo = (type: ConnectionType) => {
    return AVAILABLE_CONNECTIONS.find(c => c.type === type);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          icon={Link2}
          title="Data Connections"
          description="Connect to research databases and sources"
        />
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center">Loading connections...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Link2}
        title="Data Connections"
        description="Connect to research databases and sources"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {connections.length === 0 ? (
          <Card className="p-12 text-center">
            <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Connections Yet</h3>
            <p className="text-muted-foreground mb-6">
              Get started by adding your first connection to external services
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {connections.map((connection) => {
              const info = getConnectionInfo(connection.connection_type);
              return (
                <Card 
                  key={connection.id} 
                  className="hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-primary"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Link2 className="h-7 w-7 text-primary" />
                      </div>
                      <Badge
                        variant={connection.is_active ? "secondary" : "outline"}
                        className="flex items-center gap-1.5"
                      >
                        {connection.is_active ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        <span>{connection.is_active ? "Active" : "Inactive"}</span>
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                        {connection.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {info?.description || connection.connection_type}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Auth: {connection.auth_type}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleConfigureConnection(connection)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConnection 
                ? `Configure ${editingConnection.name}` 
                : selectedConnection
                  ? `Add New ${getConnectionInfo(selectedConnection)?.name} Connection`
                  : 'Add New Connection'
              }
            </DialogTitle>
          </DialogHeader>
          {!selectedConnection && !editingConnection ? (
            <div className="grid grid-cols-2 gap-4 py-4">
              {AVAILABLE_CONNECTIONS.map((conn) => (
                <Card 
                  key={conn.type}
                  className="p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedConnection(conn.type)}
                >
                  <div className="flex items-start gap-4">
                    <img 
                      src={CONNECTION_ICONS[conn.type]} 
                      alt={`${conn.name} icon`}
                      className="w-14 h-14 object-contain rounded-lg p-2 bg-muted flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold mb-1">{conn.name}</h4>
                      <p className="text-sm text-muted-foreground">{conn.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <ConnectionConfigForm
              connectionType={selectedConnection || editingConnection?.connection_type}
              existingConnection={editingConnection}
              onSuccess={() => {
                setIsDialogOpen(false);
                setSelectedConnection(null);
                setEditingConnection(null);
                fetchConnections();
              }}
              onCancel={() => {
                setIsDialogOpen(false);
                setSelectedConnection(null);
                setEditingConnection(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Connections;
