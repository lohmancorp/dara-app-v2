import { Link2, ArrowLeft } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { ConnectionConfigForm } from "@/components/ConnectionConfigForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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

const CONNECTION_NAMES: Record<ConnectionType, string> = {
  freshservice: 'FreshService',
  jira: 'Jira',
  confluence: 'Confluence',
  gemini: 'Gemini',
  openai: 'OpenAI',
  google_alerts: 'Google Alerts',
};

const EditConnection = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) {
      navigate('/connections');
      return;
    }

    const fetchConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('connections')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (!data) {
          toast({
            title: "Connection not found",
            description: "The connection you're looking for doesn't exist.",
            variant: "destructive",
          });
          navigate('/connections');
          return;
        }

        setConnection(data as Connection);
      } catch (error: any) {
        toast({
          title: "Error loading connection",
          description: error.message,
          variant: "destructive",
        });
        navigate('/connections');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnection();
  }, [id, user, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          icon={Link2}
          title="Edit Connection"
          description="Configure your connection settings"
        />
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center">Loading connection...</div>
        </div>
      </div>
    );
  }

  if (!connection) {
    return null;
  }

  const connectionName = CONNECTION_NAMES[connection.connection_type];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Link2}
        title={`Edit ${connectionName} Connection`}
        description={`Configure your ${connectionName} connection`}
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/connections')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Connections
        </Button>

        <div className="bg-card rounded-lg border p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-lg bg-primary/10">
              <img 
                src={CONNECTION_ICONS[connection.connection_type]} 
                alt={`${connectionName} icon`}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{connection.name}</h2>
              <p className="text-sm text-muted-foreground">Edit your connection settings</p>
            </div>
          </div>

          <ConnectionConfigForm
            connectionType={connection.connection_type}
            existingConnection={connection}
            onSuccess={() => navigate('/connections')}
            onCancel={() => navigate('/connections')}
          />
        </div>
      </div>
    </div>
  );
};

export default EditConnection;
