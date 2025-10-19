import { MessageSquare, Send, User, Trash2 } from "lucide-react";
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
import { useLocation } from "react-router-dom";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  jobId?: string;
  jobStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  jobProgress?: number;
  jobProgressMessage?: string;
}

const Chat = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { setAdvancedControls } = useFloatingAction();
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from localStorage on init
    const stored = localStorage.getItem('chat-messages');
    return stored ? JSON.parse(stored) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session, user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');
  const [ticketBaseUrl, setTicketBaseUrl] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const mouseStartPos = useRef<{ x: number; y: number } | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const jobLoadedRef = useRef<boolean>(false);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chat-messages', JSON.stringify(messages));
  }, [messages]);

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

  // Handle incoming job from Jobs page
  useEffect(() => {
    const loadJobFromState = async () => {
      const state = location.state as { jobId?: string; jobQuery?: string };
      if (!state?.jobId || !session || jobLoadedRef.current) return;
      
      jobLoadedRef.current = true;
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-chat-job-status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ jobId: state.jobId }),
          }
        );

        if (response.ok) {
          const jobData = await response.json();
          
          // Check if this job is already in messages
          const existingJobMessage = messages.findIndex(m => m.jobId === state.jobId);
          
          if (existingJobMessage === -1) {
            // Add user message with the original query
            const userMessage: Message = {
              role: 'user',
              content: state.jobQuery || jobData.query || 'Previous query',
            };

            // Add assistant message with job status
            const assistantMessage: Message = {
              role: 'assistant',
              content: jobData.status === 'completed' 
                ? jobData.result || 'Job completed successfully'
                : jobData.status === 'failed'
                ? `Job failed: ${jobData.error || 'Unknown error'}`
                : 'Job is processing in the background...',
              jobId: state.jobId,
              jobStatus: jobData.status,
              jobProgress: jobData.progress || 0,
              jobProgressMessage: jobData.progress_message,
            };

            setMessages((prev) => [...prev, userMessage, assistantMessage]);
          }

          // Start polling if job is still running
          if (jobData.status === 'running' || jobData.status === 'pending') {
            const messageIndex = messages.length + 1;
            pollJobStatus(state.jobId, messageIndex);
          }
        }
      } catch (error) {
        console.error('Error loading job:', error);
        toast({
          title: "Error",
          description: "Failed to load job details",
          variant: "destructive",
        });
      }
    };

    loadJobFromState();
  }, [location.state, session, toast]);

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
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      // Clean up all polling intervals
      pollingIntervalsRef.current.forEach(interval => clearInterval(interval));
      pollingIntervalsRef.current.clear();
    };
  }, []);

  const pollJobStatus = async (jobId: string, messageIndex: number) => {
    // Clear any existing interval for this job
    const existingInterval = pollingIntervalsRef.current.get(jobId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-chat-job-status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ jobId }),
          }
        );

        if (response.ok) {
          const jobData = await response.json();
          
          setMessages((prev) => {
            const newMessages = [...prev];
            if (newMessages[messageIndex]) {
              newMessages[messageIndex] = {
                ...newMessages[messageIndex],
                jobStatus: jobData.status,
                jobProgress: jobData.progress,
                jobProgressMessage: jobData.progress_message,
              };

              // If completed, add results to content
              if (jobData.status === 'completed' && jobData.result) {
                const tickets = jobData.result.tickets || [];
                const total = jobData.result.total || 0;
                
                // Generate markdown table
                let tableContent = `Found ${total} tickets:\n\n`;
                tableContent += '| Ticket ID | Company | Subject | Priority | Status | created_at | updated_at | type | escalated | module | score | ticket_type |\n';
                tableContent += '|-----------|---------|---------|----------|--------|------------|------------|------|-----------|--------|-------|-------------|\n';
                
                tickets.forEach((ticket: any) => {
                  tableContent += `| ${ticket.id} | ${ticket.company} | ${ticket.subject} | ${ticket.priority} | ${ticket.status} | ${ticket.created_at} | ${ticket.updated_at} | ${ticket.type} | ${ticket.escalated} | ${ticket.module} | ${ticket.score} | ${ticket.ticket_type} |\n`;
                });

                newMessages[messageIndex].content = tableContent;
              } else if (jobData.status === 'failed') {
                newMessages[messageIndex].content = `Job failed: ${jobData.error || 'Unknown error'}`;
              }
            }
            return newMessages;
          });

          // Stop polling if job is done
          if (jobData.status === 'completed' || jobData.status === 'failed') {
            clearInterval(pollInterval);
            pollingIntervalsRef.current.delete(jobId);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000); // Poll every 2 seconds

    pollingIntervalsRef.current.set(jobId, pollInterval);
  };

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

      // Create an abort controller with 3 minute timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

      try {
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
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 504) {
            throw new Error('Request timed out. Try using more specific filters to narrow your search.');
          }
          const errorData = await response.json().catch(() => ({}));
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
            
            // Check for async job response
            if (parsed.async_job && parsed.job_id) {
              const jobId = parsed.job_id;
              const messageIndex = messages.length + 1; // +1 for the assistant message we just added
              
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: `Processing large query in background...\n\n${parsed.message || ''}\n\n${parsed.estimated_time || ''}`,
                  jobId,
                  jobStatus: 'pending',
                  jobProgress: 0
                };
                return newMessages;
              });

              // Start polling for job status
              pollJobStatus(jobId, messageIndex);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      
      let errorMessage = error.message || "Failed to send message";
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out after 3 minutes. Try using more specific filters to narrow your search (e.g., specific department, date range, or status).';
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('chat-messages');
    jobLoadedRef.current = false;
    toast({
      title: "Chat cleared",
      description: "All messages have been removed",
    });
  };

  return (
    <>
      <AdvancedPanel open={showAdvanced} onClose={() => setShowAdvanced(false)} />
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <PageHeader
          icon={MessageSquare}
          title="Research"
          description="Get learnings and outcomes from your research."
          action={
            messages.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Chat
              </Button>
            ) : undefined
          }
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
                      <div key={index}>
                        <ChatMessage
                          role={message.role}
                          content={message.content}
                          isStreaming={isLoading && index === messages.length - 1 && !message.content}
                          userAvatarUrl={userAvatarUrl}
                          ticketBaseUrl={ticketBaseUrl}
                        />
                        {message.jobId && message.jobStatus !== 'completed' && message.jobStatus !== 'failed' && (
                          <div className="mt-2 p-3 bg-muted rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                              <span className="text-sm font-medium">Processing in background</span>
                            </div>
                            {message.jobProgress !== undefined && (
                              <>
                                <div className="w-full bg-background rounded-full h-2 mb-1">
                                  <div 
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${message.jobProgress}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">{message.jobProgressMessage || `${message.jobProgress}% complete`}</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
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
