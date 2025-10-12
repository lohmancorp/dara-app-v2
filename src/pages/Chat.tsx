import { MessageSquare, Send, Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AdvancedPanel } from "@/components/AdvancedPanel";
import { useAdvancedStore } from "@/store/advancedStore";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";

const Chat = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { enabled, toggleEnabled } = useAdvancedStore();

  return (
    <>
      <AdvancedPanel open={showAdvanced} onClose={() => setShowAdvanced(false)} />
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={MessageSquare}
        title="Research"
        description="Get learnings and outcomes from your research."
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-5xl mx-auto">
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

            <div className="flex items-center justify-between gap-2">
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
              
              <Button
                variant={showAdvanced ? "default" : "outline"}
                size="icon"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="rounded-full"
                aria-label="Advanced settings"
                aria-pressed={showAdvanced}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
        </div>
      </div>
    </div>
    </>
  );
};

export default Chat;
