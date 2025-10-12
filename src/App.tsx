import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { AppLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import Library from "./pages/Library";
import Templates from "./pages/Templates";
import NewPromptTemplate from "./pages/NewPromptTemplate";
import NewJobTemplate from "./pages/NewJobTemplate";
import ActiveJobs from "./pages/ActiveJobs";
import Connections from "./pages/Connections";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TranslationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/library" element={<Library />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/templates/new-prompt" element={<NewPromptTemplate />} />
              <Route path="/templates/new-job" element={<NewJobTemplate />} />
              <Route path="/active-jobs" element={<ActiveJobs />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </TranslationProvider>
  </QueryClientProvider>
);

export default App;
