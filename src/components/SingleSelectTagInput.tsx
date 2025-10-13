import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setShowDropdown(false);
    setSearchQuery("");
  };

  const handleRemove = () => {
    onChange("");
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div 
        className="flex flex-wrap gap-2 p-3 border rounded-md bg-background min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-ring"
        onClick={() => {
          setShowDropdown(true);
          inputRef.current?.focus();
        }}
      >
        {value && (
          <Badge variant="default" className="gap-1 h-6 text-xs py-0 px-2 bg-primary text-primary-foreground">
            {value}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="ml-1 hover:bg-primary-foreground/20 rounded-full w-[23px] h-[23px] flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder={!value ? placeholder : ""}
          className="flex-1 border-0 p-0 h-6 focus-visible:outline-none bg-transparent min-w-[120px] text-sm"
        />
        <ChevronDown className="h-4 w-4 text-muted-foreground self-center" />
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={cn(
                  "w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm transition-colors",
                  value === option && "bg-accent/50"
                )}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">No options found</div>
          )}
        </div>
      )}
    </div>
  );
};
