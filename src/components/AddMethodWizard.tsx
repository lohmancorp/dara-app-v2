import { useState } from "react";
import { Plus, ArrowRight, ArrowLeft, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AddMethodWizardProps {
  type: 'tools' | 'resources';
  onSave: (method: any) => Promise<void>;
}

interface ToolData {
  name: string;
  description: string;
  endpoint: string;
  method: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: string;
  }>;
}

interface ResourceData {
  name: string;
  description: string;
  uriTemplate: string;
  endpoint: string;
  mimeType: string;
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

export const AddMethodWizard = ({ type, onSave }: AddMethodWizardProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Tool-specific state
  const [toolData, setToolData] = useState<ToolData>({
    name: '',
    description: '',
    endpoint: '',
    method: 'GET',
    parameters: [],
  });

  // Resource-specific state
  const [resourceData, setResourceData] = useState<ResourceData>({
    name: '',
    description: '',
    uriTemplate: '',
    endpoint: '',
    mimeType: 'application/json',
  });

  const [currentParameter, setCurrentParameter] = useState({
    name: '',
    type: 'string',
    description: '',
    required: false,
    default: '',
  });

  const resetWizard = () => {
    setStep(1);
    setToolData({
      name: '',
      description: '',
      endpoint: '',
      method: 'GET',
      parameters: [],
    });
    setResourceData({
      name: '',
      description: '',
      uriTemplate: '',
      endpoint: '',
      mimeType: 'application/json',
    });
    setCurrentParameter({
      name: '',
      type: 'string',
      description: '',
      required: false,
      default: '',
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (type === 'tools') {
        // Convert tool data to MCP format
        const inputSchema: any = {
          type: 'object',
          properties: {},
          required: [],
        };

        toolData.parameters.forEach(param => {
          inputSchema.properties[param.name] = {
            type: param.type,
            description: param.description,
          };

          if (param.default) {
            inputSchema.properties[param.name].default = param.default;
          }

          if (param.required) {
            inputSchema.required.push(param.name);
          }
        });

        if (inputSchema.required.length === 0) {
          delete inputSchema.required;
        }

        await onSave({
          name: toolData.name,
          description: toolData.description,
          endpoint: toolData.endpoint,
          method: toolData.method,
          inputSchema: inputSchema,
        });
      } else {
        // Resource format
        await onSave({
          name: resourceData.name,
          description: resourceData.description,
          uriTemplate: resourceData.uriTemplate,
          endpoint: resourceData.endpoint,
          mimeType: resourceData.mimeType,
        });
      }

      setOpen(false);
      resetWizard();
    } catch (error) {
      console.error('Error saving method:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addParameter = () => {
    if (!currentParameter.name || !currentParameter.type) return;

    setToolData(prev => ({
      ...prev,
      parameters: [...prev.parameters, { ...currentParameter }],
    }));

    setCurrentParameter({
      name: '',
      type: 'string',
      description: '',
      required: false,
      default: '',
    });
  };

  const removeParameter = (index: number) => {
    setToolData(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index),
    }));
  };

  const canProceed = () => {
    if (type === 'tools') {
      if (step === 1) return toolData.name && toolData.description;
      if (step === 2) return toolData.endpoint && toolData.method;
      if (step === 3) return true; // Parameters are optional
    } else {
      if (step === 1) return resourceData.name && resourceData.description;
      if (step === 2) return resourceData.uriTemplate && resourceData.endpoint;
    }
    return false;
  };

  const totalSteps = type === 'tools' ? 4 : 3;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetWizard();
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add {type === 'tools' ? 'Tool' : 'Resource'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add New {type === 'tools' ? 'Tool' : 'Resource'}
          </DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps}: Configure your {type === 'tools' ? 'API tool' : 'resource'}
          </DialogDescription>
          <div className="flex gap-2 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i + 1 <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="py-6">
          {type === 'tools' ? (
            <>
              {/* Tool Step 1: Basic Information */}
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                    <CardDescription>
                      Define the fundamental details of your API tool. These help identify and describe what the tool does.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>What is a Tool?</AlertTitle>
                      <AlertDescription>
                        A tool represents a specific API operation or function that can be called. For example, "get_ticket", "create_user", or "search_documents". 
                        Each tool performs a single, well-defined action.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="tool-name" className="text-base font-semibold">
                        Tool Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="tool-name"
                        placeholder="e.g., get_ticket_details"
                        value={toolData.name}
                        onChange={(e) => setToolData(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Best Practices:</strong> Use lowercase with underscores (snake_case). Be descriptive but concise. 
                        Examples: "list_tickets", "update_user_profile", "fetch_analytics_report"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tool-description" className="text-base font-semibold">
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="tool-description"
                        placeholder="Describe what this tool does and when to use it..."
                        value={toolData.description}
                        onChange={(e) => setToolData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>What to Include:</strong> Explain the tool's purpose, what data it returns or modifies, and any important 
                        behavior. Example: "Retrieves detailed information about a specific support ticket, including status, assignee, 
                        comments, and attachments. Returns a 404 if the ticket doesn't exist."
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tool Step 2: Endpoint Configuration */}
              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      API Endpoint Configuration
                    </CardTitle>
                    <CardDescription>
                      Specify where and how to call this API endpoint
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Understanding Endpoints</AlertTitle>
                      <AlertDescription>
                        The endpoint is the URL path that will be appended to the base URL to make the API call. 
                        Use curly braces {`{parameter_name}`} to define path parameters that will be replaced with actual values.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="tool-endpoint" className="text-base font-semibold">
                        Endpoint Path <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="tool-endpoint"
                        placeholder="/api/tickets/{ticket_id}"
                        value={toolData.endpoint}
                        onChange={(e) => setToolData(prev => ({ ...prev, endpoint: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Examples:</strong>
                      </p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 ml-2">
                        <li><code>/api/users</code> - Simple path with no parameters</li>
                        <li><code>/api/tickets/{`{ticket_id}`}</code> - Single path parameter</li>
                        <li><code>/api/projects/{`{project_id}`}/tasks/{`{task_id}`}</code> - Multiple path parameters</li>
                        <li><code>/v1/search</code> - Version-prefixed endpoint</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>Note:</strong> The base URL (e.g., https://api.example.com) will be added automatically from the connection settings.
                        Only specify the path portion here.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tool-method" className="text-base font-semibold">
                        HTTP Method <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={toolData.method}
                        onValueChange={(value) => setToolData(prev => ({ ...prev, method: value }))}
                      >
                        <SelectTrigger id="tool-method">
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
                      <div className="text-xs text-muted-foreground space-y-1 mt-2">
                        <p><strong>Method Guidelines:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><strong>GET</strong> - Retrieve data (read-only, no side effects)</li>
                          <li><strong>POST</strong> - Create new resources or execute actions</li>
                          <li><strong>PUT</strong> - Update/replace entire resource</li>
                          <li><strong>PATCH</strong> - Partially update a resource</li>
                          <li><strong>DELETE</strong> - Remove a resource</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tool Step 3: Parameters */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Input Parameters
                    </CardTitle>
                    <CardDescription>
                      Define the parameters this tool accepts (optional - skip if none needed)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Parameter Types</AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p>Parameters can be used in three ways:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><strong>Path Parameters:</strong> Embedded in the URL (e.g., {`{ticket_id}`} in <code>/tickets/{`{ticket_id}`}</code>)</li>
                          <li><strong>Query Parameters:</strong> Added to URL as ?key=value (for GET requests)</li>
                          <li><strong>Body Parameters:</strong> Sent in request body (for POST/PUT/PATCH)</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    {/* Existing Parameters */}
                    {toolData.parameters.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Configured Parameters</Label>
                        <div className="border rounded-lg divide-y">
                          {toolData.parameters.map((param, index) => (
                            <div key={index} className="p-4 flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{param.name}</span>
                                  <Badge variant={param.required ? "default" : "secondary"}>
                                    {param.type}
                                  </Badge>
                                  {param.required && (
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{param.description}</p>
                                {param.default && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Default: <code className="bg-muted px-1 rounded">{param.default}</code>
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeParameter(index)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Parameter */}
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                      <h4 className="font-semibold">Add New Parameter</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="param-name">Parameter Name</Label>
                          <Input
                            id="param-name"
                            placeholder="e.g., ticket_id"
                            value={currentParameter.name}
                            onChange={(e) => setCurrentParameter(prev => ({ ...prev, name: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Use snake_case. Match path parameters exactly (e.g., {`{ticket_id}`})
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="param-type">Data Type</Label>
                          <Select
                            value={currentParameter.type}
                            onValueChange={(value) => setCurrentParameter(prev => ({ ...prev, type: value }))}
                          >
                            <SelectTrigger id="param-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PARAMETER_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Choose the data type this parameter expects
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="param-description">Description</Label>
                        <Textarea
                          id="param-description"
                          placeholder="Explain what this parameter is for..."
                          value={currentParameter.description}
                          onChange={(e) => setCurrentParameter(prev => ({ ...prev, description: e.target.value }))}
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground">
                          Describe what this parameter does and any constraints (e.g., "Must be a valid UUID", "Values: active, closed, pending")
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="param-default">Default Value (Optional)</Label>
                          <Input
                            id="param-default"
                            placeholder="Leave empty if no default"
                            value={currentParameter.default}
                            onChange={(e) => setCurrentParameter(prev => ({ ...prev, default: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            If provided, this value will be used when parameter is not specified
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="param-required">Required</Label>
                          <div className="flex items-center space-x-2 h-10">
                            <input
                              type="checkbox"
                              id="param-required"
                              checked={currentParameter.required}
                              onChange={(e) => setCurrentParameter(prev => ({ ...prev, required: e.target.checked }))}
                              className="h-4 w-4"
                            />
                            <Label htmlFor="param-required" className="font-normal cursor-pointer">
                              This parameter is required
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Check this if the API call cannot succeed without this parameter
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={addParameter}
                        disabled={!currentParameter.name || !currentParameter.type}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Parameter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tool Step 4: Review */}
              {step === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Review & Confirm
                    </CardTitle>
                    <CardDescription>
                      Review your tool configuration before saving
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Tool Name</Label>
                        <p className="font-medium">{toolData.name}</p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Description</Label>
                        <p className="text-sm">{toolData.description}</p>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Endpoint</Label>
                          <p className="font-mono text-sm">{toolData.endpoint}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">HTTP Method</Label>
                          <Badge>{toolData.method}</Badge>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Parameters</Label>
                        {toolData.parameters.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No parameters configured</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {toolData.parameters.map((param, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                <Badge variant="outline">{param.type}</Badge>
                                <div>
                                  <span className="font-medium">{param.name}</span>
                                  {param.required && <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>}
                                  <p className="text-xs text-muted-foreground">{param.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Once saved, this tool will be immediately available for use in your MCP configuration. 
                        You can edit or remove it later if needed.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              {/* Resource Step 1: Basic Information */}
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                    <CardDescription>
                      Define the fundamental details of your resource
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>What is a Resource?</AlertTitle>
                      <AlertDescription>
                        A resource represents a piece of data or content that can be retrieved, such as a document, 
                        configuration file, model information, or any other readable content. Resources are typically 
                        accessed via unique URIs and return structured data.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="resource-name" className="text-base font-semibold">
                        Resource Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="resource-name"
                        placeholder="e.g., User Configuration"
                        value={resourceData.name}
                        onChange={(e) => setResourceData(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Best Practices:</strong> Use a descriptive, human-readable name. This helps identify 
                        what the resource represents. Examples: "API Documentation", "Model Specifications", "User Settings"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resource-description" className="text-base font-semibold">
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="resource-description"
                        placeholder="Describe what this resource contains and provides..."
                        value={resourceData.description}
                        onChange={(e) => setResourceData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>What to Include:</strong> Explain what data this resource provides, its format, and typical use cases.
                        Example: "Returns user-specific configuration settings including theme preferences, notification settings, 
                        and default values. Used to initialize user sessions and personalize the experience."
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resource Step 2: URI and Endpoint */}
              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      URI and Endpoint Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure how to identify and access this resource
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Understanding URI Templates</AlertTitle>
                      <AlertDescription>
                        The URI template is a unique identifier pattern for this resource type. It's not a full URL, 
                        but rather a template that describes how to construct the identifier for accessing specific 
                        instances of this resource.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="resource-uri" className="text-base font-semibold">
                        URI Template <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="resource-uri"
                        placeholder="e.g., config://users/{user_id}"
                        value={resourceData.uriTemplate}
                        onChange={(e) => setResourceData(prev => ({ ...prev, uriTemplate: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Examples of URI Templates:</strong>
                      </p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 ml-2">
                        <li><code>model://gemini-1.5-pro</code> - Static identifier for a specific model</li>
                        <li><code>config://users/{`{user_id}`}</code> - Dynamic URI with user parameter</li>
                        <li><code>document://projects/{`{project_id}`}/files/{`{file_id}`}</code> - Hierarchical URI with multiple parameters</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>Format Guidelines:</strong> Use a descriptive scheme (the part before ://), followed by 
                        a path. Use {`{parameter_name}`} for dynamic parts that will be replaced with actual values.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resource-endpoint" className="text-base font-semibold">
                        API Endpoint <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="resource-endpoint"
                        placeholder="/api/v1/users/{user_id}/config"
                        value={resourceData.endpoint}
                        onChange={(e) => setResourceData(prev => ({ ...prev, endpoint: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Purpose:</strong> This is the actual API path that will be called to retrieve the resource data.
                        The base URL will be added automatically from connection settings.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>Parameter Matching:</strong> If your URI template uses parameters like {`{user_id}`}, 
                        make sure to use the same parameter names in the endpoint path.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resource-mimetype" className="text-base font-semibold">
                        Content Type (MIME Type) <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={resourceData.mimeType}
                        onValueChange={(value) => setResourceData(prev => ({ ...prev, mimeType: value }))}
                      >
                        <SelectTrigger id="resource-mimetype">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MIME_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground space-y-1 mt-2">
                        <p><strong>Common MIME Types:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><strong>application/json</strong> - Structured JSON data (most common)</li>
                          <li><strong>text/plain</strong> - Plain text content</li>
                          <li><strong>text/html</strong> - HTML documents</li>
                          <li><strong>application/xml</strong> - XML data</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resource Step 3: Review */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Review & Confirm
                    </CardTitle>
                    <CardDescription>
                      Review your resource configuration before saving
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Resource Name</Label>
                        <p className="font-medium">{resourceData.name}</p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Description</Label>
                        <p className="text-sm">{resourceData.description}</p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">URI Template</Label>
                        <p className="font-mono text-sm">{resourceData.uriTemplate}</p>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">API Endpoint</Label>
                          <p className="font-mono text-sm">{resourceData.endpoint}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Content Type</Label>
                          <Badge variant="outline">{resourceData.mimeType}</Badge>
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Once saved, this resource will be immediately available for use in your MCP configuration. 
                        You can edit or remove it later if needed.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save ' + (type === 'tools' ? 'Tool' : 'Resource')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
