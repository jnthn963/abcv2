import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Vault from "./pages/Vault";
import Lending from "./pages/Lending";
import Settings from "./pages/Settings";
import Governor from "./pages/Governor";
import GovernorSettings from "./pages/GovernorSettings";
import Referrals from "./pages/Referrals";
import Transactions from "./pages/Transactions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/vault" element={
              <ProtectedRoute>
                <Vault />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/lending" element={
              <ProtectedRoute>
                <Lending />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/governor" element={
              <ProtectedRoute requireGovernor>
                <Governor />
              </ProtectedRoute>
            } />
            <Route path="/governor/settings" element={
              <ProtectedRoute requireGovernor>
                <GovernorSettings />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/referrals" element={
              <ProtectedRoute>
                <Referrals />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/transactions" element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
