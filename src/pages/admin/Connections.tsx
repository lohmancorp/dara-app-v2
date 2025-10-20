import { Cable } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import freshserviceIcon from "@/assets/connection-icons/freshservice.svg";
import jiraIcon from "@/assets/connection-icons/jira.png";
import confluenceIcon from "@/assets/connection-icons/confluence.png";
import geminiIcon from "@/assets/connection-icons/gemini.png";
import openaiIcon from "@/assets/connection-icons/openai.png";
import googleAlertsIcon from "@/assets/connection-icons/google-alerts.ico";

type ConnectionType = 'freshservice' | 'jira' | 'confluence' | 'gemini' | 'openai' | 'google_alerts';

interface MCPService {
  id: string;
  service_name: string;
  service_type: ConnectionType;
  description: string | null;
  uses_app_token: boolean;
  call_delay_ms: number;
  max_retries: number;
  retry_delay_sec: number;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
}

const CONNECTION_CONFIGS: Record<ConnectionType, { name: string; description: string; icon: string }> = {
  freshservice: {
    name: "Freshservice",
    description: "IT service management and ticketing system",
    icon: freshserviceIcon,
  },
  jira: {
    name: "Jira",
    description: "Project tracking and agile development platform",
    icon: jiraIcon,
  },
  confluence: {
    name: "Confluence",
    description: "Team collaboration and documentation workspace",
    icon: confluenceIcon,
  },
  gemini: {
    name: "Gemini",
    description: "Google's advanced AI model for reasoning and analysis",
    icon: geminiIcon,
  },
  openai: {
    name: "OpenAI",
    description: "ChatGPT and advanced language models",
    icon: openaiIcon,
  },
  google_alerts: {
    name: "Google Alerts",
    description: "Automated monitoring and notifications for web content",
    icon: googleAlertsIcon,
  },
};

const AdminConnections = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<MCPService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingService, setEditingService] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('mcp_services')
        .select('*')
        .order('service_name', { ascending: true });

      if (error) throw error;
      setServices((data || []) as MCPService[]);
    } catch (error: any) {
      toast({
        title: "Error fetching services",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateService = async (serviceId: string, updates: Partial<MCPService>) => {
    try {
      const { error } = await supabase
        .from('mcp_services')
        .update(updates)
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: "Service updated",
        description: "Configuration saved successfully",
      });

      await fetchServices();
      setEditingService(null);
    } catch (error: any) {
      toast({
        title: "Error updating service",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Cable}
        title="Connection Management"
        description="Configure connection settings and API rate limits"
      />
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center">Loading services...</div>
        </div>
      </div>
    );
  }

  const getServiceByType = (type: ConnectionType) => {
    return services.find(s => s.service_type === type);
  };

  const renderConnectionCard = (type: ConnectionType) => {
    const config = CONNECTION_CONFIGS[type];
    const service = getServiceByType(type);

    if (!service) {
      return (
        <Card key={type}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <img 
                  src={config.icon} 
                  alt={`${config.name} icon`}
                  className="h-5 w-5 object-contain"
                />
              </div>
              <div>
                <CardTitle>{config.name}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configuration not available</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={type}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <img 
                src={config.icon} 
                alt={`${config.name} icon`}
                className="h-5 w-5 object-contain"
              />
            </div>
            <div>
              <CardTitle>{config.name}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={`uses-app-token-${service.id}`}>
                Use App-Level Token
              </Label>
              <p className="text-sm text-muted-foreground">
                {service.uses_app_token 
                  ? "Users will use the app-wide token set by admin" 
                  : "Users must provide their own credentials"}
              </p>
            </div>
            <Switch
              id={`uses-app-token-${service.id}`}
              checked={service.uses_app_token}
              onCheckedChange={(checked) => 
                handleUpdateService(service.id, { uses_app_token: checked })
              }
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-4">API Rate Limits</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`call-delay-${service.id}`}>
                    Call Delay (ms)
                  </Label>
                  <Input
                    id={`call-delay-${service.id}`}
                    type="number"
                    value={editingService === service.id ? undefined : service.call_delay_ms}
                    defaultValue={service.call_delay_ms}
                    onFocus={() => setEditingService(service.id)}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value !== service.call_delay_ms) {
                        handleUpdateService(service.id, { call_delay_ms: value });
                      } else {
                        setEditingService(null);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum delay between consecutive API calls in milliseconds
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`max-retries-${service.id}`}>
                    Max Retries
                  </Label>
                  <Input
                    id={`max-retries-${service.id}`}
                    type="number"
                    value={editingService === service.id ? undefined : service.max_retries}
                    defaultValue={service.max_retries}
                    onFocus={() => setEditingService(service.id)}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value !== service.max_retries) {
                        handleUpdateService(service.id, { max_retries: value });
                      } else {
                        setEditingService(null);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of retry attempts when a request fails
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`retry-delay-${service.id}`}>
                    Retry Delay (sec)
                  </Label>
                  <Input
                    id={`retry-delay-${service.id}`}
                    type="number"
                    value={editingService === service.id ? undefined : service.retry_delay_sec}
                    defaultValue={service.retry_delay_sec}
                    onFocus={() => setEditingService(service.id)}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value !== service.retry_delay_sec) {
                        handleUpdateService(service.id, { retry_delay_sec: value });
                      } else {
                        setEditingService(null);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Wait time in seconds before retrying a failed request
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`rate-limit-${service.id}`}>
                    Calls per Minute
                  </Label>
                  <Input
                    id={`rate-limit-${service.id}`}
                    type="number"
                    value={editingService === service.id ? undefined : service.rate_limit_per_minute}
                    defaultValue={service.rate_limit_per_minute}
                    onFocus={() => setEditingService(service.id)}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value !== service.rate_limit_per_minute) {
                        handleUpdateService(service.id, { rate_limit_per_minute: value });
                      } else {
                        setEditingService(null);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of API calls allowed per minute
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`rate-limit-hour-${service.id}`}>
                    Calls per Hour
                  </Label>
                  <Input
                    id={`rate-limit-hour-${service.id}`}
                    type="number"
                    value={editingService === service.id ? undefined : service.rate_limit_per_hour}
                    defaultValue={service.rate_limit_per_hour}
                    onFocus={() => setEditingService(service.id)}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value !== service.rate_limit_per_hour) {
                        handleUpdateService(service.id, { rate_limit_per_hour: value });
                      } else {
                        setEditingService(null);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of API calls allowed per hour
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Cable}
        title="Connection Management"
        description="Configure connection settings and API rate limits"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="space-y-6">
          {renderConnectionCard('freshservice')}
          {renderConnectionCard('jira')}
          {renderConnectionCard('confluence')}
          {renderConnectionCard('gemini')}
          {renderConnectionCard('openai')}
          {renderConnectionCard('google_alerts')}
        </div>
      </div>
    </div>
  );
};

export default AdminConnections;
