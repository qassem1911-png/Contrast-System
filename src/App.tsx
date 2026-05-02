import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Users from "./pages/Users.tsx";
import Inventory from "./pages/Inventory.tsx";
import Brands from "./pages/Brands.tsx";
import Customers from "./pages/Customers.tsx";
import MyCustody from "./pages/MyCustody.tsx";
import Invoices from "./pages/Invoices.tsx";
import NewInvoice from "./pages/NewInvoice.tsx";
import Analytics from "./pages/Analytics.tsx";
import AuditLogs from "./pages/AuditLogs.tsx";
import NotFound from "./pages/NotFound.tsx";

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
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
            <Route path="/brands" element={<ProtectedRoute requireRoles={["super_admin","admin"]}><Brands /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute requireRoles={["super_admin","admin","storekeeper"]}><Customers /></ProtectedRoute>} />
            <Route path="/custody" element={<ProtectedRoute requireRoles={["super_admin","technician"]}><MyCustody /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/invoices/new" element={<ProtectedRoute requireRoles={["super_admin","technician"]}><NewInvoice /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute requireRoles={["super_admin","admin","storekeeper"]}><Analytics /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute requireRoles={["super_admin"]}><Users /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
