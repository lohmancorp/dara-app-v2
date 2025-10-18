import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export const ChatMessage = ({ role, content, isStreaming }: ChatMessageProps) => {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        "flex gap-4 p-4 sm:p-6",
        isUser ? "bg-muted/30" : "bg-background"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          {isStreaming && !content ? (
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <ReactMarkdown
              components={{
                table: ({ node, ...props }) => (
                  <div className="my-4 w-full overflow-x-auto rounded-md border">
                    <Table className="w-full" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => <TableHeader {...props} />,
                tbody: ({ node, ...props }) => <TableBody {...props} />,
                tr: ({ node, ...props }) => <TableRow {...props} />,
                th: ({ node, ...props }) => (
                  <TableHead className="font-semibold whitespace-nowrap" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <TableCell className="max-w-[300px] truncate" {...props} />
                ),
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
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
};
