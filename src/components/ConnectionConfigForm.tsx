import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { ExtractionProfilesDialog } from "./ExtractionProfilesDialog";

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

interface ConnectionConfigFormProps {
  connectionType?: ConnectionType;
  existingConnection?: Connection | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const DEFAULT_ENDPOINTS: Record<string, string> = {
  gemini: 'https://generativelanguage.googleapis.com',
  openai: 'https://api.openai.com',
  google_alerts: 'https://www.google.com/alerts',
};

const DEFAULT_AUTH_TYPES: Record<ConnectionType, AuthType> = {
  freshservice: 'token',
  jira: 'basic_auth',
  confluence: 'basic_auth',
  gemini: 'token',
  openai: 'token',
  google_alerts: 'oauth',
};

const CONNECTION_NAMES: Record<ConnectionType, string> = {
  freshservice: 'FreshService',
  jira: 'Jira',
  confluence: 'Confluence',
  gemini: 'Gemini',
  openai: 'OpenAI',
  google_alerts: 'Google Alerts',
};

export const ConnectionConfigForm = ({ 
  connectionType, 
  existingConnection, 
  onSuccess, 
  onCancel 
}: ConnectionConfigFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: existingConnection?.name || '',
    endpoint: existingConnection?.endpoint || DEFAULT_ENDPOINTS[connectionType || ''] || '',
    auth_type: existingConnection?.auth_type || (connectionType ? DEFAULT_AUTH_TYPES[connectionType] : 'token'),
    call_delay_ms: existingConnection?.call_delay_ms || 600,
    retry_delay_sec: existingConnection?.retry_delay_sec || 60,
    max_retries: existingConnection?.max_retries || 5,
  });

  const [authConfig, setAuthConfig] = useState({
    api_key: existingConnection?.auth_config?.api_key || '',
    username: existingConnection?.auth_config?.username || '',
    password: existingConnection?.auth_config?.password || '',
    client_id: existingConnection?.auth_config?.client_id || '',
    client_secret: existingConnection?.auth_config?.client_secret || '',
  });

  const [connectionConfig, setConnectionConfig] = useState({
    domain: existingConnection?.connection_config?.domain || '',
    extraction_profiles: existingConnection?.connection_config?.extraction_profiles || null,
  });

  const [showExtractionDialog, setShowExtractionDialog] = useState(false);

  const isEndpointReadOnly = connectionType && ['gemini', 'openai', 'google_alerts'].includes(connectionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !connectionType) return;

    try {
      const data = {
        user_id: user.id,
        connection_type: connectionType,
        name: formData.name,
        endpoint: formData.endpoint,
        auth_type: formData.auth_type,
        auth_config: authConfig,
        call_delay_ms: formData.call_delay_ms,
        retry_delay_sec: formData.retry_delay_sec,
        max_retries: formData.max_retries,
        connection_config: connectionConfig,
        is_active: true,
      };

      if (existingConnection) {
        const { error } = await supabase
          .from('connections')
          .update(data)
          .eq('id', existingConnection.id);

        if (error) throw error;

        toast({
          title: "Connection updated",
          description: "Your connection has been successfully updated.",
        });
      } else {
        const { error } = await supabase
          .from('connections')
          .insert(data);

        if (error) throw error;

        toast({
          title: "Connection created",
          description: "Your connection has been successfully created.",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error saving connection",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Configuration */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Connection Name <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={connectionType ? `My ${CONNECTION_NAMES[connectionType]} Connection` : "My Connection"}
            required
          />
        </div>

        <div>
          <Label htmlFor="endpoint">
            {connectionType === 'freshservice' ? 'FreshService Domain' : 'Endpoint'} 
            {!isEndpointReadOnly && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="endpoint"
            value={formData.endpoint}
            onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
            placeholder={connectionType === 'freshservice' ? 'cbportal.freshservice.com' : 'https://api.example.com'}
            disabled={isEndpointReadOnly}
            required={!isEndpointReadOnly}
          />
          {isEndpointReadOnly && (
            <p className="text-xs text-muted-foreground mt-1">This endpoint is managed by the service</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Authentication Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Authentication</h3>
        
        <div>
          <Label htmlFor="auth_type">Auth Type</Label>
          <Select
            value={formData.auth_type}
            onValueChange={(value: AuthType) => setFormData({ ...formData, auth_type: value })}
          >
            <SelectTrigger id="auth_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="token">API Token</SelectItem>
              <SelectItem value="basic_auth">Basic Auth</SelectItem>
              <SelectItem value="oauth">OAuth</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.auth_type === 'token' && (
          <div>
            <Label htmlFor="api_key">{connectionType === 'freshservice' ? 'FreshService API Key' : 'API Key'} <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showApiKey ? "text" : "password"}
                value={authConfig.api_key}
                onChange={(e) => setAuthConfig({ ...authConfig, api_key: e.target.value })}
                placeholder="Enter your API key"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your personal API key for authentication.
            </p>
          </div>
        )}

        {formData.auth_type === 'basic_auth' && (
          <>
            <div>
              <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
              <Input
                id="username"
                value={authConfig.username}
                onChange={(e) => setAuthConfig({ ...authConfig, username: e.target.value })}
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={authConfig.password}
                  onChange={(e) => setAuthConfig({ ...authConfig, password: e.target.value })}
                  placeholder="Enter password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        )}

        {formData.auth_type === 'oauth' && (
          <>
            <div>
              <Label htmlFor="client_id">Client ID <span className="text-destructive">*</span></Label>
              <Input
                id="client_id"
                value={authConfig.client_id}
                onChange={(e) => setAuthConfig({ ...authConfig, client_id: e.target.value })}
                placeholder="Enter client ID"
                required
              />
            </div>
            <div>
              <Label htmlFor="client_secret">Client Secret <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="client_secret"
                  type={showPassword ? "text" : "password"}
                  value={authConfig.client_secret}
                  onChange={(e) => setAuthConfig({ ...authConfig, client_secret: e.target.value })}
                  placeholder="Enter client secret"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* Privacy Configuration - FreshService Only */}
      {connectionType === 'freshservice' && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Privacy Configuration</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Data Extraction & Field Exclusion
              </p>
              <p className="text-sm text-muted-foreground">
                Define which fields are pulled from FreshService. Fields not selected in a profile are effectively excluded from analysis and downloads.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExtractionDialog(true)}
                disabled={!formData.endpoint || !authConfig.api_key}
              >
                Configure Extraction Profiles
              </Button>
              {(!formData.endpoint || !authConfig.api_key) && (
                <p className="text-xs text-muted-foreground">
                  Please enter your FreshService domain and API key first
                </p>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* API Throttling */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">API Throttling</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="call_delay_ms">Call Delay (ms)</Label>
            <Input
              id="call_delay_ms"
              type="number"
              value={formData.call_delay_ms}
              onChange={(e) => setFormData({ ...formData, call_delay_ms: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Delay between each {connectionType === 'freshservice' ? 'FreshService' : ''} API call.
            </p>
          </div>

          <div>
            <Label htmlFor="retry_delay_sec">Retry Delay (sec)</Label>
            <Input
              id="retry_delay_sec"
              type="number"
              value={formData.retry_delay_sec}
              onChange={(e) => setFormData({ ...formData, retry_delay_sec: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How long to wait after hitting a rate limit.
            </p>
          </div>

          <div>
            <Label htmlFor="max_retries">Max Retries</Label>
            <Input
              id="max_retries"
              type="number"
              value={formData.max_retries}
              onChange={(e) => setFormData({ ...formData, max_retries: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Attempts before failing a request.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {existingConnection ? 'Update Connection' : 'Create Connection'}
        </Button>
      </div>

      {/* Extraction Profiles Dialog */}
      {connectionType === 'freshservice' && (
        <ExtractionProfilesDialog
          open={showExtractionDialog}
          onOpenChange={setShowExtractionDialog}
          endpoint={formData.endpoint}
          apiKey={authConfig.api_key}
          currentProfiles={connectionConfig.extraction_profiles}
          onSave={(profiles) => {
            setConnectionConfig({
              ...connectionConfig,
              extraction_profiles: profiles,
            });
          }}
        />
      )}
    </form>
  );
};
