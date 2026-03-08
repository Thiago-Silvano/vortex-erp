import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CompanyProvider } from "@/contexts/CompanyContext";
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
import ClientsPage from "./pages/ClientsPage";
import SuppliersPage from "./pages/SuppliersPage";
import SalesPage from "./pages/SalesPage";
import ReservationsPage from "./pages/ReservationsPage";
import NewSalePage from "./pages/NewSalePage";
import AccountsReceivablePage from "./pages/AccountsReceivablePage";
import AccountsPayablePage from "./pages/AccountsPayablePage";
import CashFlowPage from "./pages/CashFlowPage";
import CostCentersPage from "./pages/CostCentersPage";
import ReportDashboard from "./pages/reports/ReportDashboard";
import ReportSales from "./pages/reports/ReportSales";
import ReportFinancial from "./pages/reports/ReportFinancial";
import ReportCashFlow from "./pages/reports/ReportCashFlow";
import ReportClients from "./pages/reports/ReportClients";
import ReportSuppliers from "./pages/reports/ReportSuppliers";
import ReportCostCenters from "./pages/reports/ReportCostCenters";
import ReportProducts from "./pages/reports/ReportProducts";
import ReportCheckins from "./pages/reports/ReportCheckins";
import ReportProfit from "./pages/reports/ReportProfit";

// Vistos pages
import VistosDashboard from "./pages/vistos/VistosDashboard";
import VistosProductsPage from "./pages/vistos/VistosProductsPage";
import VistosSalesPage from "./pages/vistos/VistosSalesPage";
import VistosNewSalePage from "./pages/vistos/VistosNewSalePage";
import VistosProductionPage from "./pages/vistos/VistosProductionPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CompanyProvider>
        <Routes>
          <Route path="/orcamento/:shortId" element={<ClientQuote />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
          <Route path="/new" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/preview" element={<ProtectedRoute><Preview /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/quotes" element={<ProtectedRoute><SavedQuotes /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UserAdmin /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
          <Route path="/sales/new" element={<ProtectedRoute><NewSalePage /></ProtectedRoute>} />
          <Route path="/sales/:id" element={<ProtectedRoute><NewSalePage /></ProtectedRoute>} />
          <Route path="/reservations" element={<ProtectedRoute><ReservationsPage /></ProtectedRoute>} />
          <Route path="/financial/receivable" element={<ProtectedRoute><AccountsReceivablePage /></ProtectedRoute>} />
          <Route path="/financial/payable" element={<ProtectedRoute><AccountsPayablePage /></ProtectedRoute>} />
          <Route path="/financial/cashflow" element={<ProtectedRoute><CashFlowPage /></ProtectedRoute>} />
          <Route path="/financial/cost-centers" element={<ProtectedRoute><CostCentersPage /></ProtectedRoute>} />
          <Route path="/reports/dashboard" element={<ProtectedRoute><ReportDashboard /></ProtectedRoute>} />
          <Route path="/reports/sales" element={<ProtectedRoute><ReportSales /></ProtectedRoute>} />
          <Route path="/reports/financial" element={<ProtectedRoute><ReportFinancial /></ProtectedRoute>} />
          <Route path="/reports/cashflow" element={<ProtectedRoute><ReportCashFlow /></ProtectedRoute>} />
          <Route path="/reports/clients" element={<ProtectedRoute><ReportClients /></ProtectedRoute>} />
          <Route path="/reports/suppliers" element={<ProtectedRoute><ReportSuppliers /></ProtectedRoute>} />
          <Route path="/reports/cost-centers" element={<ProtectedRoute><ReportCostCenters /></ProtectedRoute>} />
          <Route path="/reports/products" element={<ProtectedRoute><ReportProducts /></ProtectedRoute>} />
          <Route path="/reports/checkins" element={<ProtectedRoute><ReportCheckins /></ProtectedRoute>} />
          <Route path="/reports/profit" element={<ProtectedRoute><ReportProfit /></ProtectedRoute>} />

          {/* Vistos routes */}
          <Route path="/vistos/dashboard" element={<ProtectedRoute><VistosDashboard /></ProtectedRoute>} />
          <Route path="/vistos/products" element={<ProtectedRoute><VistosProductsPage /></ProtectedRoute>} />
          <Route path="/vistos/sales" element={<ProtectedRoute><VistosSalesPage /></ProtectedRoute>} />
          <Route path="/vistos/sales/new" element={<ProtectedRoute><VistosNewSalePage /></ProtectedRoute>} />
          <Route path="/vistos/sales/edit" element={<ProtectedRoute><VistosNewSalePage /></ProtectedRoute>} />
          <Route path="/vistos/production" element={<ProtectedRoute><VistosProductionPage /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        </CompanyProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
