import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CompanyProvider } from "@/contexts/CompanyContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
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
import SellersPage from "./pages/SellersPage";
import CommissionsPage from "./pages/CommissionsPage";
import ServicesCatalogPage from "./pages/ServicesCatalogPage";

// Vistos pages
import VistosDashboard from "./pages/vistos/VistosDashboard";
import VistosProductsPage from "./pages/vistos/VistosProductsPage";
import VistosSalesPage from "./pages/vistos/VistosSalesPage";
import VistosNewSalePage from "./pages/vistos/VistosNewSalePage";
import VistosProductionPage from "./pages/vistos/VistosProductionPage";
import VistosReportsPage from "./pages/vistos/VistosReportsPage";

// WhatsApp pages
import WhatsAppPage from "./pages/whatsapp/WhatsAppPage";
import WhatsAppFinishedPage from "./pages/whatsapp/WhatsAppFinishedPage";
import WhatsAppQuickRepliesPage from "./pages/whatsapp/WhatsAppQuickRepliesPage";
import WhatsAppAutomationsPage from "./pages/whatsapp/WhatsAppAutomationsPage";
import WhatsAppSettingsPage from "./pages/whatsapp/WhatsAppSettingsPage";

// Email pages
import EmailInboxPage from "./pages/email/EmailInboxPage";
import EmailTemplatesPage from "./pages/email/EmailTemplatesPage";
import EmailSettingsPage from "./pages/email/EmailSettingsPage";
import PropostaPublicPage from "./pages/PropostaPublicPage";
import DS160PublicPage from "./pages/DS160PublicPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CompanyProvider>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
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
          <Route path="/sellers" element={<ProtectedRoute><SellersPage /></ProtectedRoute>} />
          <Route path="/financial/commissions" element={<ProtectedRoute><CommissionsPage /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><ServicesCatalogPage /></ProtectedRoute>} />

          {/* Vistos routes */}
          <Route path="/vistos/dashboard" element={<ProtectedRoute><VistosDashboard /></ProtectedRoute>} />
          <Route path="/vistos/products" element={<ProtectedRoute><VistosProductsPage /></ProtectedRoute>} />
          <Route path="/vistos/sales" element={<ProtectedRoute><VistosSalesPage /></ProtectedRoute>} />
          <Route path="/vistos/sales/new" element={<ProtectedRoute><VistosNewSalePage /></ProtectedRoute>} />
          <Route path="/vistos/sales/edit" element={<ProtectedRoute><VistosNewSalePage /></ProtectedRoute>} />
          <Route path="/vistos/production" element={<ProtectedRoute><VistosProductionPage /></ProtectedRoute>} />
          <Route path="/vistos/reports" element={<ProtectedRoute><VistosReportsPage /></ProtectedRoute>} />

          {/* WhatsApp routes */}
          <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />
          <Route path="/whatsapp/finished" element={<ProtectedRoute><WhatsAppFinishedPage /></ProtectedRoute>} />
          <Route path="/whatsapp/quick-replies" element={<ProtectedRoute><WhatsAppQuickRepliesPage /></ProtectedRoute>} />
          <Route path="/whatsapp/automations" element={<ProtectedRoute><WhatsAppAutomationsPage /></ProtectedRoute>} />
          <Route path="/whatsapp/settings" element={<ProtectedRoute><WhatsAppSettingsPage /></ProtectedRoute>} />

          {/* Email routes */}
          <Route path="/email" element={<ProtectedRoute><EmailInboxPage /></ProtectedRoute>} />
          <Route path="/email/templates" element={<ProtectedRoute><EmailTemplatesPage /></ProtectedRoute>} />
          <Route path="/email/settings" element={<ProtectedRoute><EmailSettingsPage /></ProtectedRoute>} />
          {/* Public pages (no auth required) */}
          <Route path="/proposta/:shortId" element={<PropostaPublicPage />} />
          <Route path="/ds160/:token" element={<DS160PublicPage />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        </CompanyProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
