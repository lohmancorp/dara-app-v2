import { Cable, Settings, CheckCircle, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
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
  is_active: boolean;
  endpoint_template: string | null;
  allow_custom_endpoint: boolean;
  call_delay_ms: number;
  max_retries: number;
  retry_delay_sec: number;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  tags: string[];
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
  const navigate = useNavigate();
  const [services, setServices] = useState<MCPService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Cable}
        title="Connection Management"
        description="Configure connection settings and API rate limits"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Object.entries(CONNECTION_CONFIGS).map(([type, config]) => {
            const service = getServiceByType(type as ConnectionType);
            if (!service) return null;

            return (
              <Card 
                key={type} 
                className="hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-primary cursor-pointer"
                onClick={() => navigate(`/admin/connections/${service.id}`)}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-px rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <img 
                        src={config.icon} 
                        alt={`${config.name} icon`}
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                    <Badge
                      variant={service.is_active ? "default" : "destructive"}
                      className={`flex items-center gap-1.5 ${
                        service.is_active 
                          ? "bg-green-500 hover:bg-green-600" 
                          : "bg-[#9E9E9E] hover:bg-[#9E9E9E] text-white"
                      }`}
                    >
                      {service.is_active ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      <span>{service.is_active ? "Enabled" : "Disabled"}</span>
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {config.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      {service.uses_app_token ? "App Token" : "User Token"}
                    </div>
                    <Settings className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminConnections;
