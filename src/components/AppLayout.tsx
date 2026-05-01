import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import React from "react";
import {
  LogOut, Building, Camera, MessageCircle, Mail, Plus,
  Users, ShoppingCart, Plane, DollarSign, Megaphone, MessageSquare,
  FileText, BarChart3, Settings, Star, ChevronRight, Search, ArrowLeft,
  Sun, Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import PhotoCaptureModal from "@/components/PhotoCaptureModal";
import NotificationBell from "@/components/NotificationBell";
import { useColorMode } from "@/contexts/ColorModeContext";

interface MenuItem {
  title: string;
  url: string;
  permKey?: string;
}
interface MenuGroup {
  label: string;
  icon?: React.ReactNode;
  url?: string;
  items: MenuItem[];
}

/* ─── Favoritos ─── */
const FAVORITES_KEY = "vortex_menu_favorites";
const loadFavorites = (): string[] => {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
};
const saveFavorites = (f: string[]) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(f));

/* ─── Último módulo ─── */
const LAST_MODULE_KEY = "vortex_last_module";
const saveLastModule = (url: string) => localStorage.setItem(LAST_MODULE_KEY, url);

/* ─── Permissões ─── */
function usePermissions() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("vendedor");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null);
      setUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    (supabase.from("user_permissions").select("*").eq("user_id", userId).single() as any).then(({ data }: any) => {
      if (data) {
        setUserRole(data.user_role);
        setPermissions(data.permissions || {});
      } else if (userEmail === "thiago@vortexviagens.com.br") {
        setUserRole("master");
      }
    });
  }, [userId, userEmail]);

  const isAdmin = userRole === "master" || userEmail === "thiago@vortexviagens.com.br";
  const hasPerm = (key?: string) => !key || isAdmin || !!permissions[key];

  return { userEmail, isAdmin, hasPerm };
}

/* ─── Menus ─── */
function buildMenus(isVistos: boolean, isAdmin: boolean): MenuGroup[] {
  if (isVistos) {
    return [
      { label: "Clientes", icon: <Users className="h-4 w-4" />, items: [
        { title: "Clientes", url: "/clients", permKey: "clients_view" },
        { title: "Contatos WhatsApp", url: "/whatsapp/contacts" },
      ]},
      { label: "Comercial", icon: <ShoppingCart className="h-4 w-4" />, items: [
        { title: "Dashboard", url: "/vistos/dashboard" },
        { title: "Vendas", url: "/vistos/sales", permKey: "sales_view" },
        { title: "Produção", url: "/vistos/production" },
        { title: "DS-160 Grupo", url: "/vistos/ds160" },
        { title: "Serviços", url: "/vistos/products" },
      ]},
      { label: "Financeiro", icon: <DollarSign className="h-4 w-4" />, items: [
        { title: "Contas a Receber", url: "/financial/receivable", permKey: "financial_receivable" },
        { title: "Contas a Pagar", url: "/financial/payable", permKey: "financial_payable" },
        { title: "Contas Correntes", url: "/financial/bank-accounts", permKey: "financial_bank_accounts" },
        { title: "Conciliação Bancária", url: "/financial/reconciliation", permKey: "financial_reconciliation" },
        { title: "Fluxo de Caixa", url: "/financial/cashflow", permKey: "financial_cashflow" },
        { title: "Centros de Custo", url: "/financial/cost-centers", permKey: "financial_cashflow" },
        { title: "Relatório de Conta", url: "/financial/bank-report", permKey: "financial_bank_report" },
        { title: "Agrupar Contas", url: "/financial/group-accounts", permKey: "financial_payable" },
        { title: "Desagrupar Contas", url: "/financial/ungroup-accounts", permKey: "financial_payable" },
      ]},
      { label: "WhatsApp", icon: <MessageSquare className="h-4 w-4" />, url: "/whatsapp", items: [
        { title: "Conversas", url: "/whatsapp" },
        { title: "Contatos", url: "/whatsapp/contacts" },
        { title: "Etiquetas", url: "/whatsapp/labels" },
        { title: "Respostas Rápidas", url: "/whatsapp/quick-replies" },
        { title: "Configurações", url: "/whatsapp/settings" },
      ]},
      { label: "Relatórios", icon: <BarChart3 className="h-4 w-4" />, items: [
        { title: "Relatórios", url: "/vistos/reports" },
      ]},
      ...(isAdmin ? [{ label: "Sistema", icon: <Settings className="h-4 w-4" />, items: [
        { title: "Usuários", url: "/users" },
        { title: "Aparência", url: "/settings/appearance" },
        { title: "Configurações", url: "/settings", permKey: "settings_access" },
        { title: "Calendário", url: "/calendar" },
        { title: "Email", url: "/email" },
      ]}] : []),
    ];
  }
  return [
    { label: "Cadastros", icon: <Users className="h-4 w-4" />, items: [
      { title: "Clientes", url: "/clients", permKey: "clients_view" },
      { title: "Fornecedores", url: "/suppliers", permKey: "suppliers_view" },
      { title: "Vendedores", url: "/sellers", permKey: "sellers_view" },
      { title: "Usuários", url: "/users" },
      { title: "Cias aéreas", url: "/airlines" },
      { title: "Contratos", url: "/contracts/templates" },
      { title: "Centro de Custo", url: "/financial/cost-centers", permKey: "financial_cashflow" },
      { title: "Conta-corrente", url: "/financial/bank-accounts", permKey: "financial_bank_accounts" },
    ]},
    { label: "Vendas", icon: <ShoppingCart className="h-4 w-4" />, url: "/sales", items: [
      { title: "Vendas", url: "/sales", permKey: "sales_view" },
    ]},
    { label: "Cotações", icon: <FileText className="h-4 w-4" />, items: [
      { title: "Lista de Cotações", url: "/cotacoes/lista", permKey: "sales_view" },
      { title: "Kanban de Cotações", url: "/cotacoes", permKey: "sales_view" },
      { title: "Cotações Arquivadas", url: "/cotacoes/arquivadas", permKey: "sales_view" },
    ]},
    { label: "Financeiro", icon: <DollarSign className="h-4 w-4" />, items: [
      { title: "Contas Pagar/Receber", url: "/financial/payable", permKey: "financial_payable" },
      { title: "Conciliação Bancária", url: "/financial/reconciliation", permKey: "financial_reconciliation" },
      { title: "Extrato de conta-corrente", url: "/financial/bank-report", permKey: "financial_bank_report" },
      { title: "Fluxo de Caixa", url: "/financial/cashflow", permKey: "financial_cashflow" },
      { title: "Comissões", url: "/financial/commissions", permKey: "financial_commissions" },
      { title: "Agrupar Contas", url: "/financial/group-accounts", permKey: "financial_payable" },
      { title: "Desagrupar Contas", url: "/financial/ungroup-accounts", permKey: "financial_payable" },
    ]},
    { label: "Operação", icon: <Plane className="h-4 w-4" />, items: [
      { title: "Reservas", url: "/reservations", permKey: "reservations_view" },
      { title: "Vouchers", url: "/sales/vouchers", permKey: "sales_view" },
      { title: "Calendário", url: "/calendar" },
    ]},
    { label: "Marketing", icon: <Megaphone className="h-4 w-4" />, items: [
      { title: "Lâminas de promoções", url: "/promo-maker" },
      { title: "Roteiros", url: "/itineraries" },
    ]},
    { label: "WhatsApp", icon: <MessageSquare className="h-4 w-4" />, url: "/whatsapp", items: [
      { title: "Conversas", url: "/whatsapp" },
      { title: "Contatos Whatsapp", url: "/whatsapp/contacts" },
      { title: "Etiquetas", url: "/whatsapp/labels" },
      { title: "Respostas Rápidas", url: "/whatsapp/quick-replies" },
      { title: "Configuração", url: "/whatsapp/settings" },
    ]},
    { label: "Fiscal", icon: <FileText className="h-4 w-4" />, items: [
      { title: "Dashboard Fiscal", url: "/nfse" },
      { title: "Emitir NFS-e", url: "/nfse/emit" },
      { title: "Notas Emitidas", url: "/nfse/list" },
      { title: "Serviços Fiscais", url: "/nfse/services" },
      { title: "Certificado Digital", url: "/nfse/certificate" },
      { title: "Configurações", url: "/nfse/settings" },
    ]},
    { label: "Sistema", icon: <Settings className="h-4 w-4" />, items: [
      ...(isAdmin ? [
        { title: "Configurações", url: "/settings", permKey: "settings_access" },
        { title: "Integrações de API", url: "/settings/api-integrations", permKey: "settings_access" },
        { title: "Aparência", url: "/settings/appearance", permKey: "settings_access" },
      ] : []),
      { title: "Email", url: "/email" },
    ]},
  ];
}

/* ─── Sidebar Component ─── */
function AppSidebar({ favorites, toggleFavorite }: {
  favorites: string[];
  toggleFavorite: (url: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeCompany } = useCompany();
  const { hasPerm, isAdmin } = usePermissions();
  const isVistos = activeCompany?.slug === "vortex-vistos";

  const menus = useMemo(() => buildMenus(isVistos, isAdmin), [isVistos, isAdmin]);

  const allItems = useMemo(() => menus.flatMap(g => g.items), [menus]);
  const favItems = favorites
    .map(url => allItems.find(i => i.url === url))
    .filter((i): i is MenuItem => !!i && hasPerm(i.permKey));

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <button
          onClick={() => {
            const target = activeCompany?.slug === "vortex-vistos" ? "/vistos/dashboard" : "/dashboard";
            navigate(target);
          }}
          className="flex items-center gap-2 group"
        >
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
            V
          </div>
          <div className="flex-1 min-w-0 text-left group-data-[collapsible=icon]:hidden">
            <div className="text-[13px] font-medium text-foreground tracking-tight truncate">
              GRUPO VORTEX
            </div>
            {activeCompany && (
              <div className="text-[10px] text-muted-foreground truncate">
                {activeCompany.name}
              </div>
            )}
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {/* Favoritos */}
        {favItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
              Favoritos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favItems.map((item) => (
                  <SidebarMenuItem key={`fav-${item.url}`}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <button onClick={() => navigate(item.url)} className="flex items-center gap-2 w-full">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning shrink-0" />
                        <span className="truncate text-[13px]">{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Grupos */}
        {menus.map(group => {
          const items = group.items.filter(i => hasPerm(i.permKey));
          if (items.length === 0) return null;
          const groupHasActive = items.some(i => isActive(i.url));
          const isSingle = items.length === 1 && group.url;

          if (isSingle) {
            const item = items[0];
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={group.label}
                      >
                        <button onClick={() => navigate(item.url)} className="flex items-center gap-2 w-full">
                          {group.icon}
                          <span className="truncate text-[13px]">{group.label}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <Collapsible key={group.label} defaultOpen={groupHasActive} className="group/collapse">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-[10px] uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground font-medium py-1.5 px-2">
                    {group.icon && <span className="opacity-70">{group.icon}</span>}
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]/collapse:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map(item => {
                        const isFav = favorites.includes(item.url);
                        return (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive(item.url)}
                              tooltip={item.title}
                              className="group/item"
                            >
                              <button onClick={() => navigate(item.url)} className="flex items-center gap-2 w-full pl-6">
                                <span className="truncate text-[13px] flex-1 text-left">{item.title}</span>
                                <span
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(item.url); }}
                                  className={`shrink-0 ${isFav ? "opacity-100" : "opacity-0 group-hover/item:opacity-60 hover:!opacity-100"}`}
                                  title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                >
                                  <Star className={`h-3 w-3 ${isFav ? "fill-warning text-warning" : ""}`} />
                                </span>
                              </button>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 gap-1">
        <button
          onClick={() => navigate("/whatsapp")}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="truncate group-data-[collapsible=icon]:hidden">WhatsApp</span>
        </button>
        <button
          onClick={() => navigate("/email")}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Mail className="h-4 w-4 shrink-0" />
          <span className="truncate group-data-[collapsible=icon]:hidden">Email</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

/* ─── Topbar (interna ao app-main) ─── */
function Topbar({
  onCompanyChange, onNewQuote, onPhoto, onLogout, userEmail, accessibleCompanies, activeCompany, showSelector,
}: {
  onCompanyChange: (val: string) => void;
  onNewQuote: () => void;
  onPhoto: () => void;
  onLogout: () => void;
  userEmail: string | null;
  accessibleCompanies: any[];
  activeCompany: any;
  showSelector: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const hideBack = ["/", "/dashboard", "/vistos/dashboard"].includes(location.pathname);
  const { mode, toggle } = useColorMode();

  return (
    <header className="h-12 flex items-center gap-2 px-4 border-b border-border bg-background shrink-0">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      {!hideBack && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Button>
      )}

      {showSelector ? (
        <Select value={activeCompany?.id || ""} onValueChange={onCompanyChange}>
          <SelectTrigger className="w-[170px] h-7 text-[12px]">
            <Building className="h-3 w-3 mr-1 text-primary" />
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            {accessibleCompanies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          onClick={onNewQuote}
          size="sm"
          className="h-7 text-[11px] gap-1 px-2.5"
        >
          <Plus className="h-3 w-3" /> Nova Cotação
        </Button>
        <Button
          onClick={toggle}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title={mode === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
        >
          {mode === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
        <Button onClick={onPhoto} variant="ghost" size="sm" className="h-7 w-7 p-0">
          <Camera className="h-3.5 w-3.5" />
        </Button>
        <NotificationBell />
        {userEmail && (
          <span className="text-[10px] text-muted-foreground max-w-[140px] truncate hidden lg:inline">
            {userEmail}
          </span>
        )}
        <Button
          variant="ghost" size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={onLogout}
          title="Sair"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}

/* ─── Layout Principal ─── */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { companies, activeCompany, setActiveCompany, userCompanyIds, isMaster } = useCompany();
  const { userEmail } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const accessibleCompanies = companies.filter((c) => userCompanyIds.includes(c.id));
  const showSelector = isMaster && accessibleCompanies.length > 1;

  const [pendingCompany, setPendingCompany] = useState<typeof activeCompany>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  useEffect(() => { saveLastModule(location.pathname); }, [location.pathname]);

  const toggleFavorite = (url: string) => {
    const next = favorites.includes(url) ? favorites.filter(f => f !== url) : [...favorites, url];
    setFavorites(next);
    saveFavorites(next);
  };

  const handleCompanyChange = (val: string) => {
    const comp = companies.find((c) => c.id === val);
    if (!comp || comp.id === activeCompany?.id) return;
    setPendingCompany(comp);
    setShowConfirm(true);
  };

  const confirmSwitch = () => {
    if (pendingCompany) {
      setActiveCompany(pendingCompany);
      navigate("/dashboard");
      toast.success(`Empresa alterada para ${pendingCompany.name}`);
    }
    setShowConfirm(false);
    setPendingCompany(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    try {
      const preserve = ['theme'];
      Object.keys(localStorage).forEach(k => {
        if (!preserve.includes(k) && !k.startsWith('sb-')) localStorage.removeItem(k);
      });
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar favorites={favorites} toggleFavorite={toggleFavorite} />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Topbar
            onCompanyChange={handleCompanyChange}
            onNewQuote={() => navigate("/sales/new")}
            onPhoto={() => setShowPhotoModal(true)}
            onLogout={handleLogout}
            userEmail={userEmail}
            accessibleCompanies={accessibleCompanies}
            activeCompany={activeCompany}
            showSelector={showSelector}
          />

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>

        <PhotoCaptureModal open={showPhotoModal} onOpenChange={setShowPhotoModal} />

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Trocar de empresa?</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a mudar para <strong>{pendingCompany?.name}</strong>. Qualquer cadastro em andamento será perdido. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setShowConfirm(false); setPendingCompany(null); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSwitch}>Sim, trocar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
}
