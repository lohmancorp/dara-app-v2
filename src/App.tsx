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
import Jobs from "./pages/Jobs";
import Connections from "./pages/Connections";
import NewConnection from "./pages/NewConnection";
import EditConnection from "./pages/EditConnection";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import AdminConnections from "./pages/admin/Connections";
import AdminEditConnection from "./pages/admin/EditConnection";
import AdminAccounts from "./pages/admin/Accounts";
import AdminUsers from "./pages/admin/Users";
import AdminRoles from "./pages/admin/Roles";
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
              <Route path="/chat/:chatId" element={<ProtectedRoute><AppLayout><Chat /></AppLayout></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><AppLayout><Library /></AppLayout></ProtectedRoute>} />
              <Route path="/blueprints" element={<ProtectedRoute><AppLayout><Templates /></AppLayout></ProtectedRoute>} />
              <Route path="/blueprints/new-prompt" element={<ProtectedRoute><AppLayout><NewPromptTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/blueprints/new-job" element={<ProtectedRoute><AppLayout><NewJobTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/blueprints/prompt/:id/view" element={<ProtectedRoute><AppLayout><ViewPromptTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/blueprints/prompt/:id/edit" element={<ProtectedRoute><AppLayout><EditPromptTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/blueprints/job/:id/view" element={<ProtectedRoute><AppLayout><ViewJobTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/blueprints/job/:id/edit" element={<ProtectedRoute><AppLayout><EditJobTemplate /></AppLayout></ProtectedRoute>} />
              <Route path="/jobs" element={<ProtectedRoute><AppLayout><Jobs /></AppLayout></ProtectedRoute>} />
              <Route path="/connections" element={<ProtectedRoute><AppLayout><Connections /></AppLayout></ProtectedRoute>} />
              <Route path="/connections/new/:type" element={<ProtectedRoute><AppLayout><NewConnection /></AppLayout></ProtectedRoute>} />
              <Route path="/connections/edit/:id" element={<ProtectedRoute><AppLayout><EditConnection /></AppLayout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AppLayout><Admin /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/connections" element={<ProtectedRoute><AppLayout><AdminConnections /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/connections/:id" element={<ProtectedRoute><AppLayout><AdminEditConnection /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/accounts" element={<ProtectedRoute><AppLayout><AdminAccounts /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AppLayout><AdminUsers /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/roles" element={<ProtectedRoute><AppLayout><AdminRoles /></AppLayout></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<ProtectedRoute><AppLayout><NotFound /></AppLayout></ProtectedRoute>} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </TranslationProvider>
  </QueryClientProvider>
);

export default App;
