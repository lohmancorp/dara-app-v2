import { useRef, useEffect, useState } from "react";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export function WysiwygEditor({ value, onChange, onBlur, placeholder, className }: WysiwygEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeCommands, setActiveCommands] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const updateActiveCommands = () => {
    const commands = new Set<string>();
    if (document.queryCommandState("bold")) commands.add("bold");
    if (document.queryCommandState("italic")) commands.add("italic");
    if (document.queryCommandState("underline")) commands.add("underline");
    if (document.queryCommandState("strikethrough")) commands.add("strikethrough");
    if (document.queryCommandState("insertUnorderedList")) commands.add("insertUnorderedList");
    if (document.queryCommandState("insertOrderedList")) commands.add("insertOrderedList");
    setActiveCommands(commands);
  };

  const execCommand = (command: string, value?: string) => {
    if (command === "createLink") {
      const url = prompt("Enter URL:");
      if (url) {
        document.execCommand(command, false, url);
      }
    } else {
      document.execCommand(command, false, value);
    }
    editorRef.current?.focus();
    updateActiveCommands();
    handleInput();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1 p-1 border rounded-t-md bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("bold")}
          className={cn(
            "h-8 w-8 p-0",
            activeCommands.has("bold") && "bg-accent"
          )}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("italic")}
          className={cn(
            "h-8 w-8 p-0",
            activeCommands.has("italic") && "bg-accent"
          )}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("underline")}
          className={cn(
            "h-8 w-8 p-0",
            activeCommands.has("underline") && "bg-accent"
          )}
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("strikethrough")}
          className={cn(
            "h-8 w-8 p-0",
            activeCommands.has("strikethrough") && "bg-accent"
          )}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("insertUnorderedList")}
          className={cn(
            "h-8 w-8 p-0",
            activeCommands.has("insertUnorderedList") && "bg-accent"
          )}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("insertOrderedList")}
          className={cn(
            "h-8 w-8 p-0",
            activeCommands.has("insertOrderedList") && "bg-accent"
          )}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("createLink")}
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={onBlur}
        onFocus={updateActiveCommands}
        onMouseUp={updateActiveCommands}
        onKeyUp={updateActiveCommands}
        className={cn(
          "min-h-[200px] resize-y overflow-auto w-full rounded-b-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !value && "text-muted-foreground",
          className
        )}
        style={{ minHeight: "200px" }}
        data-placeholder={placeholder}
      />
    </div>
  );
}