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
  jobId?: string;
  previousUserMessage?: string;
}

export const ChatMessage = ({ role, content, isStreaming, userAvatarUrl, ticketBaseUrl, jobId, previousUserMessage }: ChatMessageProps) => {
  const isUser = role === 'user';
  
  // Detect rejection/limitation messages and append contact information
  const isRejectionMessage = !isUser && (
    content.includes('I cannot') ||
    content.includes('I am sorry') ||
    content.includes('not supported') ||
    content.includes("I can't") ||
    content.includes('I am unable') ||
    content.toLowerCase().includes('i cannot')
  );
  
  // Create email link with prefilled content
  const createContactEmailLink = () => {
    const email = 'taylor.m.giddens@gmail.com';
    const subject = 'DARA Feature Feedback';
    const body = `User Query:\n${previousUserMessage || '[Your query]'}\n\nYour Reply:\n\n`;
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  // Append contact info if it's a rejection message
  const displayContent = isRejectionMessage && content
    ? `${content}\n\nIf you would like to add support for this, please contact my creator, [Taylor Giddens](${createContactEmailLink()}).`
    : content;

  // Parse markdown tables for sortable rendering
  const parseMarkdownTable = (markdown: string) => {
    const lines = markdown.split('\n');
    const tables: { start: number; end: number; headers: string[]; rows: string[][] }[] = [];
    
    // Helper function to split table row by pipes, handling escaped pipes
    const splitTableRow = (line: string): string[] => {
      // First, replace escaped pipes with a placeholder
      const placeholder = '\u0000ESCAPED_PIPE\u0000';
      const processedLine = line.replace(/\\\|/g, placeholder);
      
      // Split by unescaped pipes
      const cells = processedLine.split('|')
        .filter(c => c.trim())
        .map(c => {
          // Restore escaped pipes and clean up
          let cell = c.replace(new RegExp(placeholder, 'g'), '|');
          // Remove trailing backslashes that were used for escaping
          cell = cell.replace(/\\\s*$/, '').trim();
          return cell;
        });
      
      return cells;
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && lines[i + 1]?.includes('---')) {
        const headers = splitTableRow(line);
        const rows: string[][] = [];
        let j = i + 2;
        
        while (j < lines.length && lines[j].trim().startsWith('|')) {
          const cells = splitTableRow(lines[j]);
          // Only add row if it has the same number of cells as headers
          if (cells.length === headers.length) {
            rows.push(cells);
          }
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
      data-job-id={jobId}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 select-none items-center justify-center overflow-hidden",
          isUser ? "bg-primary rounded-full" : "bg-muted rounded-lg"
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
              {renderContentWithSortableTables(displayContent)}
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
};
