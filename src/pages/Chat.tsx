import { MessageSquare, Send, User, StopCircle } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
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
import { useLocation, useNavigate } from "react-router-dom";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session, user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const [hasActiveJob, setHasActiveJob] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Load session if coming from navigation state, or load the most recent session
  useEffect(() => {
    const initSession = async () => {
      if (!user?.id) return;

      // Check if we're loading an existing session from location state
      const stateSessionId = location.state?.sessionId;
      if (stateSessionId) {
        setSessionId(stateSessionId);
        await loadSession(stateSessionId);
        return;
      }

      // Load the most recent chat session for this user
      const { data: recentSession, error } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && recentSession) {
        setSessionId(recentSession.id);
        await loadSession(recentSession.id);
      }
    };

    initSession();
  }, [user?.id, location.state]);

  // Load session messages and check for stale jobs
  const loadSession = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const loadedMessages: Message[] = data.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      jobId: msg.job_id || undefined
    }));

    setMessages(loadedMessages);

    // Check for any jobs referenced in this session that might have completed
    await checkStaleJobs(sessionId);
  };

  // Check for completed jobs that weren't updated in the chat
  const checkStaleJobs = async (sessionId: string) => {
    if (!session?.access_token) return;

    try {
      // Get all jobs for this session
      const { data: jobs, error } = await supabase
        .from('chat_jobs')
        .select('id, status, progress, progress_message, result, error')
        .eq('chat_session_id', sessionId)
        .in('status', ['completed', 'failed']);

      if (error || !jobs || jobs.length === 0) return;

      // For each completed job, check if we need to update the message
      for (const job of jobs) {
        let tableContent: string | null = null;
        let failedContent: string | null = null;
        
        if (job.status === 'completed' && job.result) {
          const result = job.result as { tickets?: any[]; total?: number };
          const tickets = result.tickets || [];
          const total = result.total || 0;
          
          tableContent = `Found ${total} tickets:\n\n`;
          tableContent += '| Ticket ID | Company | Subject | Priority | Status | created_at | updated_at | type | escalated | module | score | ticket_type |\n';
          tableContent += '|-----------|---------|---------|----------|--------|------------|------------|------|-----------|--------|-------|-------------|\n';
          
          tickets.forEach((ticket: any) => {
            tableContent += `| ${ticket.id} | ${ticket.company} | ${ticket.subject} | ${ticket.priority} | ${ticket.status} | ${ticket.created_at} | ${ticket.updated_at} | ${ticket.type} | ${ticket.escalated} | ${ticket.module} | ${ticket.score} | ${ticket.ticket_type} |\n`;
          });
        } else if (job.status === 'failed') {
          failedContent = `Job failed: ${job.error || 'Unknown error'}`;
        }
        
        setMessages((prev) => {
          const jobMessageIndex = prev.findIndex(m => m.jobId === job.id);

          if (jobMessageIndex === -1) return prev;

          const newMessages = [...prev];
          
          if (tableContent) {
            newMessages[jobMessageIndex] = {
              ...newMessages[jobMessageIndex],
              content: tableContent,
              jobStatus: 'completed',
              jobProgress: 100
            };
          } else if (failedContent) {
            newMessages[jobMessageIndex] = {
              ...newMessages[jobMessageIndex],
              content: failedContent,
              jobStatus: 'failed'
            };
          }

          return newMessages;
        });
        
        // Update database with results
        if (tableContent) {
          await supabase
            .from('chat_messages')
            .update({ content: tableContent })
            .eq('job_id', job.id);
        } else if (failedContent) {
          await supabase
            .from('chat_messages')
            .update({ content: failedContent })
            .eq('job_id', job.id);
        }
      }
    } catch (error) {
      console.error('Error checking stale jobs:', error);
    }
  };

  // Check for active jobs
  useEffect(() => {
    const activeJob = messages.some(m => 
      m.jobId && (m.jobStatus === 'pending' || m.jobStatus === 'processing')
    );
    setHasActiveJob(activeJob || isLoading);
  }, [messages, isLoading]);

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
      const state = location.state as { jobId?: string; jobQuery?: string; sessionId?: string };
      if (!state?.jobId || !session || jobLoadedRef.current) return;
      
      jobLoadedRef.current = true;

      // If we have a sessionId, load the full chat first
      if (state.sessionId && state.sessionId !== sessionId) {
        setSessionId(state.sessionId);
        await loadSession(state.sessionId);
        
        // Scroll to the job message after a brief delay
        setTimeout(() => {
          const jobElement = document.querySelector(`[data-job-id="${state.jobId}"]`);
          if (jobElement) {
            jobElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
        return;
      }
      
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
          const existingJobIndex = messages.findIndex(m => m.jobId === state.jobId);
          
          if (existingJobIndex !== -1) {
            // Update existing message with completed results
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

              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[existingJobIndex] = {
                  ...newMessages[existingJobIndex],
                  content: tableContent,
                  jobStatus: 'completed',
                  jobProgress: 100
                };
                return newMessages;
              });

              toast({
                title: "Job Results Loaded",
                description: `Successfully loaded ${total} tickets`,
              });
            } else if (jobData.status === 'failed') {
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[existingJobIndex] = {
                  ...newMessages[existingJobIndex],
                  content: `Job failed: ${jobData.error || 'Unknown error'}`,
                  jobStatus: 'failed'
                };
                return newMessages;
              });
            }
          } else {
            // Add new messages for this job
            const userMessage: Message = {
              role: 'user',
              content: state.jobQuery || jobData.query || 'Previous query',
            };

            let assistantContent = '';
            if (jobData.status === 'completed' && jobData.result) {
              const tickets = jobData.result.tickets || [];
              const total = jobData.result.total || 0;
              
              assistantContent = `Found ${total} tickets:\n\n`;
              assistantContent += '| Ticket ID | Company | Subject | Priority | Status | created_at | updated_at | type | escalated | module | score | ticket_type |\n';
              assistantContent += '|-----------|---------|---------|----------|--------|------------|------------|------|-----------|--------|-------|-------------|\n';
              
              tickets.forEach((ticket: any) => {
                assistantContent += `| ${ticket.id} | ${ticket.company} | ${ticket.subject} | ${ticket.priority} | ${ticket.status} | ${ticket.created_at} | ${ticket.updated_at} | ${ticket.type} | ${ticket.escalated} | ${ticket.module} | ${ticket.score} | ${ticket.ticket_type} |\n`;
              });
            } else if (jobData.status === 'failed') {
              assistantContent = `Job failed: ${jobData.error || 'Unknown error'}`;
            } else {
              assistantContent = 'Job is processing in the background...';
            }

            const assistantMessage: Message = {
              role: 'assistant',
              content: assistantContent,
              jobId: state.jobId,
              jobStatus: jobData.status,
              jobProgress: jobData.progress || 0,
              jobProgressMessage: jobData.progress_message,
            };

            setMessages((prev) => [...prev, userMessage, assistantMessage]);
          }

          // Start polling if job is still running
          if (jobData.status === 'processing' || jobData.status === 'pending') {
            const messageIndex = messages.length + (existingJobIndex === -1 ? 1 : 0);
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

  const handleClearChat = useCallback(async () => {
    // Clear the UI state and session - new session will be created on next send
    setSessionId(null);
    setMessages([]);
    jobLoadedRef.current = false;
    
    // Clear location state to prevent reloading the old session
    navigate('/chat', { replace: true, state: {} });
    
    toast({
      title: "Chat cleared",
      description: "Started a new chat",
    });
  }, [toast, navigate]);

  useEffect(() => {
    setAdvancedControls({
      onClick: handleAdvancedClick,
      isPressed: showAdvanced,
      clearChatAction: messages.length > 0 ? {
        onClick: handleClearChat,
        label: "Clear Chat"
      } : undefined
    });
    return () => setAdvancedControls(null);
  }, [showAdvanced, setAdvancedControls, messages.length, handleClearChat]);

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
          
          // Prepare update data outside of setMessages
          let tableContent: string | null = null;
          let failedContent: string | null = null;
          
          if (jobData.status === 'completed' && jobData.result) {
            const tickets = jobData.result.tickets || [];
            const total = jobData.result.total || 0;
            
            // Generate markdown table
            tableContent = `Found ${total} tickets:\n\n`;
            tableContent += '| Ticket ID | Company | Subject | Priority | Status | created_at | updated_at | type | escalated | module | score | ticket_type |\n';
            tableContent += '|-----------|---------|---------|----------|--------|------------|------------|------|-----------|--------|-------|-------------|\n';
            
            tickets.forEach((ticket: any) => {
              tableContent += `| ${ticket.id} | ${ticket.company} | ${ticket.subject} | ${ticket.priority} | ${ticket.status} | ${ticket.created_at} | ${ticket.updated_at} | ${ticket.type} | ${ticket.escalated} | ${ticket.module} | ${ticket.score} | ${ticket.ticket_type} |\n`;
            });
          } else if (jobData.status === 'failed') {
            failedContent = `Job failed: ${jobData.error || 'Unknown error'}`;
          }
          
          setMessages((prev) => {
            const newMessages = [...prev];
            // Find the message with this jobId instead of using index
            const jobMessageIndex = newMessages.findIndex(m => m.jobId === jobId);
            
            if (jobMessageIndex !== -1) {
              newMessages[jobMessageIndex] = {
                ...newMessages[jobMessageIndex],
                jobStatus: jobData.status,
                jobProgress: jobData.progress,
                jobProgressMessage: jobData.progress_message,
              };

              // Update content if job is complete or failed
              if (tableContent) {
                newMessages[jobMessageIndex].content = tableContent;
              } else if (failedContent) {
                newMessages[jobMessageIndex].content = failedContent;
              }
            }
            return newMessages;
          });
          
          // Update database outside of setMessages
          if (tableContent) {
            await supabase
              .from('chat_messages')
              .update({ content: tableContent })
              .eq('job_id', jobId);
          } else if (failedContent) {
            await supabase
              .from('chat_messages')
              .update({ content: failedContent })
              .eq('job_id', jobId);
          }

          // Stop polling if job is done
          if (jobData.status === 'completed' || jobData.status === 'failed') {
            clearInterval(pollInterval);
            pollingIntervalsRef.current.delete(jobId);
            setIsLoading(false);
            setHasActiveJob(false);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000); // Poll every 2 seconds

    pollingIntervalsRef.current.set(jobId, pollInterval);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear all polling intervals
    pollingIntervalsRef.current.forEach(interval => clearInterval(interval));
    pollingIntervalsRef.current.clear();
    
    setIsLoading(false);
    setHasActiveJob(false);
    
    toast({
      title: "Stopped",
      description: "Request has been stopped",
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || hasActiveJob) return;

    const userMessage: Message = { role: 'user', content: input };
    const messageContent = input;
    
    setInput('');
    setIsTyping(false);
    setIsThinking(false);
    setIsLoading(true);
    setHasActiveJob(true);

    try {
      // Check if user is authenticated
      if (!session?.access_token || !user?.id) {
        throw new Error('Please log in to use the chat');
      }

      // Create session if this is the first message
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: 'New Chat' // Temporary title, will be updated after assistant responds
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating session:', error);
          throw new Error('Failed to create chat session');
        }

        currentSessionId = data.id;
        setSessionId(currentSessionId);
      }

      // Save user message to database
      const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSessionId,
          role: 'user',
          content: messageContent
        });

      if (userMsgError) {
        console.error('Error saving user message:', userMsgError);
      }

      // Update last_message_at
      await supabase
        .from('chat_sessions')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentSessionId);

      setMessages((prev) => [...prev, userMessage]);

      // Add assistant message placeholder
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      // Create an abort controller with 3 minute timeout
      const controller = new AbortController();
      abortControllerRef.current = controller;
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
              sessionId: currentSessionId,
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
              const messageIndex = messages.length + 1;
              
              assistantContent = parsed.message || `Processing large query in background...\n\nJob: ${parsed.job_name || jobId}\n\n${parsed.estimated_time || ''}`;
              
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                  jobId,
                  jobStatus: 'pending',
                  jobProgress: 0
                };
                return newMessages;
              });

              // Message is already created by the server, so just start polling
              pollJobStatus(jobId, messageIndex);
            }
          } catch (e) {
            console.error('Error parsing SSE:', e);
          }
        }
      }

      // Save final assistant message if not a job
      if (assistantContent && !messages[messages.length]?.jobId) {
        await supabase
          .from('chat_messages')
          .insert({
            session_id: currentSessionId,
            role: 'assistant',
            content: assistantContent
          });

        // Generate a meaningful title from the first exchange
        if (messages.length === 0) {
          // Use the first 60 characters of the user's message as title
          const title = messageContent.length > 60 
            ? messageContent.substring(0, 60).trim() + '...' 
            : messageContent.trim();
          
          await supabase
            .from('chat_sessions')
            .update({ title })
            .eq('id', currentSessionId);
        }
      }

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Don't show error if request was aborted by user
      if (error.name === 'AbortError' && !abortControllerRef.current) {
        return; // User stopped the request
      }
      
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
      abortControllerRef.current = null;
      setIsLoading(false);
      setHasActiveJob(false);
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
                      <div key={index}>
                        <ChatMessage
                          role={message.role}
                          content={message.content}
                          isStreaming={isLoading && index === messages.length - 1 && !message.content}
                          userAvatarUrl={userAvatarUrl}
                          ticketBaseUrl={ticketBaseUrl}
                          jobId={message.jobId}
                        />
                        {message.jobId && message.jobStatus !== 'completed' && message.jobStatus !== 'failed' && (
                          <div className="mt-2 p-3 bg-muted rounded-lg border border-border relative">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-sm font-medium">
                                  Processing in background: {message.jobProgress || 0}%
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  // Stop polling for this job
                                  if (message.jobId) {
                                    const interval = pollingIntervalsRef.current.get(message.jobId);
                                    if (interval) {
                                      clearInterval(interval);
                                      pollingIntervalsRef.current.delete(message.jobId);
                                    }
                                    
                                    // Update job in database
                                    await supabase
                                      .from('chat_jobs')
                                      .update({ 
                                        status: 'failed',
                                        error: 'Stopped by user',
                                        completed_at: new Date().toISOString()
                                      })
                                      .eq('id', message.jobId);
                                  }
                                  // Update message to show as stopped
                                  setMessages((prev) => {
                                    const newMessages = [...prev];
                                    newMessages[index] = {
                                      ...newMessages[index],
                                      jobStatus: 'failed',
                                      content: 'Job stopped by user'
                                    };
                                    return newMessages;
                                  });
                                  toast({
                                    title: "Job stopped",
                                    description: "Background processing has been stopped",
                                  });
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                <StopCircle className="h-3 w-3 mr-1" />
                                Stop
                              </Button>
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
                disabled={isLoading || hasActiveJob}
              />
              {isLoading || hasActiveJob ? (
                <Button 
                  size="icon" 
                  className="h-[60px] w-[60px] rounded-full flex-shrink-0" 
                  variant="destructive"
                  onClick={handleStop}
                >
                  <StopCircle className="h-6 w-6" />
                </Button>
              ) : (
                <Button 
                  size="icon" 
                  className="h-[60px] w-[60px] rounded-full flex-shrink-0" 
                  variant="accent"
                  onClick={handleSend}
                  disabled={!input.trim()}
                >
                  <Send className="h-6 w-6" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat;
