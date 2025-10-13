import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Library from "./pages/Library";
import Templates from "./pages/Templates";
import NewPromptTemplate from "./pages/NewPromptTemplate";
import NewJobTemplate from "./pages/NewJobTemplate";
import ViewPromptTemplate from "./pages/ViewPromptTemplate";
import ViewJobTemplate from "./pages/ViewJobTemplate";
import EditPromptTemplate from "./pages/EditPromptTemplate";
import EditJobTemplate from "./pages/EditJobTemplate";
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
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><AppLayout><Chat /></AppLayout></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><AppLayout><Library /></AppLayout></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><AppLayout><Templates /></AppLayout></ProtectedRoute>} />
              <Route path="/templates/new-prompt" element={<ProtectedRoute><AppLayout><NewPromptTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/templates/new-job" element={<ProtectedRoute><AppLayout><NewJobTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/templates/prompt/:id/view" element={<ProtectedRoute><AppLayout><ViewPromptTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/templates/prompt/:id/edit" element={<ProtectedRoute><AppLayout><EditPromptTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/templates/job/:id/view" element={<ProtectedRoute><AppLayout><ViewJobTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/templates/job/:id/edit" element={<ProtectedRoute><AppLayout><EditJobTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/active-jobs" element={<ProtectedRoute><AppLayout><ActiveJobs /></AppLayout></ProtectedRoute>} />
              <Route path="/connections" element={<ProtectedRoute><AppLayout><Connections /></AppLayout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </TranslationProvider>
  </QueryClientProvider>
);

export default App;
