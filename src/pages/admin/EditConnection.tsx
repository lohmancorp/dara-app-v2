import { Cable, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { TagInput } from "@/components/TagInput";
import { Button } from "@/components/ui/button";
import freshserviceIcon from "@/assets/connection-icons/freshservice.svg";
import jiraIcon from "@/assets/connection-icons/jira.png";
import confluenceIcon from "@/assets/connection-icons/confluence.png";
import geminiIcon from "@/assets/connection-icons/gemini.png";
import openaiIcon from "@/assets/connection-icons/openai.png";
import googleAlertsIcon from "@/assets/connection-icons/google-alerts.ico";
import { SupportedMethodsTable } from "@/components/SupportedMethodsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  tools_config: any[];
  resources_config: any[];
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

const AdminEditConnection = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [service, setService] = useState<MCPService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      fetchService();
      fetchAllTags();
    }
  }, [id]);

  const fetchService = async () => {
    try {
      const { data, error } = await supabase
        .from('mcp_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setService(data as MCPService);
    } catch (error: any) {
      toast({
        title: "Error fetching service",
        description: error.message,
        variant: "destructive",
      });
      navigate('/admin/connections');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllTags = async () => {
    try {
      const { data, error } = await supabase
        .from('mcp_services')
        .select('tags');

      if (error) throw error;
      
      const tags = new Set<string>();
      data?.forEach((s: any) => {
        s.tags?.forEach((tag: string) => tags.add(tag));
      });
      setExistingTags(Array.from(tags));
    } catch (error: any) {
      console.error("Error fetching tags:", error);
    }
  };

  const handleUpdateService = async (updates: Partial<MCPService>) => {
    if (!service) return;

    try {
      const { error } = await supabase
        .from('mcp_services')
        .update(updates)
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: "Service updated",
        description: "Configuration saved successfully",
      });

      await fetchService();
      setEditingField(null);
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
          title="Loading..."
          description="Please wait"
        />
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center">Loading service configuration...</div>
        </div>
      </div>
    );
  }

  if (!service) {
    return null;
  }

  const config = CONNECTION_CONFIGS[service.service_type];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Cable}
        title={config.name}
        description="Configure connection settings and API rate limits"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/admin/connections')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Connections
        </Button>

        {/* Connection Header Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <img 
                  src={config.icon} 
                  alt={`${config.name} icon`}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{config.name}</h2>
                <p className="text-muted-foreground mt-1">{config.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Settings Section */}
        <Card>
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
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic connection configuration and behavior</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-active">
                  Enable Connection Globally
                </Label>
                <p className="text-sm text-muted-foreground">
                  {service.is_active 
                    ? "This connection is available to all users" 
                    : "This connection is disabled and unavailable to users"}
                </p>
              </div>
              <Switch
                id="is-active"
                checked={service.is_active}
                onCheckedChange={(checked) => 
                  handleUpdateService({ is_active: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="uses-app-token">
                  Use App-Level Token
                </Label>
                <p className="text-sm text-muted-foreground">
                  {service.uses_app_token 
                    ? "Users will use the app-wide token set by admin" 
                    : "Users must provide their own credentials"}
                </p>
              </div>
              <Switch
                id="uses-app-token"
                checked={service.uses_app_token}
                onCheckedChange={(checked) => 
                  handleUpdateService({ uses_app_token: checked })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint Host</Label>
              <Input
                id="endpoint"
                type="text"
                value={editingField === 'endpoint' ? undefined : service.endpoint_template || ''}
                defaultValue={service.endpoint_template || ''}
                placeholder="https://api.example.com"
                onFocus={() => setEditingField('endpoint')}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value !== service.endpoint_template) {
                    handleUpdateService({ endpoint_template: value || null });
                  } else {
                    setEditingField(null);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Default API endpoint for this connection type
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-custom-endpoint">
                  Allow Custom Endpoint
                </Label>
                <p className="text-sm text-muted-foreground">
                  {service.allow_custom_endpoint 
                    ? "Users can define their own endpoint (e.g., customer-specific URLs)" 
                    : "Users must use the admin-defined endpoint above"}
                </p>
              </div>
              <Switch
                id="allow-custom-endpoint"
                checked={service.allow_custom_endpoint}
                onCheckedChange={(checked) => 
                  handleUpdateService({ allow_custom_endpoint: checked })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="tags">Connection Tags</Label>
              <TagInput
                id="tags"
                value={service.tags || []}
                onChange={(tags) => handleUpdateService({ tags })}
                placeholder="Type to search or create tags..."
                suggestions={existingTags}
              />
            </div>
          </CardContent>
        </Card>

        {/* API Rate Limits Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>API Rate Limits</CardTitle>
            <CardDescription>
              Configure rate limiting and retry behavior for API calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="call-delay">
                  Call Delay (ms)
                </Label>
                <Input
                  id="call-delay"
                  type="number"
                  value={editingField === 'call_delay' ? undefined : service.call_delay_ms}
                  defaultValue={service.call_delay_ms}
                  onFocus={() => setEditingField('call_delay')}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value !== service.call_delay_ms) {
                      handleUpdateService({ call_delay_ms: value });
                    } else {
                      setEditingField(null);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum delay between consecutive API calls in milliseconds
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retry-delay">
                  Retry Delay (sec)
                </Label>
                <Input
                  id="retry-delay"
                  type="number"
                  value={editingField === 'retry_delay' ? undefined : service.retry_delay_sec}
                  defaultValue={service.retry_delay_sec}
                  onFocus={() => setEditingField('retry_delay')}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value !== service.retry_delay_sec) {
                      handleUpdateService({ retry_delay_sec: value });
                    } else {
                      setEditingField(null);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Wait time in seconds before retrying a failed request
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-retries">
                  Max Retries
                </Label>
                <Input
                  id="max-retries"
                  type="number"
                  value={editingField === 'max_retries' ? undefined : service.max_retries}
                  defaultValue={service.max_retries}
                  onFocus={() => setEditingField('max_retries')}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value !== service.max_retries) {
                      handleUpdateService({ max_retries: value });
                    } else {
                      setEditingField(null);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Number of retry attempts when a request fails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate-limit">
                  Calls per Minute
                </Label>
                <Input
                  id="rate-limit"
                  type="number"
                  value={editingField === 'rate_limit' ? undefined : service.rate_limit_per_minute}
                  defaultValue={service.rate_limit_per_minute}
                  onFocus={() => setEditingField('rate_limit')}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value !== service.rate_limit_per_minute) {
                      handleUpdateService({ rate_limit_per_minute: value });
                    } else {
                      setEditingField(null);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of API calls allowed per minute
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate-limit-hour">
                  Calls per Hour
                </Label>
                <Input
                  id="rate-limit-hour"
                  type="number"
                  value={editingField === 'rate_limit_hour' ? undefined : service.rate_limit_per_hour}
                  defaultValue={service.rate_limit_per_hour}
                  onFocus={() => setEditingField('rate_limit_hour')}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value !== service.rate_limit_per_hour) {
                      handleUpdateService({ rate_limit_per_hour: value });
                    } else {
                      setEditingField(null);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of API calls allowed per hour
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supported Methods Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Supported Methods</CardTitle>
            <CardDescription>
              Available API methods and resources for this connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tools" className="w-full">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="tools">
                  Tools ({service.tools_config?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="resources">
                  Resources ({service.resources_config?.length || 0})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="tools" className="mt-6">
                <SupportedMethodsTable 
                  methods={service.tools_config || []} 
                  type="tools" 
                />
              </TabsContent>
              
              <TabsContent value="resources" className="mt-6">
                <SupportedMethodsTable 
                  methods={service.resources_config || []} 
                  type="resources" 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminEditConnection;
