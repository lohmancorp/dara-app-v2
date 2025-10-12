import { X, RotateCcw, Save, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useAdvancedStore, AdvancedControl } from "@/store/advancedStore";
import advancedSchema from "../../advanced-controls.schema.json";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdvancedPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AdvancedPanel({ open, onClose }: AdvancedPanelProps) {
  const { values, setValue, resetToDefaults, presets, savePreset, loadPreset, deletePreset } = useAdvancedStore();
  const [presetName, setPresetName] = useState("");
  const [showPresetInput, setShowPresetInput] = useState(false);

  const schema = advancedSchema as AdvancedControl[];
  
  // Group controls by section
  const sections = schema.reduce((acc, control) => {
    if (!acc[control.section]) {
      acc[control.section] = [];
    }
    acc[control.section].push(control);
    return acc;
  }, {} as Record<string, AdvancedControl[]>);

  // Check if control should be visible based on dependencies
  const isVisible = (control: AdvancedControl) => {
    if (!control.dependsOn) return true;
    return values[control.dependsOn] === true;
  };

  const renderControl = (control: AdvancedControl) => {
    if (!isVisible(control)) return null;

    const value = values[control.id] ?? control.default;

    return (
      <div key={control.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Label 
                htmlFor={control.id} 
                className="text-sm font-medium cursor-help"
              >
                {control.label}
              </Label>
            </HoverCardTrigger>
            {control.help && (
              <HoverCardContent className="w-80 bg-popover" side="left">
                <p className="text-sm text-muted-foreground">{control.help}</p>
              </HoverCardContent>
            )}
          </HoverCard>
          
          {control.type === 'slider' && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {value}
            </span>
          )}
        </div>

        {control.type === 'slider' && (
          <Slider
            id={control.id}
            min={control.min}
            max={control.max}
            step={control.step}
            value={[value]}
            onValueChange={(vals) => setValue(control.id, vals[0])}
            className="w-full"
            aria-label={control.label}
            aria-describedby={`${control.id}-help`}
          />
        )}

        {control.type === 'switch' && (
          <Switch
            id={control.id}
            checked={value}
            onCheckedChange={(checked) => setValue(control.id, checked)}
            aria-label={control.label}
            aria-describedby={`${control.id}-help`}
          />
        )}

        {control.type === 'select' && control.options && (
          <Select value={value} onValueChange={(val) => setValue(control.id, val)}>
            <SelectTrigger 
              id={control.id} 
              className="w-full"
              aria-label={control.label}
              aria-describedby={`${control.id}-help`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {control.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {control.type === 'textarea' && (
          <Textarea
            id={control.id}
            value={value}
            onChange={(e) => setValue(control.id, e.target.value)}
            className="min-h-[100px] resize-none"
            aria-label={control.label}
            aria-describedby={`${control.id}-help`}
          />
        )}
      </div>
    );
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      savePreset(presetName);
      setPresetName("");
      setShowPresetInput(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent 
        side="right" 
        className="w-[400px] sm:w-[500px] p-0 flex flex-col"
        aria-labelledby="advanced-panel-title"
        aria-describedby="advanced-panel-description"
      >
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle id="advanced-panel-title">Advanced Settings</SheetTitle>
              <SheetDescription id="advanced-panel-description">
                Fine-tune AI behavior and generation parameters
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full h-10 w-10 flex items-center justify-center"
              aria-label="Close advanced panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="px-6 py-3 border-b flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <FolderOpen className="h-4 w-4 mr-2" />
                Load Preset
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover">
              {Object.keys(presets).map((name) => (
                <DropdownMenuItem
                  key={name}
                  onClick={() => loadPreset(name)}
                  className="flex justify-between"
                >
                  <span>{name}</span>
                  {!['Creative', 'Precise', 'Balanced'].includes(name) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePreset(name);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPresetInput(!showPresetInput)}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            aria-label="Reset all values to defaults"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {showPresetInput && (
          <div className="px-6 py-3 border-b flex gap-2">
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
            />
            <Button size="sm" onClick={handleSavePreset}>
              Save
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {Object.entries(sections).map(([section, controls], idx) => (
              <div key={section}>
                {idx > 0 && <Separator className="my-4" />}
                <h3 className="text-sm font-semibold mb-4">{section}</h3>
                <div className="space-y-4">
                  {controls.map(renderControl)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
