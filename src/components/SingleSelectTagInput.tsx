import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SingleSelectTagInputProps {
  value: string;
  onChange: (tag: string) => void;
  options: string[];
  placeholder?: string;
  id?: string;
}

export const SingleSelectTagInput = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select an option",
  id 
}: SingleSelectTagInputProps) => {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background min-h-[42px]">
        {value ? (
          <Badge variant="default" className="gap-1 h-6 text-xs py-0 px-2">
            {value}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Badge
            key={option}
            variant={value === option ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              value === option && "ring-2 ring-primary ring-offset-2"
            )}
            onClick={() => onChange(option)}
          >
            {option}
          </Badge>
        ))}
      </div>
    </div>
  );
};
