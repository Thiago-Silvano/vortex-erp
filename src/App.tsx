import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HomeRedirect from "./components/HomeRedirect";
import Settings from "./pages/Settings";
import AppearancePage from "./pages/AppearancePage";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import UserAdmin from "./pages/UserAdmin";
import CalendarPage from "./pages/CalendarPage";
import ClientsPage from "./pages/ClientsPage";
import SuppliersPage from "./pages/SuppliersPage";
import SalesPage from "./pages/SalesPage";
import CotacoesKanbanPage from "./pages/CotacoesKanbanPage";
import CrmKanbanPage from "./pages/CrmKanbanPage";
import ReservationsPage from "./pages/ReservationsPage";
import NewSalePage from "./pages/NewSalePage";
import AccountsReceivablePage from "./pages/AccountsReceivablePage";
import AccountsPayablePage from "./pages/AccountsPayablePage";
import GroupAccountsPage from "./pages/GroupAccountsPage";
import UngroupAccountsPage from "./pages/UngroupAccountsPage";
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
import BankAccountsPage from "./pages/BankAccountsPage";
import BankReconciliationPage from "./pages/BankReconciliationPage";
import BankStatementReportPage from "./pages/BankStatementReportPage";
import ItinerariesPage from "./pages/ItinerariesPage";
import ItineraryEditorPage from "./pages/ItineraryEditorPage";

// Vistos pages
import VistosDashboard from "./pages/vistos/VistosDashboard";
import VistosProductsPage from "./pages/vistos/VistosProductsPage";
import VistosSalesPage from "./pages/vistos/VistosSalesPage";
import VistosNewSalePage from "./pages/vistos/VistosNewSalePage";
import VistosProductionPage from "./pages/vistos/VistosProductionPage";
import VistosReportsPage from "./pages/vistos/VistosReportsPage";


// Email pages
import EmailInboxPage from "./pages/email/EmailInboxPage";
import EmailTemplatesPage from "./pages/email/EmailTemplatesPage";
import EmailSettingsPage from "./pages/email/EmailSettingsPage";
import PropostaPublicPage from "./pages/PropostaPublicPage";
import PropostaClienteBuildsPage from "./pages/PropostaClienteBuildsPage";
import DS160PublicPage from "./pages/DS160PublicPage";
import DS160GroupPublicPage from "./pages/DS160GroupPublicPage";
import VistosDS160Page from "./pages/vistos/VistosDS160Page";
import ItineraryPublicPage from "./pages/ItineraryPublicPage";
import PromoMakerPage from "./pages/PromoMakerPage";
import PromotionsPage from "./pages/marketing/PromotionsPage";
import PromotionFormPage from "./pages/marketing/PromotionFormPage";
import MarketingTemplatesPage from "./pages/marketing/MarketingTemplatesPage";
import AirlinesPage from "./pages/AirlinesPage";
import VouchersPage from "./pages/VouchersPage";
import ContractTemplatesPage from "./pages/ContractTemplatesPage";
import ContractsDashboardPage from "./pages/ContractsDashboardPage";
import ContractSignPage from "./pages/ContractSignPage";
import BundleSignPage from "./pages/BundleSignPage";

// NFS-e pages
import NfseDashboardPage from "./pages/nfse/NfseDashboardPage";
import NfseSettingsPage from "./pages/nfse/NfseSettingsPage";
import NfseCertificatePage from "./pages/nfse/NfseCertificatePage";
import NfseServicesPage from "./pages/nfse/NfseServicesPage";
import NfseEmitPage from "./pages/nfse/NfseEmitPage";
import NfseListPage from "./pages/nfse/NfseListPage";
import NfseDetailPage from "./pages/nfse/NfseDetailPage";

// WhatsApp pages
import WhatsAppInboxPage from "./pages/whatsapp/WhatsAppInboxPage";
import WhatsAppContactsPage from "./pages/whatsapp/WhatsAppContactsPage";
import WhatsAppLabelsPage from "./pages/whatsapp/WhatsAppLabelsPage";
import WhatsAppQuickRepliesPage from "./pages/whatsapp/WhatsAppQuickRepliesPage";
import WhatsAppSettingsPage from "./pages/whatsapp/WhatsAppSettingsPage";
import WhatsAppNotificationListener from "./components/WhatsAppNotificationListener";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CompanyProvider>
        <ThemeProvider>
        <WhatsAppNotificationListener />
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/settings/appearance" element={<ProtectedRoute><AppearancePage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UserAdmin /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
          <Route path="/sales/vouchers" element={<ProtectedRoute><VouchersPage /></ProtectedRoute>} />
          <Route path="/cotacoes" element={<ProtectedRoute><CotacoesKanbanPage /></ProtectedRoute>} />
          <Route path="/crm-kanban" element={<ProtectedRoute><CrmKanbanPage /></ProtectedRoute>} />
          <Route path="/cotacoes/lista" element={<ProtectedRoute><CotacoesKanbanPage /></ProtectedRoute>} />
          <Route path="/sales/new" element={<ProtectedRoute><NewSalePage /></ProtectedRoute>} />
          <Route path="/sales/:id" element={<ProtectedRoute><NewSalePage /></ProtectedRoute>} />
          <Route path="/reservations" element={<ProtectedRoute><ReservationsPage /></ProtectedRoute>} />
          <Route path="/financial/receivable" element={<ProtectedRoute><AccountsReceivablePage /></ProtectedRoute>} />
          <Route path="/financial/payable" element={<ProtectedRoute><AccountsPayablePage /></ProtectedRoute>} />
          <Route path="/financial/group-accounts" element={<ProtectedRoute><GroupAccountsPage /></ProtectedRoute>} />
          <Route path="/financial/ungroup-accounts" element={<ProtectedRoute><UngroupAccountsPage /></ProtectedRoute>} />
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
          <Route path="/financial/bank-accounts" element={<ProtectedRoute><BankAccountsPage /></ProtectedRoute>} />
          <Route path="/financial/reconciliation" element={<ProtectedRoute><BankReconciliationPage /></ProtectedRoute>} />
          <Route path="/financial/bank-report" element={<ProtectedRoute><BankStatementReportPage /></ProtectedRoute>} />
          <Route path="/itineraries" element={<ProtectedRoute><ItinerariesPage /></ProtectedRoute>} />
          <Route path="/itineraries/:id" element={<ProtectedRoute><ItineraryEditorPage /></ProtectedRoute>} />
          <Route path="/promo-maker" element={<ProtectedRoute><PromoMakerPage /></ProtectedRoute>} />
          <Route path="/airlines" element={<ProtectedRoute><AirlinesPage /></ProtectedRoute>} />

          {/* Vistos routes */}
          <Route path="/vistos/dashboard" element={<ProtectedRoute><VistosDashboard /></ProtectedRoute>} />
          <Route path="/vistos/products" element={<ProtectedRoute><VistosProductsPage /></ProtectedRoute>} />
          <Route path="/vistos/sales" element={<ProtectedRoute><VistosSalesPage /></ProtectedRoute>} />
          <Route path="/vistos/sales/new" element={<ProtectedRoute><VistosNewSalePage /></ProtectedRoute>} />
          <Route path="/vistos/sales/edit" element={<ProtectedRoute><VistosNewSalePage /></ProtectedRoute>} />
          <Route path="/vistos/production" element={<ProtectedRoute><VistosProductionPage /></ProtectedRoute>} />
          <Route path="/vistos/ds160" element={<ProtectedRoute><VistosDS160Page /></ProtectedRoute>} />
          <Route path="/vistos/reports" element={<ProtectedRoute><VistosReportsPage /></ProtectedRoute>} />


          {/* Email routes */}
          <Route path="/email" element={<ProtectedRoute><EmailInboxPage /></ProtectedRoute>} />
          <Route path="/email/templates" element={<ProtectedRoute><EmailTemplatesPage /></ProtectedRoute>} />
          <Route path="/email/settings" element={<ProtectedRoute><EmailSettingsPage /></ProtectedRoute>} />

          {/* WhatsApp routes */}
          <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppInboxPage /></ProtectedRoute>} />
          <Route path="/whatsapp/contacts" element={<ProtectedRoute><WhatsAppContactsPage /></ProtectedRoute>} />
          <Route path="/whatsapp/labels" element={<ProtectedRoute><WhatsAppLabelsPage /></ProtectedRoute>} />
          <Route path="/whatsapp/quick-replies" element={<ProtectedRoute><WhatsAppQuickRepliesPage /></ProtectedRoute>} />
          <Route path="/whatsapp/settings" element={<ProtectedRoute><WhatsAppSettingsPage /></ProtectedRoute>} />
          {/* Public pages (no auth required) */}
          <Route path="/proposta/:shortId" element={<PropostaPublicPage />} />
          <Route path="/montar-proposta/:shortId" element={<PropostaClienteBuildsPage />} />
          <Route path="/ds160/group/:token" element={<DS160GroupPublicPage />} />
          <Route path="/ds160/:token" element={<DS160PublicPage />} />
          <Route path="/roteiro/:token" element={<ItineraryPublicPage />} />
          <Route path="/contrato/:token" element={<ContractSignPage />} />
          <Route path="/contratos/:token" element={<BundleSignPage />} />
          
          {/* Contract templates */}
          <Route path="/contracts/templates" element={<ProtectedRoute><ContractTemplatesPage /></ProtectedRoute>} />
          <Route path="/contracts/dashboard" element={<ProtectedRoute><ContractsDashboardPage /></ProtectedRoute>} />

          {/* NFS-e routes */}
          <Route path="/nfse" element={<ProtectedRoute><NfseDashboardPage /></ProtectedRoute>} />
          <Route path="/nfse/settings" element={<ProtectedRoute><NfseSettingsPage /></ProtectedRoute>} />
          <Route path="/nfse/certificate" element={<ProtectedRoute><NfseCertificatePage /></ProtectedRoute>} />
          <Route path="/nfse/services" element={<ProtectedRoute><NfseServicesPage /></ProtectedRoute>} />
          <Route path="/nfse/emit" element={<ProtectedRoute><NfseEmitPage /></ProtectedRoute>} />
          <Route path="/nfse/list" element={<ProtectedRoute><NfseListPage /></ProtectedRoute>} />
          <Route path="/nfse/detail/:id" element={<ProtectedRoute><NfseDetailPage /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ThemeProvider>
        </CompanyProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
