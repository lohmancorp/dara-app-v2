import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import confluenceIcon from "@/assets/connection-icons/confluence.png";
import freshserviceIcon from "@/assets/connection-icons/freshservice.png";
import geminiIcon from "@/assets/connection-icons/gemini.png";
import googleAlertsIcon from "@/assets/connection-icons/google-alerts.ico";
import jiraIcon from "@/assets/connection-icons/jira.png";
import openaiIcon from "@/assets/connection-icons/openai.png";

type Connection = {
  id: string;
  name: string;
  connection_type: string;
};

type ConnectionSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  connections: Connection[];
};

const getConnectionIcon = (connectionType: string): string | null => {
  const iconMap: Record<string, string> = {
    confluence: confluenceIcon,
    freshservice: freshserviceIcon,
    gemini: geminiIcon,
    "google-alerts": googleAlertsIcon,
    jira: jiraIcon,
    openai: openaiIcon,
  };
  
  return iconMap[connectionType.toLowerCase()] || null;
};

export const ConnectionSelect = ({ value, onValueChange, connections }: ConnectionSelectProps) => {
  const selectedConnection = connections.find(c => c.id === value);
  
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a connection">
          {selectedConnection && (
            <div className="flex items-center gap-2">
              {getConnectionIcon(selectedConnection.connection_type) && (
                <img 
                  src={getConnectionIcon(selectedConnection.connection_type)!} 
                  alt={selectedConnection.connection_type}
                  className="h-5 w-5 object-contain"
                />
              )}
              <span>{selectedConnection.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background z-50">
        {connections.map((connection) => {
          const icon = getConnectionIcon(connection.connection_type);
          return (
            <SelectItem key={connection.id} value={connection.id}>
              <div className="flex items-center gap-2">
                {icon && (
                  <img 
                    src={icon} 
                    alt={connection.connection_type}
                    className="h-5 w-5 object-contain"
                  />
                )}
                <span>{connection.name}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
