import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { FloatingControls } from "./FloatingControls";
import { createContext, useContext, useState, ReactNode } from "react";

interface FloatingActionContextType {
  actionButton: ReactNode | null;
  setActionButton: (button: ReactNode | null) => void;
  advancedControls: {
    onClick?: () => void;
    isPressed?: boolean;
  } | null;
  setAdvancedControls: (controls: { onClick?: () => void; isPressed?: boolean } | null) => void;
}

const FloatingActionContext = createContext<FloatingActionContextType | undefined>(undefined);

export function useFloatingAction() {
  const context = useContext(FloatingActionContext);
  if (!context) {
    throw new Error("useFloatingAction must be used within AppLayout");
  }
  return context;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [actionButton, setActionButton] = useState<ReactNode | null>(null);
  const [advancedControls, setAdvancedControls] = useState<{ onClick?: () => void; isPressed?: boolean } | null>(null);

  return (
    <FloatingActionContext.Provider value={{ actionButton, setActionButton, advancedControls, setAdvancedControls }}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 overflow-auto w-full">
            <div className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 md:hidden">
              <SidebarTrigger className="text-foreground" />
              <span className="text-sm font-semibold">D.A.R.A.</span>
            </div>
            {children}
          </main>
          <FloatingControls
            actionButton={actionButton}
            onAdvancedClick={advancedControls?.onClick}
            advancedPressed={advancedControls?.isPressed}
          />
        </div>
      </SidebarProvider>
    </FloatingActionContext.Provider>
  );
}
