import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import React from "react";
import {
  LogOut, Building, User, Camera, MessageCircle, Mail, Bell,
  ChevronDown, Plus, Users, ShoppingCart, Plane, DollarSign,
  Megaphone, MessageSquare, FileText, BarChart3, Settings,
  Star, StarOff, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import PhotoCaptureModal from "@/components/PhotoCaptureModal";
import NotificationBell from "@/components/NotificationBell";

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

/* ─── Favoritos ────────────────────────────────────── */
const FAVORITES_KEY = "vortex_menu_favorites";

function loadFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch { return []; }
}

function saveFavorites(favs: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

/* ─── Último módulo ────────────────────────────────── */
const LAST_MODULE_KEY = "vortex_last_module";

function saveLastModule(url: string) {
  localStorage.setItem(LAST_MODULE_KEY, url);
}

/* ─── Permissões ───────────────────────────────────── */
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
      } else {
        if (userEmail === "thiago@vortexviagens.com.br") setUserRole("master");
      }
    });
  }, [userId, userEmail]);

  const isAdmin = userRole === "master" || userEmail === "thiago@vortexviagens.com.br";
  const hasPerm = (key?: string) => !key || isAdmin || !!permissions[key];

  return { userEmail, isAdmin, hasPerm };
}

/* ─── Menu Principal ───────────────────────────────── */
function TopMenuBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeCompany } = useCompany();
  const { hasPerm, isAdmin } = usePermissions();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const menuRef = useRef<HTMLDivElement>(null);

  const isVistos = activeCompany?.slug === "vortex-vistos";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    saveLastModule(location.pathname);
  }, [location.pathname]);

  const toggleFavorite = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = favorites.includes(url)
      ? favorites.filter(f => f !== url)
      : [...favorites, url];
    setFavorites(next);
    saveFavorites(next);
  };

  const handleNavigate = (url: string) => {
    navigate(url);
    setOpenMenu(null);
  };

  /* ─── Definição dos menus por fluxo operacional ─── */
  const vistosMenus: MenuGroup[] = [
    {
      label: "Clientes",
      icon: <Users className="h-3 w-3" />,
      items: [
        { title: "Clientes", url: "/clients", permKey: "clients_view" },
        { title: "Contatos WhatsApp", url: "/whatsapp/contacts" },
      ],
    },
    {
      label: "Comercial",
      icon: <ShoppingCart className="h-3 w-3" />,
      items: [
        { title: "Dashboard", url: "/vistos/dashboard" },
        { title: "Vendas", url: "/vistos/sales", permKey: "sales_view" },
        { title: "Produção", url: "/vistos/production" },
        { title: "DS-160 Grupo", url: "/vistos/ds160" },
        { title: "Serviços", url: "/vistos/products" },
      ],
    },
    {
      label: "Financeiro",
      icon: <DollarSign className="h-3 w-3" />,
      items: [
        { title: "Contas a Receber", url: "/financial/receivable", permKey: "financial_receivable" },
        { title: "Contas a Pagar", url: "/financial/payable", permKey: "financial_payable" },
        { title: "Contas Correntes", url: "/financial/bank-accounts", permKey: "financial_bank_accounts" },
        { title: "Conciliação Bancária", url: "/financial/reconciliation", permKey: "financial_reconciliation" },
        { title: "Fluxo de Caixa", url: "/financial/cashflow", permKey: "financial_cashflow" },
        { title: "Centros de Custo", url: "/financial/cost-centers", permKey: "financial_cashflow" },
        { title: "Relatório de Conta", url: "/financial/bank-report", permKey: "financial_bank_report" },
        { title: "Agrupar Contas", url: "/financial/group-accounts", permKey: "financial_payable" },
        { title: "Desagrupar Contas", url: "/financial/ungroup-accounts", permKey: "financial_payable" },
      ],
    },
    {
      label: "WhatsApp",
      icon: <MessageSquare className="h-3 w-3" />,
      url: "/whatsapp",
      items: [
        { title: "Conversas", url: "/whatsapp" },
        { title: "Contatos", url: "/whatsapp/contacts" },
        { title: "Etiquetas", url: "/whatsapp/labels" },
        { title: "Respostas Rápidas", url: "/whatsapp/quick-replies" },
        { title: "Configurações", url: "/whatsapp/settings" },
      ],
    },
    {
      label: "Relatórios",
      icon: <BarChart3 className="h-3 w-3" />,
      items: [{ title: "Relatórios", url: "/vistos/reports" }],
    },
    ...(isAdmin ? [{
      label: "Sistema",
      icon: <Settings className="h-3 w-3" />,
      items: [
        { title: "Usuários", url: "/users" },
        { title: "Aparência", url: "/settings/appearance" },
        { title: "Configurações", url: "/settings", permKey: "settings_access" },
        { title: "Calendário", url: "/calendar" },
        { title: "Email", url: "/email" },
      ],
    }] : []),
  ];

  const viagensMenus: MenuGroup[] = [
    {
      label: "Cadastros",
      icon: <Users className="h-3 w-3" />,
      items: [
        { title: "Clientes", url: "/clients", permKey: "clients_view" },
        { title: "Fornecedores", url: "/suppliers", permKey: "suppliers_view" },
        { title: "Vendedores", url: "/sellers", permKey: "sellers_view" },
        { title: "Usuários", url: "/users" },
        { title: "Cias aéreas", url: "/airlines" },
        { title: "Contratos", url: "/contracts/templates" },
        { title: "Centro de Custo", url: "/financial/cost-centers", permKey: "financial_cashflow" },
        { title: "Conta-corrente", url: "/financial/bank-accounts", permKey: "financial_bank_accounts" },
      ],
    },
    {
      label: "Vendas",
      icon: <ShoppingCart className="h-3 w-3" />,
      url: "/sales",
      items: [
        { title: "Vendas", url: "/sales", permKey: "sales_view" },
      ],
    },
    {
      label: "Cotações",
      icon: <FileText className="h-3 w-3" />,
      items: [
        { title: "Lista de Cotações", url: "/cotacoes/lista", permKey: "sales_view" },
        { title: "Kanban de Cotações", url: "/cotacoes", permKey: "sales_view" },
        { title: "Cotações Arquivadas", url: "/cotacoes/arquivadas", permKey: "sales_view" },
      ],
    },
    {
      label: "Financeiro",
      icon: <DollarSign className="h-3 w-3" />,
      items: [
        { title: "Contas a Pagar", url: "/financial/payable", permKey: "financial_payable" },
        { title: "Contas a Receber", url: "/financial/receivable", permKey: "financial_receivable" },
        { title: "Conciliação Bancária", url: "/financial/reconciliation", permKey: "financial_reconciliation" },
        { title: "Extrato de conta-corrente", url: "/financial/bank-report", permKey: "financial_bank_report" },
        { title: "Fluxo de Caixa", url: "/financial/cashflow", permKey: "financial_cashflow" },
        { title: "Comissões", url: "/financial/commissions", permKey: "financial_commissions" },
        { title: "Agrupar Contas", url: "/financial/group-accounts", permKey: "financial_payable" },
        { title: "Desagrupar Contas", url: "/financial/ungroup-accounts", permKey: "financial_payable" },
      ],
    },
    {
      label: "Operação",
      icon: <Plane className="h-3 w-3" />,
      items: [
        { title: "Reservas", url: "/reservations", permKey: "reservations_view" },
        { title: "Vouchers", url: "/sales/vouchers", permKey: "sales_view" },
        { title: "Calendário", url: "/calendar" },
      ],
    },
    {
      label: "Marketing",
      icon: <Megaphone className="h-3 w-3" />,
      items: [
        { title: "Lâminas de promoções", url: "/promo-maker" },
        { title: "Roteiros", url: "/itineraries" },
      ],
    },
    {
      label: "WhatsApp",
      icon: <MessageSquare className="h-3 w-3" />,
      url: "/whatsapp",
      items: [
        { title: "Contatos Whatsapp", url: "/whatsapp/contacts" },
        { title: "Etiquetas", url: "/whatsapp/labels" },
        { title: "Respostas Rápidas", url: "/whatsapp/quick-replies" },
        { title: "Configuração", url: "/whatsapp/settings" },
      ],
    },
    {
      label: "Fiscal",
      icon: <FileText className="h-3 w-3" />,
      items: [
        { title: "Dashboard Fiscal", url: "/nfse" },
        { title: "Emitir NFS-e", url: "/nfse/emit" },
        { title: "Notas Emitidas", url: "/nfse/list" },
        { title: "Serviços Fiscais", url: "/nfse/services" },
        { title: "Certificado Digital", url: "/nfse/certificate" },
        { title: "Configurações", url: "/nfse/settings" },
      ],
    },
    {
      label: "Sistema",
      icon: <Settings className="h-3 w-3" />,
      items: [
        ...(isAdmin ? [
          { title: "Configurações", url: "/settings", permKey: "settings_access" },
          { title: "Integrações de API", url: "/settings/api-integrations", permKey: "settings_access" },
          { title: "Configurações gerais", url: "/settings", permKey: "settings_access" },
          { title: "Aparência", url: "/settings/appearance", permKey: "settings_access" },
        ] : []),
        { title: "Email", url: "/email" },
      ],
    },
  ];

  const menus = isVistos ? vistosMenus : viagensMenus;

  // Build flat map for favorites
  const allItems: MenuItem[] = menus.flatMap(g => g.items);
  const favItems = favorites
    .map(url => allItems.find(i => i.url === url))
    .filter((i): i is MenuItem => !!i && hasPerm(i.permKey));

  return (
    <div ref={menuRef} className="relative">
      {/* Main menu bar */}
      <nav className="flex items-center bg-[hsl(220,60%,50%)] h-7 px-0.5 gap-0 select-none">
        {menus.map((group) => {
          const filteredItems = group.items.filter((i) => hasPerm(i.permKey));
          if (filteredItems.length === 0) return null;
          const isOpen = openMenu === group.label;
          const isSingleItem = filteredItems.length === 1 && group.url;

          return (
            <div
              key={group.label}
              className="relative"
              onMouseEnter={() => {
                if (!isSingleItem) setOpenMenu(group.label);
              }}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => {
                  if (isSingleItem && group.url) {
                    handleNavigate(group.url);
                  } else if (group.url) {
                    handleNavigate(group.url);
                  } else {
                    setOpenMenu(isOpen ? null : group.label);
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white/90 hover:text-white hover:bg-white/15 transition-none ${isOpen ? "bg-white/15 text-white" : ""}`}
              >
                {group.icon}
                {group.label}
                {!isSingleItem && filteredItems.length > 1 && (
                  <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                )}
              </button>

              {/* Dropdown */}
              {isOpen && !isSingleItem && filteredItems.length > 1 && (
                <div className="absolute top-full left-0 z-50 min-w-[170px] bg-popover border border-border/60 shadow-lg py-0.5 rounded-sm">
                  {filteredItems.map((item) => {
                    const isFav = favorites.includes(item.url);
                    const isItemActive = location.pathname === item.url;
                    return (
                      <button
                        key={item.url}
                        onClick={() => handleNavigate(item.url)}
                        className={`group w-full text-left px-2.5 py-[5px] text-[11px] flex items-center justify-between hover:bg-accent transition-none ${isItemActive ? "bg-accent text-accent-foreground font-medium" : "text-foreground/80"}`}
                      >
                        <span>{item.title}</span>
                        <span
                          onClick={(e) => toggleFavorite(item.url, e)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-pointer ml-2"
                          title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                        >
                          {isFav
                            ? <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                            : <StarOff className="h-3 w-3" />
                          }
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Favoritos */}
        {favItems.length > 0 && (
          <>
            <div className="w-px h-4 bg-white/20 mx-1" />
            {favItems.map((item) => (
              <button
                key={`fav-${item.url}`}
                onClick={() => handleNavigate(item.url)}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-none ${location.pathname === item.url ? "text-yellow-300" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                title={item.title}
              >
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                {item.title}
              </button>
            ))}
          </>
        )}
      </nav>
    </div>
  );
}

/* ─── Botão Voltar Global ───────────────────────────── */
function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const hiddenPaths = ["/", "/dashboard", "/vistos/dashboard"];
  if (hiddenPaths.includes(location.pathname)) return null;
  return (
    <div className="px-3 pt-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Button>
    </div>
  );
}

/* ─── Layout Principal ─────────────────────────────── */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { companies, activeCompany, setActiveCompany, userCompanyIds, isMaster } = useCompany();
  const { userEmail } = usePermissions();
  const navigate = useNavigate();
  const accessibleCompanies = companies.filter((c) => userCompanyIds.includes(c.id));
  const showSelector = isMaster && accessibleCompanies.length > 1;

  const [pendingCompany, setPendingCompany] = useState<typeof activeCompany>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

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

  const cancelSwitch = () => {
    setShowConfirm(false);
    setPendingCompany(null);
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Sticky top header + menu */}
      <div className="sticky top-0 z-50 bg-background">
        <header className="h-7 flex items-center bg-card border-b px-2 shrink-0 gap-2">
          {/* Logo - clicável volta à home (dashboard da empresa ativa) */}
          <button
            onClick={() => {
              const target = activeCompany?.slug === 'vortex-vistos' ? '/vistos/dashboard' : '/dashboard';
              navigate(target);
            }}
            className="text-[11px] font-bold text-primary tracking-wide mr-2 hover:opacity-80 transition-opacity cursor-pointer"
            title="Ir para o Dashboard"
          >
            GRUPO VORTEX
          </button>

          {/* Company selector */}
          {showSelector ? (
            <Select value={activeCompany?.id || ""} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-[150px] h-5 text-[11px] border-border/50 bg-secondary/50">
                <Building className="h-3 w-3 mr-1 shrink-0 text-primary" />
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                {accessibleCompanies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : activeCompany ? (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Building className="h-3 w-3 text-primary" />
              {activeCompany.name}
            </span>
          ) : null}

          {/* Nova Cotação */}
          <Button
            onClick={() => navigate("/sales/new")}
            size="sm"
            className="h-5 text-[10px] gap-1 bg-primary text-primary-foreground hover:bg-primary/90 ml-1 px-2"
          >
            <Plus className="h-3 w-3" />
            Nova Cotação
          </Button>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <Button
              onClick={() => navigate("/whatsapp")}
              size="sm"
              className="h-5 text-[10px] gap-1 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 px-2"
            >
              <MessageCircle className="h-3 w-3" />
              WhatsApp
            </Button>
            <Button onClick={() => navigate("/email")} size="sm" className="h-5 text-[10px] gap-1 px-2">
              <Mail className="h-3 w-3" />
              Email
            </Button>
            <Button onClick={() => setShowPhotoModal(true)} variant="ghost" size="sm" className="h-5 w-5 p-0">
              <Camera className="h-3 w-3" />
            </Button>
            <NotificationBell />
            {userEmail && (
              <span className="text-[10px] text-muted-foreground max-w-[100px] truncate hidden lg:inline">
                {userEmail}
              </span>
            )}
            <Button
              variant="ghost" size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                // Limpa cache local (preserva apenas chaves do supabase auth — já removidas pelo signOut)
                try {
                  const preserve = ['theme'];
                  const keys = Object.keys(localStorage);
                  keys.forEach(k => {
                    if (!preserve.includes(k) && !k.startsWith('sb-')) {
                      localStorage.removeItem(k);
                    }
                  });
                  sessionStorage.clear();
                } catch {}
                window.location.href = '/';
              }}
              title="Sair"
            >
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </header>

        <TopMenuBar />
      </div>

      <BackButton />

      <main className="flex-1 overflow-auto">{children}</main>

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
            <AlertDialogCancel onClick={cancelSwitch}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Sim, trocar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
