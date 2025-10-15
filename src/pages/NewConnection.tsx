import { Link2, ArrowLeft } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { ConnectionConfigForm } from "@/components/ConnectionConfigForm";
import freshserviceIcon from "@/assets/connection-icons/freshservice.svg";
import jiraIcon from "@/assets/connection-icons/jira.png";
import confluenceIcon from "@/assets/connection-icons/confluence.png";
import geminiIcon from "@/assets/connection-icons/gemini.png";
import openaiIcon from "@/assets/connection-icons/openai.png";
import googleAlertsIcon from "@/assets/connection-icons/google-alerts.ico";

type ConnectionType = 'freshservice' | 'jira' | 'confluence' | 'gemini' | 'openai' | 'google_alerts';

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

const NewConnection = () => {
  const { type } = useParams<{ type: ConnectionType }>();
  const navigate = useNavigate();

  if (!type || !(type in CONNECTION_NAMES)) {
    navigate('/connections');
    return null;
  }

  const connectionType = type as ConnectionType;
  const connectionName = CONNECTION_NAMES[connectionType];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Link2}
        title={`New ${connectionName} Connection`}
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
                src={CONNECTION_ICONS[connectionType]} 
                alt={`${connectionName} icon`}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{connectionName}</h2>
              <p className="text-sm text-muted-foreground">Configure your connection settings</p>
            </div>
          </div>

          <ConnectionConfigForm
            connectionType={connectionType}
            existingConnection={null}
            onSuccess={() => navigate('/connections')}
            onCancel={() => navigate('/connections')}
          />
        </div>
      </div>
    </div>
  );
};

export default NewConnection;
