import { useState, useEffect } from "react";
import { Save, X, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface EditMethodModalProps {
  method: any;
  type: 'tools' | 'resources';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedMethod: any) => Promise<void>;
  onDelete: () => Promise<void>;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const PARAMETER_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
const MIME_TYPES = [
  'application/json',
  'text/plain',
  'text/html',
  'application/xml',
  'text/xml',
  'application/octet-stream',
];

export const EditMethodModal = ({ method, type, open, onOpenChange, onSave, onDelete }: EditMethodModalProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editedMethod, setEditedMethod] = useState<any>(null);
  const [newParameter, setNewParameter] = useState({
    name: '',
    type: 'string',
    description: '',
    required: false,
    default: '',
  });

  useEffect(() => {
    if (method && open) {
      setEditedMethod({ ...method });
    }
  }, [method, open]);

  if (!editedMethod) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedMethod);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving method:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await onDelete();
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting method:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addParameter = () => {
    if (!newParameter.name || !newParameter.type) return;

    const updatedSchema = { ...editedMethod.inputSchema };
    if (!updatedSchema.properties) {
      updatedSchema.properties = {};
    }
    if (!updatedSchema.required) {
      updatedSchema.required = [];
    }

    updatedSchema.properties[newParameter.name] = {
      type: newParameter.type,
      description: newParameter.description,
    };

    if (newParameter.default) {
      updatedSchema.properties[newParameter.name].default = newParameter.default;
    }

    if (newParameter.required && !updatedSchema.required.includes(newParameter.name)) {
      updatedSchema.required.push(newParameter.name);
    }

    setEditedMethod({ ...editedMethod, inputSchema: updatedSchema });
    setNewParameter({
      name: '',
      type: 'string',
      description: '',
      required: false,
      default: '',
    });
  };

  const removeParameter = (paramName: string) => {
    const updatedSchema = { ...editedMethod.inputSchema };
    if (updatedSchema.properties) {
      delete updatedSchema.properties[paramName];
    }
    if (updatedSchema.required) {
      updatedSchema.required = updatedSchema.required.filter((name: string) => name !== paramName);
    }
    setEditedMethod({ ...editedMethod, inputSchema: updatedSchema });
  };

  const updateParameter = (paramName: string, updates: any) => {
    const updatedSchema = { ...editedMethod.inputSchema };
    if (!updatedSchema.properties) return;

    updatedSchema.properties[paramName] = {
      ...updatedSchema.properties[paramName],
      ...updates,
    };

    setEditedMethod({ ...editedMethod, inputSchema: updatedSchema });
  };

  const toggleRequired = (paramName: string, required: boolean) => {
    const updatedSchema = { ...editedMethod.inputSchema };
    if (!updatedSchema.required) {
      updatedSchema.required = [];
    }

    if (required && !updatedSchema.required.includes(paramName)) {
      updatedSchema.required.push(paramName);
    } else if (!required) {
      updatedSchema.required = updatedSchema.required.filter((name: string) => name !== paramName);
    }

    setEditedMethod({ ...editedMethod, inputSchema: updatedSchema });
  };

  const parameters = editedMethod.inputSchema?.properties 
    ? Object.entries(editedMethod.inputSchema.properties).map(([name, schema]: [string, any]) => ({
        name,
        ...schema,
        required: editedMethod.inputSchema?.required?.includes(name) || false,
      }))
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">
                  {type === 'tools' ? 'Edit Tool' : 'Edit Resource'}
                </DialogTitle>
                <DialogDescription>
                  View and modify the configuration for this {type === 'tools' ? 'API tool' : 'resource'}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                {type === 'tools' && (
                  <TabsTrigger value="parameters">
                    Parameters ({parameters.length})
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      {type === 'tools' ? 'Tool Configuration' : 'Resource Configuration'}
                    </CardTitle>
                    <CardDescription>
                      Update the core settings for this {type === 'tools' ? 'tool' : 'resource'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">
                        {type === 'tools' ? 'Tool' : 'Resource'} Name
                      </Label>
                      <Input
                        id="edit-name"
                        value={editedMethod.name || ''}
                        onChange={(e) => setEditedMethod({ ...editedMethod, name: e.target.value })}
                        placeholder="e.g., get_ticket_details"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use lowercase with underscores (snake_case) for consistency
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editedMethod.description || ''}
                        onChange={(e) => setEditedMethod({ ...editedMethod, description: e.target.value })}
                        placeholder="Describe what this does..."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Provide a clear description of the functionality
                      </p>
                    </div>

                    <Separator />

                    {type === 'tools' ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-endpoint">Endpoint Path</Label>
                            <Input
                              id="edit-endpoint"
                              value={editedMethod.endpoint || ''}
                              onChange={(e) => setEditedMethod({ ...editedMethod, endpoint: e.target.value })}
                              placeholder="/api/tickets/{ticket_id}"
                              className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              Use {`{parameter_name}`} for path parameters
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-method">HTTP Method</Label>
                            <Select
                              value={editedMethod.method || 'GET'}
                              onValueChange={(value) => setEditedMethod({ ...editedMethod, method: value })}
                            >
                              <SelectTrigger id="edit-method">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HTTP_METHODS.map(method => (
                                  <SelectItem key={method} value={method}>
                                    {method}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="edit-uri">URI Template</Label>
                          <Input
                            id="edit-uri"
                            value={editedMethod.uriTemplate || ''}
                            onChange={(e) => setEditedMethod({ ...editedMethod, uriTemplate: e.target.value })}
                            placeholder="config://users/{user_id}"
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Unique identifier pattern for this resource type
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-resource-endpoint">API Endpoint</Label>
                            <Input
                              id="edit-resource-endpoint"
                              value={editedMethod.endpoint || ''}
                              onChange={(e) => setEditedMethod({ ...editedMethod, endpoint: e.target.value })}
                              placeholder="/api/v1/users/{user_id}/config"
                              className="font-mono text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-mimetype">Content Type</Label>
                            <Select
                              value={editedMethod.mimeType || 'application/json'}
                              onValueChange={(value) => setEditedMethod({ ...editedMethod, mimeType: value })}
                            >
                              <SelectTrigger id="edit-mimetype">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MIME_TYPES.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Parameters Tab (Tools only) */}
              {type === 'tools' && (
                <TabsContent value="parameters" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Input Parameters
                      </CardTitle>
                      <CardDescription>
                        Manage the parameters this tool accepts
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Parameters define the inputs this tool accepts. They can be used in path templates, 
                          query strings, or request bodies depending on the HTTP method.
                        </AlertDescription>
                      </Alert>

                      {/* Existing Parameters */}
                      {parameters.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-base font-semibold">Current Parameters</Label>
                          <div className="border rounded-lg divide-y">
                            {parameters.map((param: any) => (
                              <div key={param.name} className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{param.name}</span>
                                      <Badge variant="outline">{param.type}</Badge>
                                      {param.required && (
                                        <Badge variant="destructive" className="text-xs">Required</Badge>
                                      )}
                                    </div>
                                    
                                    <Input
                                      value={param.description || ''}
                                      onChange={(e) => updateParameter(param.name, { description: e.target.value })}
                                      placeholder="Parameter description..."
                                      className="text-sm"
                                    />

                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Type</Label>
                                        <Select
                                          value={param.type}
                                          onValueChange={(value) => updateParameter(param.name, { type: value })}
                                        >
                                          <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {PARAMETER_TYPES.map(type => (
                                              <SelectItem key={type} value={type}>
                                                {type}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Default Value</Label>
                                        <Input
                                          value={param.default || ''}
                                          onChange={(e) => updateParameter(param.name, { default: e.target.value })}
                                          placeholder="Optional default"
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`required-${param.name}`}
                                        checked={param.required}
                                        onChange={(e) => toggleRequired(param.name, e.target.checked)}
                                        className="h-4 w-4"
                                      />
                                      <Label htmlFor={`required-${param.name}`} className="text-sm cursor-pointer">
                                        Required parameter
                                      </Label>
                                    </div>
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeParameter(param.name)}
                                    className="ml-2 text-destructive hover:text-destructive"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Add New Parameter */}
                      <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                        <h4 className="font-semibold">Add New Parameter</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-param-name">Parameter Name</Label>
                            <Input
                              id="new-param-name"
                              placeholder="e.g., ticket_id"
                              value={newParameter.name}
                              onChange={(e) => setNewParameter({ ...newParameter, name: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="new-param-type">Data Type</Label>
                            <Select
                              value={newParameter.type}
                              onValueChange={(value) => setNewParameter({ ...newParameter, type: value })}
                            >
                              <SelectTrigger id="new-param-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PARAMETER_TYPES.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="new-param-desc">Description</Label>
                          <Textarea
                            id="new-param-desc"
                            placeholder="Explain what this parameter is for..."
                            value={newParameter.description}
                            onChange={(e) => setNewParameter({ ...newParameter, description: e.target.value })}
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-param-default">Default Value (Optional)</Label>
                            <Input
                              id="new-param-default"
                              placeholder="Leave empty if no default"
                              value={newParameter.default}
                              onChange={(e) => setNewParameter({ ...newParameter, default: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Required</Label>
                            <div className="flex items-center space-x-2 h-10">
                              <input
                                type="checkbox"
                                id="new-param-required"
                                checked={newParameter.required}
                                onChange={(e) => setNewParameter({ ...newParameter, required: e.target.checked })}
                                className="h-4 w-4"
                              />
                              <Label htmlFor="new-param-required" className="font-normal cursor-pointer">
                                This parameter is required
                              </Label>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={addParameter}
                          disabled={!newParameter.name || !newParameter.type}
                          className="w-full"
                          variant="secondary"
                        >
                          Add Parameter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {type === 'tools' ? 'Tool' : 'Resource'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{method.name}"? This action cannot be undone and will 
              immediately remove this {type === 'tools' ? 'tool' : 'resource'} from the MCP configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
