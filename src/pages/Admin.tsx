import { Settings } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
}

const CONNECTION_ICONS: Record<ConnectionType, string> = {
  freshservice: freshserviceIcon,
  jira: jiraIcon,
  confluence: confluenceIcon,
  gemini: geminiIcon,
  openai: openaiIcon,
  google_alerts: googleAlertsIcon,
};

const Admin = () => {
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
          icon={Settings}
          title="Admin Panel"
          description="Manage system connections and settings"
        />
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center">Loading services...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Settings}
        title="Admin Panel"
        description="Manage system connections and settings"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <img 
                    src={CONNECTION_ICONS[service.service_type]} 
                    alt={`${service.service_name} icon`}
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{service.service_name}</h3>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`uses-app-token-${service.id}`}>
                    Use App-Level Token
                  </Label>
                  <Switch
                    id={`uses-app-token-${service.id}`}
                    checked={service.uses_app_token}
                    onCheckedChange={(checked) => 
                      handleUpdateService(service.id, { uses_app_token: checked })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {service.uses_app_token 
                    ? "Users will use the app-wide token set by admin" 
                    : "Users must provide their own credentials"}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
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
                  </div>

                  <div>
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
                  </div>

                  <div>
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
                  </div>

                  <div>
                    <Label htmlFor={`rate-limit-${service.id}`}>
                      Rate Limit (/min)
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
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;
