import { Cable, CheckCircle, AlertCircle, Plus, Settings, Wifi, Power, PowerOff, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  is_chat_default: boolean;
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
  const navigate = useNavigate();
  const { setActionButton } = useFloatingAction();
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);
  const [activeConnectionTypes, setActiveConnectionTypes] = useState<Set<ConnectionType>>(new Set());

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
      fetchActiveServices();
    }
  }, [user]);

  const fetchActiveServices = async () => {
    try {
      const { data, error } = await supabase
        .from('mcp_services')
        .select('service_type, is_active')
        .eq('is_active', true);

      if (error) throw error;

      const activeTypes = new Set<ConnectionType>(
        (data || []).map((service: any) => service.service_type as ConnectionType)
      );
      setActiveConnectionTypes(activeTypes);
    } catch (error: any) {
      console.error("Error fetching active services:", error);
    }
  };

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

  const handleConfigureConnection = (connectionId: string) => {
    navigate(`/connections/edit/${connectionId}`);
  };

  const getConnectionInfo = (type: ConnectionType) => {
    return AVAILABLE_CONNECTIONS.find(c => c.type === type);
  };

  const handleTestConnection = async (connection: Connection) => {
    setTestingConnectionId(connection.id);
    toast({
      title: "Testing connection",
      description: "Connecting to the service...",
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('test-connection', {
        body: { connectionId: connection.id }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connection successful",
          description: "Successfully connected to the service",
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.error || "Failed to connect to the service",
          variant: "destructive",
        });
      }

      // Refresh connections to get updated status
      await fetchConnections();
    } catch (error: any) {
      toast({
        title: "Error testing connection",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingConnectionId(null);
    }
  };

  const handleToggleActive = async (connection: Connection) => {
    const newActiveState = !connection.is_active;
    
    // If reactivating, test the connection first
    if (newActiveState) {
      setTestingConnectionId(connection.id);
      toast({
        title: "Testing connection",
        description: "Verifying connection before activation...",
      });
      
      try {
        const { data, error } = await supabase.functions.invoke('test-connection', {
          body: { connectionId: connection.id }
        });

        if (error) throw error;

        if (data.success) {
          toast({
            title: "Connection activated",
            description: "Connection is now active and working",
          });
          await fetchConnections();
        } else {
          toast({
            title: "Activation failed",
            description: data.error || "Connection test failed. Please check your configuration.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        toast({
          title: "Error activating connection",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setTestingConnectionId(null);
      }
    } else {
      // Deactivating - just update the database
      try {
        const { error } = await supabase
          .from('connections')
          .update({ is_active: false })
          .eq('id', connection.id);

        if (error) throw error;

        toast({
          title: "Connection deactivated",
          description: "Connection has been disabled",
        });
        await fetchConnections();
      } catch (error: any) {
        toast({
          title: "Error deactivating connection",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          icon={Cable}
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
        icon={Cable}
        title="Data Connections"
        description="Connect to research databases and sources"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {connections.length === 0 ? (
          <Card className="p-12 text-center">
            <Cable className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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
                      <div className="p-px rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <img 
                          src={CONNECTION_ICONS[connection.connection_type]} 
                          alt={`${connection.name} icon`}
                          className="h-7 w-7 object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {connection.is_chat_default && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            <span>Chat Default</span>
                          </Badge>
                        )}
                        <Badge
                          variant={connection.is_active ? "default" : "destructive"}
                          className={`flex items-center gap-1.5 ${
                            connection.is_active 
                              ? "bg-green-500 hover:bg-green-600" 
                              : "bg-[#9E9E9E] hover:bg-[#9E9E9E] text-white"
                          }`}
                        >
                          {connection.is_active ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          <span>{connection.is_active ? "Active" : "Deactivated"}</span>
                        </Badge>
                      </div>
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
                    <TooltipProvider>
                      <div className="flex gap-1.5 justify-start">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleTestConnection(connection)}
                            disabled={testingConnectionId === connection.id}
                          >
                            <Wifi className={`h-4 w-4 ${testingConnectionId === connection.id ? "animate-pulse" : ""}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {testingConnectionId === connection.id ? "Testing..." : "Test Connection"}
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleConfigureConnection(connection.id)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Configure Connection</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant={connection.is_active ? "default" : "outline"} 
                            size="sm"
                            onClick={() => handleToggleActive(connection)}
                            disabled={testingConnectionId === connection.id}
                          >
                            {connection.is_active ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {connection.is_active ? "Deactivate Connection" : "Activate Connection"}
                        </TooltipContent>
                      </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Cable className="h-5 w-5 text-primary" />
              </div>
              <span>Select Connection Type</span>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {AVAILABLE_CONNECTIONS.filter(conn => activeConnectionTypes.has(conn.type)).map((conn) => (
              <Card 
                key={conn.type}
                className="p-4 cursor-pointer hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-primary"
                onClick={() => {
                  setIsDialogOpen(false);
                  navigate(`/connections/new/${conn.type}`);
                }}
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
            {AVAILABLE_CONNECTIONS.filter(conn => activeConnectionTypes.has(conn.type)).length === 0 && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <p>No connection types are currently enabled.</p>
                <p className="text-sm mt-2">Contact your administrator to enable connections.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Connections;
