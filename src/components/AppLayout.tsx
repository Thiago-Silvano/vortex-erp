import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard, FileText, Settings, Users, LogOut, Menu, CalendarDays,
  UserRound, Building2, ShoppingCart, BookOpen, DollarSign, ArrowDownCircle,
  ArrowUpCircle, BarChart3, Tag, PieChart, TrendingUp, ClipboardList,
  Plane, Award, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || null));
  }, []);

  const isAdmin = userEmail === 'thiago@vortexviagens.com.br';

  const mainItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Clientes', url: '/clients', icon: UserRound },
    { title: 'Fornecedores', url: '/suppliers', icon: Building2 },
    { title: 'Cotações', url: '/quotes', icon: FileText },
    { title: 'Vendas', url: '/sales', icon: ShoppingCart },
    { title: 'Reservas', url: '/reservations', icon: BookOpen },
    { title: 'Calendário', url: '/calendar', icon: CalendarDays },
  ];

  const financialItems = [
    { title: 'Contas a Receber', url: '/financial/receivable', icon: ArrowDownCircle },
    { title: 'Contas a Pagar', url: '/financial/payable', icon: ArrowUpCircle },
    { title: 'Fluxo de Caixa', url: '/financial/cashflow', icon: BarChart3 },
    { title: 'Centros de Custo', url: '/financial/cost-centers', icon: Tag },
  ];

  const reportItems = [
    { title: 'Dashboard Geral', url: '/reports/dashboard', icon: PieChart },
    { title: 'Relatório de Vendas', url: '/reports/sales', icon: ShoppingCart },
    { title: 'Relatório Financeiro', url: '/reports/financial', icon: DollarSign },
    { title: 'Fluxo de Caixa', url: '/reports/cashflow', icon: TrendingUp },
    { title: 'Relatório de Clientes', url: '/reports/clients', icon: UserRound },
    { title: 'Relatório de Fornecedores', url: '/reports/suppliers', icon: Building2 },
    { title: 'Centro de Custo', url: '/reports/cost-centers', icon: Tag },
    { title: 'Relatório de Produtos', url: '/reports/products', icon: ClipboardList },
    { title: 'Relatório de Check-ins', url: '/reports/checkins', icon: Plane },
    { title: 'Lucro por Venda', url: '/reports/profit', icon: Award },
  ];

  const adminItems = [
    { title: 'Configurações', url: '/settings', icon: Settings },
    { title: 'Usuários', url: '/users', icon: Users },
  ];

  const isFinancialActive = location.pathname.startsWith('/financial');
  const isReportsActive = location.pathname.startsWith('/reports');

  const renderMenuItems = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
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

  const renderCollapsibleGroup = (label: string, icon: any, items: typeof mainItems, isActive: boolean) => (
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

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          {!collapsed ? (
            <div>
              <h2 className="font-bold text-base text-sidebar-primary">Vortex Viagens</h2>
              <p className="text-xs text-sidebar-foreground/60">Gerenciador</p>
            </div>
          ) : (
            <span className="text-sidebar-primary font-bold text-lg">V</span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">Menu</SidebarGroupLabel>
          <SidebarGroupContent>{renderMenuItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>

        {renderCollapsibleGroup('Financeiro', DollarSign, financialItems, isFinancialActive)}
        {renderCollapsibleGroup('Relatórios', BarChart3, reportItems, isReportsActive)}

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

import React from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 shrink-0">
            <SidebarTrigger className="mr-3">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
