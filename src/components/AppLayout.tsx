import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import React from 'react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard, FileText, Settings, Users, LogOut, Menu, CalendarDays,
  UserRound, Building2, ShoppingCart, BookOpen, DollarSign, ArrowDownCircle,
  ArrowUpCircle, BarChart3, Tag, PieChart, TrendingUp, ClipboardList,
  Plane, Award, ChevronDown, Building, Cog, Package, FileBarChart, UserCheck, Percent,
  Mail, FileEdit, MessageCircle, Search, Bell, User, Camera, Landmark, Link2, FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCompany } from '@/contexts/CompanyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import PhotoCaptureModal from '@/components/PhotoCaptureModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  permKey?: string;
}

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('vendedor');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [permLoaded, setPermLoaded] = useState(false);
  const { activeCompany } = useCompany();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null);
      setUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    (supabase.from('user_permissions').select('*').eq('user_id', userId).single() as any).then(({ data }: any) => {
      if (data) {
        setUserRole(data.user_role);
        setPermissions(data.permissions || {});
      } else {
        if (userEmail === 'thiago@vortexviagens.com.br') setUserRole('master');
      }
      setPermLoaded(true);
    });
  }, [userId, userEmail]);

  const isAdmin = userRole === 'master' || userEmail === 'thiago@vortexviagens.com.br';
  const hasPerm = (key?: string) => !key || isAdmin || !!permissions[key];
  const filterItems = (items: MenuItem[]) => items.filter(i => hasPerm(i.permKey));

  const isVistos = activeCompany?.slug === 'vortex-vistos';

  // --- Viagens menu ---
  const viagensMain: MenuItem[] = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Clientes', url: '/clients', icon: UserRound, permKey: 'clients_view' },
    { title: 'Fornecedores', url: '/suppliers', icon: Building2, permKey: 'suppliers_view' },
    { title: 'Vendas', url: '/sales', icon: ShoppingCart, permKey: 'sales_view' },
    { title: 'Vendedores', url: '/sellers', icon: UserCheck, permKey: 'sellers_view' },
    { title: 'Serviços', url: '/services', icon: ClipboardList, permKey: 'services_view' },
    { title: 'Reservas', url: '/reservations', icon: BookOpen, permKey: 'reservations_view' },
    { title: 'Calendário', url: '/calendar', icon: CalendarDays },
  ];

  const viagensFinancial: MenuItem[] = [
    { title: 'Contas a Receber', url: '/financial/receivable', icon: ArrowDownCircle, permKey: 'financial_receivable' },
    { title: 'Contas a Pagar', url: '/financial/payable', icon: ArrowUpCircle, permKey: 'financial_payable' },
    { title: 'Conciliação Bancária', url: '/financial/reconciliation', icon: Link2, permKey: 'financial_reconciliation' },
    { title: 'Contas Correntes', url: '/financial/bank-accounts', icon: Landmark, permKey: 'financial_bank_accounts' },
    { title: 'Relatório de Conta', url: '/financial/bank-report', icon: FileSpreadsheet, permKey: 'financial_bank_report' },
    { title: 'Comissões', url: '/financial/commissions', icon: Percent, permKey: 'financial_commissions' },
    { title: 'Fluxo de Caixa', url: '/financial/cashflow', icon: BarChart3, permKey: 'financial_cashflow' },
    { title: 'Centros de Custo', url: '/financial/cost-centers', icon: Tag, permKey: 'financial_cashflow' },
  ];

  const viagensReports: MenuItem[] = [
    { title: 'Dashboard Geral', url: '/reports/dashboard', icon: PieChart, permKey: 'reports_dashboard' },
    { title: 'Relatório de Vendas', url: '/reports/sales', icon: ShoppingCart, permKey: 'reports_sales' },
    { title: 'Relatório Financeiro', url: '/reports/financial', icon: DollarSign, permKey: 'reports_financial' },
    { title: 'Fluxo de Caixa', url: '/reports/cashflow', icon: TrendingUp, permKey: 'reports_financial' },
    { title: 'Relatório de Clientes', url: '/reports/clients', icon: UserRound, permKey: 'reports_sales' },
    { title: 'Relatório de Fornecedores', url: '/reports/suppliers', icon: Building2, permKey: 'reports_sales' },
    { title: 'Centro de Custo', url: '/reports/cost-centers', icon: Tag, permKey: 'reports_financial' },
    { title: 'Relatório de Produtos', url: '/reports/products', icon: ClipboardList, permKey: 'reports_sales' },
    { title: 'Relatório de Check-ins', url: '/reports/checkins', icon: Plane, permKey: 'reports_sales' },
    { title: 'Lucro por Venda', url: '/reports/profit', icon: Award, permKey: 'reports_financial' },
  ];

  // --- Vistos menu ---
  const vistosMain: MenuItem[] = [
    { title: 'Dashboard', url: '/vistos/dashboard', icon: LayoutDashboard },
    { title: 'Clientes', url: '/clients', icon: UserRound, permKey: 'clients_view' },
    { title: 'Fornecedores', url: '/suppliers', icon: Building2, permKey: 'suppliers_view' },
    { title: 'Vendas', url: '/vistos/sales', icon: ShoppingCart, permKey: 'sales_view' },
    { title: 'Serviços', url: '/vistos/products', icon: Package },
    { title: 'Produção', url: '/vistos/production', icon: Cog },
    { title: 'DS-160 Grupo', url: '/vistos/ds160', icon: FileEdit },
    { title: 'Calendário', url: '/calendar', icon: CalendarDays },
    { title: 'Relatórios', url: '/vistos/reports', icon: FileBarChart },
  ];

  const vistosFinancial: MenuItem[] = [
    { title: 'Contas a Receber', url: '/financial/receivable', icon: ArrowDownCircle, permKey: 'financial_receivable' },
    { title: 'Contas a Pagar', url: '/financial/payable', icon: ArrowUpCircle, permKey: 'financial_payable' },
    { title: 'Fluxo de Caixa', url: '/financial/cashflow', icon: BarChart3, permKey: 'financial_cashflow' },
    { title: 'Centros de Custo', url: '/financial/cost-centers', icon: Tag, permKey: 'financial_cashflow' },
  ];

  const mainItems = isVistos ? vistosMain : viagensMain;
  const financialItems = isVistos ? vistosFinancial : viagensFinancial;
  const reportItems = isVistos ? [] : viagensReports;

  const emailItems: MenuItem[] = [
    { title: 'Inbox', url: '/email', icon: Mail },
    { title: 'Templates', url: '/email/templates', icon: FileText },
    { title: 'Configurações', url: '/email/settings', icon: Cog },
  ];

  const whatsappItems: MenuItem[] = [
    { title: 'Inbox', url: '/whatsapp', icon: MessageCircle },
    { title: 'Contatos', url: '/whatsapp/contacts', icon: UserRound },
    { title: 'Etiquetas', url: '/whatsapp/labels', icon: Tag },
    { title: 'Respostas Rápidas', url: '/whatsapp/quick-replies', icon: Cog },
    { title: 'Configurações', url: '/whatsapp/settings', icon: Settings },
  ];

  const adminItems: MenuItem[] = [
    { title: 'Configurações', url: '/settings', icon: Settings, permKey: 'settings_access' },
    { title: 'Usuários', url: '/users', icon: Users },
  ];

  const isFinancialActive = location.pathname.startsWith('/financial');
  const isReportsActive = location.pathname.startsWith('/reports');
  const isEmailActive = location.pathname.startsWith('/email');
  const isWhatsAppActive = location.pathname.startsWith('/whatsapp');

  const filteredFinancial = filterItems(financialItems);
  const filteredReports = filterItems(reportItems);
  const filteredEmail = filterItems(emailItems);
  const filteredWhatsApp = filterItems(whatsappItems);

  const renderMenuItems = (items: MenuItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title + item.url}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 text-[13px]"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const renderCollapsibleGroup = (label: string, icon: any, items: MenuItem[], isActive: boolean) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        <Collapsible defaultOpen={isActive}>
          <CollapsibleTrigger className="flex items-center gap-2.5 px-4 py-2 w-full text-sidebar-foreground/40 text-[11px] uppercase tracking-widest font-semibold hover:text-sidebar-foreground/70 transition-colors">
            {React.createElement(icon, { className: 'h-3.5 w-3.5' })}
            {!collapsed && <>
              <span>{label}</span>
              <ChevronDown className="h-3 w-3 ml-auto transition-transform" />
            </>}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>{renderMenuItems(items)}</SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar text-sidebar-foreground scrollbar-thin">
        {/* Logo area */}
        <div className="px-4 py-5 flex items-center gap-3">
          {!collapsed ? (
            <div>
              <h2 className="font-bold text-[15px] text-sidebar-primary tracking-wide">
                {isVistos ? 'VORTEX VISTOS' : 'VORTEX VIAGENS'}
              </h2>
              <p className="text-[11px] text-sidebar-foreground/40 mt-0.5">Enterprise Resource Planning</p>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
              <span className="text-sidebar-primary font-bold text-sm">V</span>
            </div>
          )}
        </div>

        <div className="px-3 mb-1">
          <div className="h-px bg-sidebar-border" />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-widest font-semibold px-4">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderMenuItems(filterItems(mainItems))}</SidebarGroupContent>
        </SidebarGroup>

        {renderCollapsibleGroup('Financeiro', DollarSign, filteredFinancial, isFinancialActive)}
        {renderCollapsibleGroup('Relatórios', BarChart3, filteredReports, isReportsActive)}

        <div className="px-3 my-1">
          <div className="h-px bg-sidebar-border" />
        </div>

        {/* Apps section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-widest font-semibold px-4">
            Apps
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(filterItems([
              { title: 'WhatsApp', url: '/whatsapp', icon: MessageCircle },
              { title: 'Email', url: '/email', icon: Mail },
            ]))}
          </SidebarGroupContent>
        </SidebarGroup>

        {isWhatsAppActive && renderCollapsibleGroup('WhatsApp', MessageCircle, filteredWhatsApp, true)}
        {isEmailActive && renderCollapsibleGroup('Email', Mail, filteredEmail, true)}

        {isAdmin && (
          <>
            <div className="px-3 my-1">
              <div className="h-px bg-sidebar-border" />
            </div>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-widest font-semibold px-4">
                Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>{renderMenuItems(adminItems)}</SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Footer */}
        <div className="mt-auto p-4">
          <div className="h-px bg-sidebar-border mb-3" />
          {!collapsed && userEmail && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-sidebar-foreground/60" />
              </div>
              <p className="text-[11px] text-sidebar-foreground/40 truncate">{userEmail}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent text-[13px] justify-start"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { companies, activeCompany, setActiveCompany, userCompanyIds, isMaster } = useCompany();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const accessibleCompanies = companies.filter(c => userCompanyIds.includes(c.id));
  const showSelector = isMaster && accessibleCompanies.length > 1;

  const [pendingCompany, setPendingCompany] = useState<typeof activeCompany>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const handleCompanyChange = (val: string) => {
    const comp = companies.find(c => c.id === val);
    if (!comp || comp.id === activeCompany?.id) return;
    setPendingCompany(comp);
    setShowConfirm(true);
  };

  const confirmSwitch = () => {
    if (pendingCompany) {
      setActiveCompany(pendingCompany);
      navigate('/dashboard');
      toast.success(`Empresa alterada para ${pendingCompany.name}`, {
        description: 'Os dados exibidos agora são desta empresa.',
      });
    }
    setShowConfirm(false);
    setPendingCompany(null);
  };

  const cancelSwitch = () => {
    setShowConfirm(false);
    setPendingCompany(null);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Modern Header */}
          <header className="h-[56px] flex items-center bg-card border-b px-4 shrink-0 gap-3">
            <SidebarTrigger className="mr-1 text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>

            {/* Company selector */}
            {showSelector ? (
              <Select value={activeCompany?.id || ''} onValueChange={handleCompanyChange}>
                <SelectTrigger className="w-[180px] h-9 text-sm border-border/50 bg-secondary/50 rounded-lg font-medium">
                  <Building className="h-4 w-4 mr-2 shrink-0 text-primary" />
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : activeCompany ? (
              <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                <Building className="h-4 w-4 text-primary" />
                {activeCompany.name}
              </span>
            ) : null}

            {/* Search bar - center */}
            {!isMobile && (
              <div className="flex-1 max-w-md mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar clientes, vendas, serviços..."
                    className="pl-9 h-9 bg-secondary/50 border-border/40 rounded-lg text-sm placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
            )}

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-2">
              {!isMobile && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => navigate('/whatsapp')}
                        size="sm"
                        className="h-9 rounded-lg gap-2 font-medium bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 shadow-sm"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Abrir WhatsApp</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => navigate('/email')}
                        size="sm"
                        className="h-9 rounded-lg gap-2 font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Abrir Email</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowPhotoModal(true)}
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg border-border/50"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Capturar foto</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg border-border/50"
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Notificações</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-background">{children}</main>
        </div>
      </div>

      {/* Floating buttons - mobile */}
      {isMobile && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          <button
            onClick={() => navigate('/whatsapp')}
            className="h-12 w-12 rounded-full flex items-center justify-center shadow-lg bg-whatsapp text-whatsapp-foreground"
            title="WhatsApp"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowPhotoModal(true)}
            className="h-12 w-12 rounded-full flex items-center justify-center shadow-lg bg-primary text-primary-foreground"
            title="Capturar foto"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>
      )}

      <PhotoCaptureModal
        open={showPhotoModal}
        onOpenChange={setShowPhotoModal}
      />

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar de empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a mudar para <strong>{pendingCompany?.name}</strong>.
              Qualquer cadastro, edição ou venda em andamento será perdido.
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSwitch}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Sim, trocar empresa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
