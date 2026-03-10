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
  MessageSquare, CheckCircle, Zap, MessageCircle,
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
    { title: 'Produtos', url: '/vistos/products', icon: Package },
    { title: 'Produção', url: '/vistos/production', icon: Cog },
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

  const adminItems: MenuItem[] = [
    { title: 'Configurações', url: '/settings', icon: Settings, permKey: 'settings_access' },
    { title: 'Usuários', url: '/users', icon: Users },
  ];

  const isFinancialActive = location.pathname.startsWith('/financial');
  const isReportsActive = location.pathname.startsWith('/reports');

  const filteredFinancial = filterItems(financialItems);
  const filteredReports = filterItems(reportItems);

  const renderMenuItems = (items: MenuItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title + item.url}>
          <SidebarMenuButton asChild>
            <NavLink to={item.url} end className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
              <item.icon className="h-5 w-5 shrink-0" />
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
          <CollapsibleTrigger className="flex items-center gap-2 px-4 py-2 w-full text-sidebar-foreground/50 text-xs uppercase tracking-wider hover:text-sidebar-foreground/80">
            {React.createElement(icon, { className: 'h-4 w-4' })}
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
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          {!collapsed ? (
            <div>
              <h2 className="font-bold text-base text-sidebar-primary">
                {isVistos ? 'VORTEX VISTOS' : 'GRUPO VORTEX'}
              </h2>
              <p className="text-xs text-sidebar-foreground/60">Gerenciador</p>
            </div>
          ) : (
            <span className="text-sidebar-primary font-bold text-lg">V</span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">Menu</SidebarGroupLabel>
          <SidebarGroupContent>{renderMenuItems(filterItems(mainItems))}</SidebarGroupContent>
        </SidebarGroup>

        {renderCollapsibleGroup('Financeiro', DollarSign, filteredFinancial, isFinancialActive)}
        {renderCollapsibleGroup('Relatórios', BarChart3, filteredReports, isReportsActive)}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">Admin</SidebarGroupLabel>
            <SidebarGroupContent>{renderMenuItems(adminItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto p-4 border-t border-sidebar-border">
          {!collapsed && userEmail && (
            <p className="text-xs text-sidebar-foreground/50 truncate mb-2">{userEmail}</p>
          )}
          <Button variant="ghost" size={collapsed ? 'icon' : 'sm'} className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => supabase.auth.signOut()}>
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
  const accessibleCompanies = companies.filter(c => userCompanyIds.includes(c.id));
  const showSelector = isMaster && accessibleCompanies.length > 1;

  const [pendingCompany, setPendingCompany] = useState<typeof activeCompany>(null);
  const [showConfirm, setShowConfirm] = useState(false);

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
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 shrink-0 gap-3">
            <SidebarTrigger className="mr-1">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            {showSelector && (
              <Select
                value={activeCompany?.id || ''}
                onValueChange={handleCompanyChange}
              >
                <SelectTrigger className="w-[200px] h-9 text-sm">
                  <Building className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!showSelector && activeCompany && (
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Building className="h-4 w-4" />
                {activeCompany.name}
              </span>
            )}
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>

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
