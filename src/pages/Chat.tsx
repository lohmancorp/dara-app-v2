import { MessageSquare, Send, Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AdvancedPanel } from "@/components/AdvancedPanel";
import { useAdvancedStore } from "@/store/advancedStore";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { FloatingControls } from "@/components/FloatingControls";

const Chat = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAdvancedClick = () => {
    console.log('Advanced button clicked, current state:', showAdvanced);
    setShowAdvanced(!showAdvanced);
  };

  const advancedButton = (
    <button
      onClick={handleAdvancedClick}
      className="h-11 w-11 rounded-full bg-accent text-accent-foreground border-2 border-border shadow-lg hover:shadow-xl transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label="Advanced settings"
      aria-pressed={showAdvanced}
    >
      <Settings2 className="h-5 w-5" />
    </button>
  );

  console.log('Chat render, showAdvanced:', showAdvanced);

  return (
    <>
      <FloatingControls advancedButton={advancedButton} />
      <AdvancedPanel open={showAdvanced} onClose={() => setShowAdvanced(false)} />
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader 
          icon={MessageSquare}
          title="Research"
          description="Get learnings and outcomes from your research."
        />

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
            <div className="flex-1 border-l border-r border-border flex flex-col">
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <p className="text-muted-foreground text-center py-20 sm:py-32 text-base sm:text-lg">
                  Your conversation will appear here...
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background">
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex gap-3 items-end pl-[10px]">
              <Textarea
                placeholder="Ask anything about your research documents..."
                className="min-h-[60px] resize-none flex-1"
              />
              <Button 
                size="icon" 
                className="h-[60px] w-[60px] rounded-full flex-shrink-0" 
                variant="accent"
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
