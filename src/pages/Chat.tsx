import { MessageSquare, Send, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdvancedPanel } from "@/components/AdvancedPanel";
import { PageHeader } from "@/components/PageHeader";
import { useFloatingAction } from "@/components/AppLayout";
import { ChatMessage } from "@/components/ChatMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Chat = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { setAdvancedControls } = useFloatingAction();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session, user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');
  const [ticketBaseUrl, setTicketBaseUrl] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const mouseStartPos = useRef<{ x: number; y: number } | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fetch user profile avatar
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data?.avatar_url) {
        setUserAvatarUrl(data.avatar_url);
      }
    };

    // Fetch connection for ticket base URL
    const fetchConnection = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('connections')
        .select('endpoint')
        .eq('user_id', user.id)
        .eq('connection_type', 'freshservice')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (data?.endpoint) {
        let endpoint = data.endpoint;
        if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
          endpoint = `https://${endpoint}`;
        }
        setTicketBaseUrl(endpoint);
      }
    };

    fetchUserProfile();
    fetchConnection();
  }, [user]);

  const handleAdvancedClick = () => {
    setShowAdvanced((prev) => !prev);
  };

  useEffect(() => {
    setAdvancedControls({
      onClick: handleAdvancedClick,
      isPressed: showAdvanced,
    });
    return () => setAdvancedControls(null);
  }, [showAdvanced, setAdvancedControls]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (mouseStartPos.current) {
        const deltaX = Math.abs(e.clientX - mouseStartPos.current.x);
        const deltaY = Math.abs(e.clientY - mouseStartPos.current.y);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > 100) {
          setIsTyping(false);
          setIsThinking(false);
          setIsFocused(false);
          mouseStartPos.current = null;
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(false);
    setIsThinking(false);
    setIsLoading(true);

    try {
      // Check if user is authenticated
      if (!session?.access_token) {
        throw new Error('Please log in to use the chat');
      }

      // Add assistant message placeholder
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            }))
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent
                };
                return newMessages;
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      // Remove the empty assistant message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <AdvancedPanel open={showAdvanced} onClose={() => setShowAdvanced(false)} />
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <PageHeader
          icon={MessageSquare}
          title="Research"
          description="Get learnings and outcomes from your research."
        />

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-0">
            <div className="flex-1 border-l border-r border-border flex flex-col min-h-0">
              <ScrollArea className="flex-1 h-full">
                {messages.length === 0 ? (
                  <div className="p-4 sm:p-6 h-full flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-md">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                        <p className="text-muted-foreground text-sm">
                          Ask me to search for tickets from your FreshService connections.
                        </p>
                        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                          <p className="font-medium">Try asking:</p>
                          <ul className="space-y-1 text-left">
                            <li>• "Show me open tickets for Engineering"</li>
                            <li>• "List all pending tickets for Sales"</li>
                            <li>• "What tickets are waiting on customers?"</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {messages.map((message, index) => (
                      <ChatMessage
                        key={index}
                        role={message.role}
                        content={message.content}
                        isStreaming={isLoading && index === messages.length - 1 && !message.content}
                        userAvatarUrl={userAvatarUrl}
                        ticketBaseUrl={ticketBaseUrl}
                      />
                    ))}
                    {(isTyping || isThinking) && !isLoading && (
                      <div className="flex gap-4 p-4 sm:p-6 pr-[20px] justify-end">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{isTyping ? 'Typing' : 'Thinking'}</span>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                          <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-lg overflow-hidden bg-primary">
                            {userAvatarUrl ? (
                              <img src={userAvatarUrl} alt="User" className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-5 w-5 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background flex-shrink-0">
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex gap-3 items-end pl-[10px]">
              <Textarea
                placeholder="Ask about tickets from your FreshService connections..."
                className="min-h-[60px] resize-none flex-1"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const hasContent = e.target.value.length > 0;
                  
                  // Clear existing timeout first
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = null;
                  }
                  
                  // Update states based on content (field must be focused to type)
                  if (hasContent) {
                    setIsTyping(true);
                    setIsThinking(false);
                    
                    // Set timeout to switch to thinking after 2 seconds of no typing
                    typingTimeoutRef.current = setTimeout(() => {
                      setIsTyping(false);
                      setIsThinking(true);
                    }, 2000);
                  } else {
                    setIsTyping(false);
                    setIsThinking(false);
                  }
                }}
                onFocus={(e) => {
                  setIsFocused(true);
                  mouseStartPos.current = { x: 0, y: 0 };
                  
                  // Clear any existing timeout
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = null;
                  }
                  
                  if (e.target.value.length > 0) {
                    setIsTyping(true);
                    setIsThinking(false);
                    
                    // Start timeout to switch to thinking
                    typingTimeoutRef.current = setTimeout(() => {
                      setIsTyping(false);
                      setIsThinking(true);
                    }, 2000);
                  }
                }}
                onBlur={() => {
                  setIsFocused(false);
                  setIsTyping(false);
                  setIsThinking(false);
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <Button 
                size="icon" 
                className="h-[60px] w-[60px] rounded-full flex-shrink-0" 
                variant="accent"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat;
