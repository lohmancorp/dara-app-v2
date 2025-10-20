import { Library as LibraryIcon, Search, MessageSquare, Clock, Trash2, ArrowUp, ArrowDown, X, Pencil, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFloatingAction } from "@/components/AppLayout";
import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

type SortField = "title" | "created_at" | "last_message_at";
type SortDirection = "asc" | "desc";

const Library = () => {
  const { setActionButton } = useFloatingAction();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("last_message_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setActionButton(null);
    return () => setActionButton(null);
  }, [setActionButton]);

  useEffect(() => {
    loadSessions();
  }, [user?.id]);

  const loadSessions = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat sessions",
        variant: "destructive",
      });
    } else {
      setSessions(data || []);
    }
    setIsLoading(false);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this chat session?')) {
      return;
    }

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete chat session",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Chat session deleted successfully",
      });
      loadSessions();
    }
  };

  const handleStartEdit = (sessionId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = async (sessionId: string) => {
    if (!editingTitle.trim()) {
      toast({
        title: "Error",
        description: "Title cannot be empty",
        variant: "destructive",
      });
      setEditingSessionId(null);
      return;
    }

    const { error } = await supabase
      .from('chat_sessions')
      .update({ title: editingTitle.trim() })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating title:', error);
      toast({
        title: "Error",
        description: "Failed to update chat title",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Updated",
        description: "Chat title updated successfully",
      });
      loadSessions();
    }
    
    setEditingSessionId(null);
    setIsGenerating(false);
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingTitle('');
    setIsGenerating(false);
  };

  const handleGenerateTitle = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-chat-title', {
        body: { sessionId }
      });

      if (error) {
        console.error('Error generating title:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to generate title",
          variant: "destructive",
        });
        return;
      }

      if (data?.title) {
        setEditingTitle(data.title);
        toast({
          title: "Title Generated",
          description: "AI has generated a new title for your chat",
        });
      }
    } catch (error) {
      console.error('Error generating title:', error);
      toast({
        title: "Error",
        description: "Failed to generate title. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter(session =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case "title":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "last_message_at":
          aVal = new Date(a.last_message_at).getTime();
          bVal = new Date(b.last_message_at).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [sessions, searchQuery, sortField, sortDirection]);

  const getSortLabel = () => {
    const labels = {
      title: "Title",
      created_at: "Created",
      last_message_at: "Last Message",
    };
    return labels[sortField];
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={LibraryIcon}
        title="Chat Library"
        description="Browse and manage your chat sessions"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search chats..." 
              className="pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {getSortLabel()}
                {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background z-50">
              <DropdownMenuItem
                onClick={() => { setSortField("title"); setSortDirection("asc"); }}
                className={sortField === "title" && sortDirection === "asc" ? "bg-accent text-white" : ""}
              >
                Title (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortField("title"); setSortDirection("desc"); }}
                className={sortField === "title" && sortDirection === "desc" ? "bg-accent text-white" : ""}
              >
                Title (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortField("created_at"); setSortDirection("asc"); }}
                className={`justify-between ${sortField === "created_at" && sortDirection === "asc" ? "bg-accent text-white" : ""}`}
              >
                Created
                <ArrowUp className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortField("created_at"); setSortDirection("desc"); }}
                className={`justify-between ${sortField === "created_at" && sortDirection === "desc" ? "bg-accent text-white" : ""}`}
              >
                Created
                <ArrowDown className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortField("last_message_at"); setSortDirection("asc"); }}
                className={`justify-between ${sortField === "last_message_at" && sortDirection === "asc" ? "bg-accent text-white" : ""}`}
              >
                Last Message
                <ArrowUp className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortField("last_message_at"); setSortDirection("desc"); }}
                className={`justify-between ${sortField === "last_message_at" && sortDirection === "desc" ? "bg-accent text-white" : ""}`}
              >
                Last Message
                <ArrowDown className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground mb-6">
          Showing {filteredSessions.length} of {sessions.length} chats
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading chat sessions...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No chat sessions yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a new chat to see it here
            </p>
            <Button onClick={() => navigate('/chat')}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Start New Chat
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary"
                onClick={() => navigate(`/chat/${session.id}`)}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <MessageSquare className="h-7 w-7 text-primary" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div>
                    {editingSessionId === session.id ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-start">
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => {
                              // Only save if not generating
                              if (!isGenerating) {
                                handleSaveTitle(session.id);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isGenerating) {
                                handleSaveTitle(session.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            disabled={isGenerating}
                            className="font-semibold text-lg flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleGenerateTitle(session.id, e)}
                            disabled={isGenerating}
                            className="h-10 px-3 shrink-0"
                            title="Generate title with AI"
                          >
                            {isGenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {isGenerating && (
                          <div className="text-xs text-muted-foreground">
                            Generating title with AI...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="relative group/title cursor-text"
                        onClick={(e) => handleStartEdit(session.id, session.title, e)}
                      >
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem] pr-8">
                          {session.title}
                        </h3>
                        <Pencil className="h-4 w-4 text-muted-foreground absolute top-1 right-0 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(session.last_message_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
