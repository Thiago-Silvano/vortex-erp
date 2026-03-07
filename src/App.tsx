import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Preview from "./pages/Preview";
import Settings from "./pages/Settings";
import SavedQuotes from "./pages/SavedQuotes";
import Dashboard from "./pages/Dashboard";
import ClientQuote from "./pages/ClientQuote";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import UserAdmin from "./pages/UserAdmin";
import CalendarPage from "./pages/CalendarPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public route - client quote view */}
          <Route path="/orcamento/:shortId" element={<ClientQuote />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
          <Route path="/new" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/preview" element={<ProtectedRoute><Preview /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/quotes" element={<ProtectedRoute><SavedQuotes /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UserAdmin /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
