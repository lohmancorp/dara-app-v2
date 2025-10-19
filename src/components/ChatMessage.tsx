import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import daraLogo from "@/assets/dara-logo.png";
import { SortableMarkdownTable } from "./SortableMarkdownTable";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  userAvatarUrl?: string;
  ticketBaseUrl?: string;
}

export const ChatMessage = ({ role, content, isStreaming, userAvatarUrl, ticketBaseUrl }: ChatMessageProps) => {
  const isUser = role === 'user';

  // Parse markdown tables for sortable rendering
  const parseMarkdownTable = (markdown: string) => {
    const lines = markdown.split('\n');
    const tables: { start: number; end: number; headers: string[]; rows: string[][] }[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && lines[i + 1]?.includes('---')) {
        const headers = line.split('|').filter(h => h.trim()).map(h => h.trim());
        const rows: string[][] = [];
        let j = i + 2;
        
        while (j < lines.length && lines[j].trim().startsWith('|')) {
          const cells = lines[j].split('|').filter(c => c.trim()).map(c => c.trim());
          rows.push(cells);
          j++;
        }
        
        tables.push({ start: i, end: j - 1, headers, rows });
        i = j - 1;
      }
    }
    
    return tables;
  };

  const renderContentWithSortableTables = (markdown: string) => {
    const tables = parseMarkdownTable(markdown);
    
    if (tables.length === 0) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
            ul: ({ node, ...props }) => <ul className="my-4 ml-6 list-disc" {...props} />,
            ol: ({ node, ...props }) => <ol className="my-4 ml-6 list-decimal" {...props} />,
            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
            code: ({ node, inline, ...props }: any) => 
              inline ? (
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...props} />
              ) : (
                <code className="block rounded bg-muted p-4 font-mono text-sm overflow-x-auto" {...props} />
              ),
            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 mt-5" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2 mt-4" {...props} />,
            strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
            em: ({ node, ...props }) => <em className="italic" {...props} />,
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-muted pl-4 italic my-4" {...props} />
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      );
    }

    // Split content and render tables separately
    const lines = markdown.split('\n');
    const elements: JSX.Element[] = [];
    let currentText = '';
    let lineIndex = 0;
    
    tables.forEach((table, tableIndex) => {
      // Add text before table
      while (lineIndex < table.start) {
        currentText += lines[lineIndex] + '\n';
        lineIndex++;
      }
      
      if (currentText.trim()) {
        elements.push(
          <div key={`text-${tableIndex}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                ul: ({ node, ...props }) => <ul className="my-4 ml-6 list-disc" {...props} />,
                ol: ({ node, ...props }) => <ol className="my-4 ml-6 list-decimal" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                code: ({ node, inline, ...props }: any) => 
                  inline ? (
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...props} />
                  ) : (
                    <code className="block rounded bg-muted p-4 font-mono text-sm overflow-x-auto" {...props} />
                  ),
                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 mt-5" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2 mt-4" {...props} />,
              }}
            >
              {currentText}
            </ReactMarkdown>
          </div>
        );
        currentText = '';
      }
      
      // Add sortable table
      elements.push(
        <SortableMarkdownTable
          key={`table-${tableIndex}`}
          headers={table.headers}
          rows={table.rows}
          ticketBaseUrl={ticketBaseUrl}
        />
      );
      
      lineIndex = table.end + 1;
    });
    
    // Add remaining text
    while (lineIndex < lines.length) {
      currentText += lines[lineIndex] + '\n';
      lineIndex++;
    }
    
    if (currentText.trim()) {
      elements.push(
        <div key="text-final">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentText}</ReactMarkdown>
        </div>
      );
    }
    
    return <>{elements}</>;
  };

  return (
    <div
      className={cn(
        "flex gap-4 p-4 sm:p-6",
        isUser ? "flex-row-reverse" : ""
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-lg overflow-hidden",
          isUser ? "bg-primary" : "bg-muted"
        )}
      >
        {isUser ? (
          userAvatarUrl ? (
            <img src={userAvatarUrl} alt="User" className="h-full w-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-primary-foreground" />
          )
        ) : (
          <img src={daraLogo} alt="D.A.R.A." className="h-full w-full object-cover" />
        )}
      </div>
      <div className={cn(
        "flex-1 space-y-2 overflow-hidden rounded-lg p-4",
        isUser ? "bg-muted/50 text-left" : ""
      )}>
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          {isStreaming && !content ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Thinking</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : (
            <TooltipProvider>
              {renderContentWithSortableTables(content)}
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
};
