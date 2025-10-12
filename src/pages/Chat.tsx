import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const Chat = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Ask a Question</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Get instant answers from your research documents
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-5xl">
        <Card className="border-0 shadow-md">
          <div className="p-4 sm:p-6 space-y-4">
            <div className="min-h-[300px] sm:min-h-[400px] p-4 sm:p-6 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground text-center py-20 sm:py-32 text-base sm:text-lg">
                Your conversation will appear here...
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Textarea
                placeholder="Ask anything about your research documents..."
                className="min-h-[100px] resize-none flex-1"
              />
              <Button size="icon" className="h-[60px] w-full sm:h-[100px] sm:w-[100px]" variant="accent">
                <Send className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="text-xs">
                Summarize recent papers
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Find contradictions
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Compare methodologies
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
