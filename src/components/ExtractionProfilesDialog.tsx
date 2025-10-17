import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ExtractionProfile {
  light: string[];
  extended: string[];
}

interface FreshServiceField {
  id?: number;
  name: string;
  label: string;
  description?: string;
  field_type?: string;
  required?: boolean;
}

interface ExtractionProfilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: string;
  apiKey: string;
  currentProfiles?: ExtractionProfile;
  onSave: (profiles: ExtractionProfile) => void;
}

const DEFAULT_LIGHT_FIELDS = [
  'priority', 'requester_id', 'responder_id', 'status', 
  'subject', 'ticket_id', 'type'
];

const DEFAULT_EXTENDED_FIELDS = [
  ...DEFAULT_LIGHT_FIELDS,
  'cc_emails', 'forwarded_emails', 'reply_cc_emails',
  'first_response_escalated', 'is_spam', 'email_config_id',
  'group_id', 'source', 'support_email', 'to_emails',
  'product_id', 'due_by', 'first_response_due_by'
];

export const ExtractionProfilesDialog = ({
  open,
  onOpenChange,
  endpoint,
  apiKey,
  currentProfiles,
  onSave,
}: ExtractionProfilesDialogProps) => {
  const { toast } = useToast();
  const [activeProfile, setActiveProfile] = useState<'light' | 'extended'>('light');
  const [searchTerm, setSearchTerm] = useState('');
  const [fields, setFields] = useState<FreshServiceField[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<ExtractionProfile>({
    light: currentProfiles?.light || DEFAULT_LIGHT_FIELDS,
    extended: currentProfiles?.extended || DEFAULT_EXTENDED_FIELDS,
  });

  useEffect(() => {
    if (open && endpoint && apiKey) {
      fetchFields();
    }
  }, [open, endpoint, apiKey]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-freshservice-fields', {
        body: { endpoint, apiKey }
      });

      if (error) throw error;

      if (data?.success && data?.fields) {
        setFields(data.fields);
      } else {
        throw new Error('Failed to fetch fields');
      }
    } catch (error: any) {
      toast({
        title: "Error fetching fields",
        description: error.message,
        variant: "destructive",
      });
      // Fallback to default field list
      setFields(createDefaultFields());
    } finally {
      setLoading(false);
    }
  };

  const createDefaultFields = (): FreshServiceField[] => {
    const defaultFieldNames = Array.from(new Set([...DEFAULT_LIGHT_FIELDS, ...DEFAULT_EXTENDED_FIELDS]));
    return defaultFieldNames.map(name => ({
      name,
      label: name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: `The ${name.replace(/_/g, ' ')} field`,
    }));
  };

  const filteredFields = fields.filter(field => 
    field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFieldSelected = (fieldName: string) => {
    return selectedFields[activeProfile].includes(fieldName);
  };

  const toggleField = (fieldName: string) => {
    setSelectedFields(prev => {
      const current = prev[activeProfile];
      const updated = current.includes(fieldName)
        ? current.filter(f => f !== fieldName)
        : [...current, fieldName];
      
      return {
        ...prev,
        [activeProfile]: updated,
      };
    });
  };

  const handleResetToDefault = () => {
    setSelectedFields({
      light: DEFAULT_LIGHT_FIELDS,
      extended: DEFAULT_EXTENDED_FIELDS,
    });
    toast({
      title: "Reset to defaults",
      description: "Extraction profiles have been reset to default values.",
    });
  };

  const handleSave = () => {
    onSave(selectedFields);
    onOpenChange(false);
    toast({
      title: "Profiles saved",
      description: "Extraction profiles have been saved successfully.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Configure Extraction Profiles</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-full">
          {/* Left Panel */}
          <div className="w-64 space-y-6 flex-shrink-0">
            <div>
              <Label className="text-sm font-semibold mb-3 block">Profile</Label>
              <Tabs value={activeProfile} onValueChange={(v) => setActiveProfile(v as 'light' | 'extended')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="light">Light</TabsTrigger>
                  <TabsTrigger value="extended">Extended</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div>
              <Label htmlFor="search" className="text-sm font-semibold mb-2 block">
                Search Fields
              </Label>
              <Input
                id="search"
                placeholder="e.g., subject, priority"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Select fields to include in the data extraction from FreshService.
              </p>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 flex flex-col min-h-[500px]">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {filteredFields.map((field) => (
                    <div key={field.name} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <Checkbox
                        id={field.name}
                        checked={isFieldSelected(field.name)}
                        onCheckedChange={() => toggleField(field.name)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={field.name}
                          className="text-sm font-medium cursor-pointer block"
                        >
                          {field.label}
                          {field.required && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (required)
                            </span>
                          )}
                        </Label>
                        {field.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {field.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-6 mt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetToDefault}
              >
                Reset to Default
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};