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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES } from "@/data/languages";
import { useTranslation } from "@/contexts/TranslationContext";

interface Language {
  code: string;
  name: string;
}

interface LanguageComboboxProps {
  value?: string;
  onSelect: (language: Language) => void;
  className?: string;
}

const STORAGE_KEY = "ui.lang";

export function LanguageCombobox({ value, onSelect, className }: LanguageComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [languages, setLanguages] = React.useState<Language[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const { toast } = useToast();
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxRef = React.useRef<HTMLDivElement>(null);

  // Load languages on mount
  React.useEffect(() => {
    const loadLanguages = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-languages');
        
        if (error) {
          console.warn('API error, using fallback languages:', error);
          setLanguages(LANGUAGES);
        } else if (data?.languages && data.languages.length > 0) {
          setLanguages(data.languages);
        } else {
          console.log('No languages from API, using fallback');
          setLanguages(LANGUAGES);
        }
        
        // Load saved language from localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && !value) {
          try {
            const savedLang = JSON.parse(saved);
            onSelect(savedLang);
          } catch (e) {
            console.error('Failed to parse saved language:', e);
          }
        }
      } catch (error) {
        console.error('Failed to load languages, using fallback:', error);
        setLanguages(LANGUAGES);
      } finally {
        setLoading(false);
      }
    };

    loadLanguages();
  }, [toast, onSelect, value]);

  // Filter languages based on search
  const filteredLanguages = React.useMemo(() => {
    if (!search) return languages;
    const lowerSearch = search.toLowerCase();
    return languages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(lowerSearch) ||
        lang.code.toLowerCase().includes(lowerSearch)
    );
  }, [languages, search]);

  // Reset active index when filtered list changes
  React.useEffect(() => {
    setActiveIndex(0);
  }, [filteredLanguages]);

  // Get display name for selected language
  const selectedLanguage = React.useMemo(() => {
    return languages.find((lang) => lang.code === value);
  }, [languages, value]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filteredLanguages.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredLanguages[activeIndex]) {
          handleSelect(filteredLanguages[activeIndex]);
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

  const handleSelect = (language: Language) => {
    onSelect(language);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(language));
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
          aria-controls="language-listbox"
          aria-label="Select language"
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {loading ? t("loading.languages") : selectedLanguage?.name || t("placeholder.selectLanguage")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          <Input
            ref={inputRef}
            placeholder={t("placeholder.searchLanguages")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 border-0 bg-transparent p-0 focus-visible:ring-0"
            aria-label={t("placeholder.searchLanguages")}
            aria-autocomplete="list"
            aria-controls="language-listbox"
            aria-activedescendant={
              filteredLanguages[activeIndex]
                ? `language-${filteredLanguages[activeIndex].code}`
                : undefined
            }
          />
        </div>
        <ScrollArea className="h-[300px]">
          <div
            ref={listboxRef}
            role="listbox"
            id="language-listbox"
            aria-label="Available languages"
            className="p-1"
          >
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("loading.languages")}
              </div>
            ) : filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("noResults.languages")}
              </div>
            ) : (
              filteredLanguages.map((language, index) => (
                <button
                  key={language.code}
                  role="option"
                  id={`language-${language.code}`}
                  aria-selected={language.code === value}
                  data-index={index}
                  onClick={() => handleSelect(language)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                    index === activeIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                    language.code === value && "bg-accent/30"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      language.code === value ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{language.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {language.code}
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
