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
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";

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
  nested_fields?: FreshServiceField[];
  sections?: FreshServiceField[];
}

interface FieldGroup {
  name: string;
  fields: FreshServiceField[];
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
  const [fieldGroups, setFieldGroups] = useState<FieldGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Ticket Fields', 'Conversation Fields']));
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

      if (data?.success && data?.ticket_fields) {
        setFieldGroups([
          { name: 'Ticket Fields', fields: data.ticket_fields },
          { name: 'Conversation Fields', fields: data.conversation_fields || [] }
        ]);
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
      setFieldGroups([
        { name: 'Ticket Fields', fields: createDefaultFields() },
        { name: 'Conversation Fields', fields: [] }
      ]);
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

  const getAllFieldNames = (field: FreshServiceField): string[] => {
    const names = [field.name];
    if (field.nested_fields && field.nested_fields.length > 0) {
      field.nested_fields.forEach(nested => {
        names.push(...getAllFieldNames(nested));
      });
    }
    if (field.sections && field.sections.length > 0) {
      field.sections.forEach(section => {
        names.push(...getAllFieldNames(section));
      });
    }
    return names;
  };

  const isFieldSelected = (fieldName: string) => {
    return selectedFields[activeProfile].includes(fieldName);
  };

  const isGroupFullySelected = (field: FreshServiceField): boolean => {
    const allNames = getAllFieldNames(field);
    return allNames.every(name => isFieldSelected(name));
  };

  const isGroupPartiallySelected = (field: FreshServiceField): boolean => {
    const allNames = getAllFieldNames(field);
    const selectedCount = allNames.filter(name => isFieldSelected(name)).length;
    return selectedCount > 0 && selectedCount < allNames.length;
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

  const toggleGroup = (field: FreshServiceField) => {
    const allNames = getAllFieldNames(field);
    const isFullySelected = isGroupFullySelected(field);
    
    setSelectedFields(prev => {
      const current = prev[activeProfile];
      const updated = isFullySelected
        ? current.filter(f => !allNames.includes(f))
        : [...new Set([...current, ...allNames])];
      
      return {
        ...prev,
        [activeProfile]: updated,
      };
    });
  };

  const toggleGroupExpansion = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const filterFields = (fields: FreshServiceField[]): FreshServiceField[] => {
    if (!searchTerm) return fields;
    
    return fields.filter(field => {
      const matchesSearch = 
        field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const hasMatchingNested = field.nested_fields?.some(nested =>
        nested.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nested.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return matchesSearch || hasMatchingNested;
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

  const renderField = (field: FreshServiceField, depth: number = 0) => {
    const hasChildren = (field.nested_fields && field.nested_fields.length > 0) || 
                       (field.sections && field.sections.length > 0);
    const isExpanded = expandedGroups.has(field.name);
    const isFullySelected = hasChildren ? isGroupFullySelected(field) : isFieldSelected(field.name);
    const isPartiallySelected = hasChildren ? isGroupPartiallySelected(field) : false;

    return (
      <div key={field.name} style={{ paddingLeft: `${depth * 1.5}rem` }}>
        <div 
          className="grid grid-cols-[auto_1fr] gap-3 py-2 px-2 rounded hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => hasChildren ? toggleGroup(field) : toggleField(field.name)}
        >
          <div className="flex items-center justify-center">
            <Checkbox
              checked={isFullySelected}
              ref={(el) => {
                if (el) {
                  const input = el.querySelector('input');
                  if (input && isPartiallySelected) {
                    input.indeterminate = true;
                  }
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroupExpansion(field.name);
                  }}
                  className="flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              <p className="text-sm font-medium leading-tight">
                {field.label}
                {field.required && (
                  <span className="text-xs text-muted-foreground ml-2">(required)</span>
                )}
              </p>
            </div>
            {field.description && (
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                {field.description}
              </p>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {field.nested_fields?.map(nested => renderField(nested, depth + 1))}
            {field.sections?.map(section => renderField(section, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Configure Extraction Profiles</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0">
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
          <div className="flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
                  {fieldGroups.map((group) => {
                    const filteredGroupFields = filterFields(group.fields);
                    if (filteredGroupFields.length === 0) return null;

                    return (
                      <div key={group.name}>
                        <div className="flex items-center gap-2 mb-3">
                          <button
                            onClick={() => toggleGroupExpansion(group.name)}
                            className="flex items-center gap-2"
                          >
                            {expandedGroups.has(group.name) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                            <h3 className="text-base font-semibold">{group.name}</h3>
                          </button>
                        </div>
                        
                        {expandedGroups.has(group.name) && (
                          <div className="space-y-1">
                            {filteredGroupFields.map(field => renderField(field, 0))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-6 mt-6 border-t flex-shrink-0">
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