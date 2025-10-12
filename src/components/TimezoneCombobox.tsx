import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TIMEZONES } from "@/data/timezones";

interface TimezoneOption {
  value: string;
  label: string;
}

interface TimezoneComboboxProps {
  value?: string;
  onSelect: (timezone: string) => void;
  className?: string;
}

const STORAGE_KEY = "ui.tz";

// Get timezones from Intl API or fallback to static list
const getTimezones = (): TimezoneOption[] => {
  try {
    // Try modern Intl.supportedValuesOf
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      const zones = (Intl as any).supportedValuesOf("timeZone") as string[];
      return zones.map((zone) => ({
        value: zone,
        label: formatTimezoneLabel(zone),
      }));
    }
  } catch (e) {
    console.log("Intl.supportedValuesOf not available, using static list");
  }

  // Fallback to static list
  return TIMEZONES;
};

// Format timezone value to readable label
const formatTimezoneLabel = (zone: string): string => {
  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value || "";
    
    const city = zone.split("/").pop()?.replace(/_/g, " ") || zone;
    return `${offset} ${city}`;
  } catch {
    return zone.replace(/_/g, " ");
  }
};

export function TimezoneCombobox({ value, onSelect, className }: TimezoneComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [timezones] = React.useState<TimezoneOption[]>(getTimezones());
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxRef = React.useRef<HTMLDivElement>(null);

  // Load saved timezone from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && !value) {
      onSelect(saved);
    }
  }, [onSelect, value]);

  // Filter timezones based on search
  const filteredTimezones = React.useMemo(() => {
    if (!search) return timezones;
    const lowerSearch = search.toLowerCase();
    return timezones.filter(
      (tz) =>
        tz.label.toLowerCase().includes(lowerSearch) ||
        tz.value.toLowerCase().includes(lowerSearch)
    );
  }, [timezones, search]);

  // Reset active index when filtered list changes
  React.useEffect(() => {
    setActiveIndex(0);
  }, [filteredTimezones]);

  // Get display label for selected timezone
  const selectedLabel = React.useMemo(() => {
    const selected = timezones.find((tz) => tz.value === value);
    return selected?.label || value;
  }, [timezones, value]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filteredTimezones.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredTimezones[activeIndex]) {
          handleSelect(filteredTimezones[activeIndex].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  // Scroll active item into view
  React.useEffect(() => {
    if (open && listboxRef.current) {
      const activeElement = listboxRef.current.querySelector(
        `[data-index="${activeIndex}"]`
      );
      activeElement?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  const handleSelect = (timezone: string) => {
    onSelect(timezone);
    localStorage.setItem(STORAGE_KEY, timezone);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls="timezone-listbox"
          aria-label="Select timezone"
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {selectedLabel || "Select timezone..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          <Input
            ref={inputRef}
            placeholder="Search timezones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 border-0 bg-transparent p-0 focus-visible:ring-0"
            aria-label="Search timezones"
            aria-autocomplete="list"
            aria-controls="timezone-listbox"
            aria-activedescendant={
              filteredTimezones[activeIndex]
                ? `timezone-${filteredTimezones[activeIndex].value.replace(/\//g, "-")}`
                : undefined
            }
          />
        </div>
        <ScrollArea className="h-[300px]">
          <div
            ref={listboxRef}
            role="listbox"
            id="timezone-listbox"
            aria-label="Available timezones"
            className="p-1"
          >
            {filteredTimezones.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No timezones found.
              </div>
            ) : (
              filteredTimezones.map((timezone, index) => (
                <button
                  key={timezone.value}
                  role="option"
                  id={`timezone-${timezone.value.replace(/\//g, "-")}`}
                  aria-selected={timezone.value === value}
                  data-index={index}
                  onClick={() => handleSelect(timezone.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                    index === activeIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                    timezone.value === value && "bg-accent/30"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      timezone.value === value ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{timezone.label}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
