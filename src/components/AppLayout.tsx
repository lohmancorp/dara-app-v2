import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { FloatingControls } from "./FloatingControls";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
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
        <FloatingControls />
      </div>
    </SidebarProvider>
  );
}
