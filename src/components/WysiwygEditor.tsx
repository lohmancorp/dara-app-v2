import { useRef, useEffect, useState } from "react";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Link, ExternalLink, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [editingLink, setEditingLink] = useState<HTMLAnchorElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; link: HTMLAnchorElement } | null>(null);
  const savedSelection = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelection.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (savedSelection.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedSelection.current);
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

  const handleCreateLink = () => {
    saveSelection();
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "";
    
    setLinkText(selectedText);
    setLinkUrl("");
    setEditingLink(null);
    setShowLinkDialog(true);
  };

  const handleEditLink = (link: HTMLAnchorElement) => {
    setLinkText(link.textContent || "");
    setLinkUrl(link.href);
    setEditingLink(link);
    setShowLinkDialog(true);
    setContextMenu(null);
  };

  const handleSaveLink = () => {
    if (!linkUrl) return;

    restoreSelection();
    
    if (editingLink) {
      editingLink.href = linkUrl;
      editingLink.textContent = linkText;
    } else {
      const selection = window.getSelection();
      if (selection && savedSelection.current) {
        selection.removeAllRanges();
        selection.addRange(savedSelection.current);
        
        if (selection.toString()) {
          document.execCommand("createLink", false, linkUrl);
        } else {
          const link = document.createElement("a");
          link.href = linkUrl;
          link.textContent = linkText;
          link.target = "_blank";
          savedSelection.current.insertNode(link);
        }
      }
    }

    setShowLinkDialog(false);
    setLinkText("");
    setLinkUrl("");
    setEditingLink(null);
    handleInput();
    editorRef.current?.focus();
  };

  const handleRemoveLink = (link: HTMLAnchorElement) => {
    const text = document.createTextNode(link.textContent || "");
    link.parentNode?.replaceChild(text, link);
    setContextMenu(null);
    handleInput();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    
    if (link && editorRef.current?.contains(link)) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, link: link as HTMLAnchorElement });
    }
  };

  const execCommand = (command: string, value?: string) => {
    if (command === "createLink") {
      handleCreateLink();
      return;
    }
    
    document.execCommand(command, false, value);
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
        onContextMenu={handleContextMenu}
        className={cn(
          "min-h-[200px] resize-y overflow-auto w-full rounded-b-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !value && "text-muted-foreground",
          className
        )}
        style={{ minHeight: "200px" }}
        data-placeholder={placeholder}
      />

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Link" : "Insert Link"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="linkText">Text</Label>
              <Input
                id="linkText"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Link text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkUrl">URL</Label>
              <Input
                id="linkUrl"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLink}>
              {editingLink ? "Update" : "Insert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-popover border rounded-md shadow-lg py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left"
            onClick={() => {
              window.open(contextMenu.link.href, "_blank");
              setContextMenu(null);
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Open Link
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left"
            onClick={() => handleEditLink(contextMenu.link)}
          >
            <Edit className="h-4 w-4" />
            Edit Hyperlink
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left text-destructive"
            onClick={() => handleRemoveLink(contextMenu.link)}
          >
            <Trash className="h-4 w-4" />
            Remove Hyperlink
          </button>
        </div>
      )}
    </div>
  );
}