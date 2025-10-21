import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Eye, EyeOff, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ServiceToken {
  id: string;
  service_id: string;
  auth_type: string;
  encrypted_token: string;
  auth_config: any;
  created_at: string;
  updated_at: string;
}

interface ServiceTokenManagerProps {
  serviceId: string;
  serviceName: string;
  usesAppToken: boolean;
}

export const ServiceTokenManager = ({ serviceId, serviceName, usesAppToken }: ServiceTokenManagerProps) => {
  const { toast } = useToast();
  const [token, setToken] = useState<ServiceToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form state
  const [authType, setAuthType] = useState<string>("api_key");
  const [tokenValue, setTokenValue] = useState("");
  const [authConfigJson, setAuthConfigJson] = useState("{}");

  useEffect(() => {
    fetchToken();
  }, [serviceId]);

  const fetchToken = async () => {
    try {
      const { data, error } = await supabase
        .from('mcp_service_tokens')
        .select('*')
        .eq('service_id', serviceId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setToken(data);
      if (data) {
        setAuthType(data.auth_type);
        setAuthConfigJson(JSON.stringify(data.auth_config || {}, null, 2));
      }
    } catch (error: any) {
      toast({
        title: "Error fetching token",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tokenValue.trim() && !token) {
      toast({
        title: "Token required",
        description: "Please enter a token value",
        variant: "destructive",
      });
      return;
    }

    // Validate auth config JSON
    let authConfig = {};
    try {
      authConfig = JSON.parse(authConfigJson);
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: "Auth configuration must be valid JSON",
        variant: "destructive",
      });
      return;
    }

    try {
      const tokenData = {
        service_id: serviceId,
        auth_type: authType,
        ...(tokenValue.trim() && { encrypted_token: tokenValue }),
        auth_config: authConfig,
        updated_at: new Date().toISOString(),
      };

      if (token) {
        // Update existing token
        const { error } = await supabase
          .from('mcp_service_tokens')
          .update(tokenData)
          .eq('id', token.id);

        if (error) throw error;
      } else {
        // Create new token
        const { error } = await supabase
          .from('mcp_service_tokens')
          .insert([tokenData]);

        if (error) throw error;
      }

      toast({
        title: "Token saved",
        description: "Service token has been saved successfully",
      });

      setIsEditing(false);
      setTokenValue("");
      setShowToken(false);
      await fetchToken();
    } catch (error: any) {
      toast({
        title: "Error saving token",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!token) return;

    try {
      const { error } = await supabase
        .from('mcp_service_tokens')
        .delete()
        .eq('id', token.id);

      if (error) throw error;

      toast({
        title: "Token deleted",
        description: "Service token has been removed",
      });

      setToken(null);
      setIsEditing(false);
      setTokenValue("");
      setAuthConfigJson("{}");
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast({
        title: "Error deleting token",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Service Token Management
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!usesAppToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Service Token Management
          </CardTitle>
          <CardDescription>
            This service is configured to use user-provided tokens. Enable "Use App-Level Token" in General Settings to manage a shared token.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Service Token Management
          </CardTitle>
          <CardDescription>
            Configure the app-level authentication token for {serviceName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditing && !token && (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">No app-level token configured</p>
              <Button onClick={() => setIsEditing(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Token
              </Button>
            </div>
          )}

          {!isEditing && token && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Authentication Type</p>
                  <p className="text-sm text-muted-foreground">{token.auth_type}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {Object.keys(token.auth_config || {}).length > 0 && (
                <div className="space-y-2">
                  <Label>Authentication Configuration</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(token.auth_config, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(token.updated_at).toLocaleString()}
              </p>
            </div>
          )}

          {isEditing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-type">Authentication Type</Label>
                <Select value={authType} onValueChange={setAuthType}>
                  <SelectTrigger id="auth-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="oauth">OAuth 2.0</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select how this service authenticates API requests
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="token-value">Token / Credential</Label>
                <div className="relative">
                  <Input
                    id="token-value"
                    type={showToken ? "text" : "password"}
                    value={tokenValue}
                    onChange={(e) => setTokenValue(e.target.value)}
                    placeholder={token ? "Enter new token to update (leave blank to keep existing)" : "Enter token or API key"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This token will be encrypted and stored securely
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="auth-config">Authentication Configuration (JSON)</Label>
                <Textarea
                  id="auth-config"
                  value={authConfigJson}
                  onChange={(e) => setAuthConfigJson(e.target.value)}
                  placeholder='{"header": "X-API-Key", "prefix": "Bearer"}'
                  className="font-mono text-xs min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Additional configuration like header names, prefixes, or OAuth settings
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Token
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setTokenValue("");
                    if (token) {
                      setAuthType(token.auth_type);
                      setAuthConfigJson(JSON.stringify(token.auth_config || {}, null, 2));
                    } else {
                      setAuthType("api_key");
                      setAuthConfigJson("{}");
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Token?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the app-level token for {serviceName}. Users will not be able to use this service until a new token is configured.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
