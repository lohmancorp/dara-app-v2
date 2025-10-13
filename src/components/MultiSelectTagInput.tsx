import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MultiSelectTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  options: string[];
  placeholder?: string;
  id?: string;
}

export const MultiSelectTagInput = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select options",
  id 
}: MultiSelectTagInputProps) => {
  const toggleTag = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background min-h-[42px]">
        {value.length > 0 ? (
          value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 h-6 text-xs py-0 px-2">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-[23px] h-[23px] flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Badge
            key={option}
            variant={value.includes(option) ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              value.includes(option) && "ring-2 ring-primary ring-offset-2"
            )}
            onClick={() => toggleTag(option)}
          >
            {option}
          </Badge>
        ))}
      </div>
    </div>
  );
};
