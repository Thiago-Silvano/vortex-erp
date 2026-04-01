import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useRef } from 'react';
import React from 'react';
import {
  LogOut, Building, User, Camera, MessageCircle, Mail, Bell, ChevronDown, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompany } from '@/contexts/CompanyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import PhotoCaptureModal from '@/components/PhotoCaptureModal';
import NotificationBell from '@/components/NotificationBell';

interface MenuItem {
  title: string;
  url: string;
  permKey?: string;
}

interface MenuGroup {
  label: string;
  url?: string; // direct navigation URL for single-item menus
  items: MenuItem[];
}

function usePermissions() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('vendedor');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

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
    });
  }, [userId, userEmail]);

  const isAdmin = userRole === 'master' || userEmail === 'thiago@vortexviagens.com.br';
  const hasPerm = (key?: string) => !key || isAdmin || !!permissions[key];

  return { userEmail, isAdmin, hasPerm };
}

function TopMenuBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeCompany } = useCompany();
  const { hasPerm, isAdmin } = usePermissions();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isVistos = activeCompany?.slug === 'vortex-vistos';

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setOpenMenu(null);
  }, [location.pathname]);

  const menus: MenuGroup[] = isVistos ? [
    {
      label: 'Cadastros',
      items: [
        { title: 'Clientes', url: '/clients', permKey: 'clients_view' },
        { title: 'Fornecedores', url: '/suppliers', permKey: 'suppliers_view' },
        { title: 'Serviços', url: '/vistos/products' },
      ],
    },
    {
      label: 'Vendas',
      items: [
        { title: 'Dashboard', url: '/vistos/dashboard' },
        { title: 'Vendas', url: '/vistos/sales', permKey: 'sales_view' },
        { title: 'Produção', url: '/vistos/production' },
        { title: 'DS-160 Grupo', url: '/vistos/ds160' },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { title: 'Contas a Receber', url: '/financial/receivable', permKey: 'financial_receivable' },
        { title: 'Contas a Pagar', url: '/financial/payable', permKey: 'financial_payable' },
        { title: 'Agrupar Contas', url: '/financial/group-accounts', permKey: 'financial_payable' },
        { title: 'Desagrupar Contas', url: '/financial/ungroup-accounts', permKey: 'financial_payable' },
        { title: 'Contas Correntes', url: '/financial/bank-accounts', permKey: 'financial_bank_accounts' },
        { title: 'Conciliação Bancária', url: '/financial/reconciliation', permKey: 'financial_reconciliation' },
        { title: 'Fluxo de Caixa', url: '/financial/cashflow', permKey: 'financial_cashflow' },
        { title: 'Centros de Custo', url: '/financial/cost-centers', permKey: 'financial_cashflow' },
        { title: 'Relatório de Conta', url: '/financial/bank-report', permKey: 'financial_bank_report' },
      ],
    },
    {
      label: 'Relatórios',
      items: [
        { title: 'Relatórios', url: '/vistos/reports' },
      ],
    },
    {
      label: 'Ferramentas',
      items: [
        { title: 'Calendário', url: '/calendar' },
        { title: 'WhatsApp', url: '/whatsapp' },
        { title: 'Email', url: '/email' },
      ],
    },
  ] : [
    {
      label: 'Cadastros',
      items: [
        { title: 'Clientes', url: '/clients', permKey: 'clients_view' },
        { title: 'Fornecedores', url: '/suppliers', permKey: 'suppliers_view' },
        { title: 'Vendedores', url: '/sellers', permKey: 'sellers_view' },
        { title: 'Serviços', url: '/services', permKey: 'services_view' },
        { title: 'Cias Aéreas', url: '/airlines' },
      ],
    },
    {
      label: 'Vendas',
      items: [
        { title: 'Dashboard', url: '/dashboard' },
        { title: 'Vendas', url: '/sales', permKey: 'sales_view' },
        { title: 'Vouchers', url: '/sales/vouchers', permKey: 'sales_view' },
        { title: 'Roteiros', url: '/itineraries' },
        { title: 'Contratos', url: '/contracts/templates' },
      ],
    },
    {
      label: 'Cotações',
      url: '/cotacoes/lista',
      items: [
        { title: 'Cotações', url: '/cotacoes/lista', permKey: 'sales_view' },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { title: 'Contas a Receber', url: '/financial/receivable', permKey: 'financial_receivable' },
        { title: 'Contas a Pagar', url: '/financial/payable', permKey: 'financial_payable' },
        { title: 'Agrupar Contas', url: '/financial/group-accounts', permKey: 'financial_payable' },
        { title: 'Desagrupar Contas', url: '/financial/ungroup-accounts', permKey: 'financial_payable' },
        { title: 'Contas Correntes', url: '/financial/bank-accounts', permKey: 'financial_bank_accounts' },
        { title: 'Conciliação Bancária', url: '/financial/reconciliation', permKey: 'financial_reconciliation' },
        { title: 'Fluxo de Caixa', url: '/financial/cashflow', permKey: 'financial_cashflow' },
        { title: 'Comissões', url: '/financial/commissions', permKey: 'financial_commissions' },
        { title: 'Centros de Custo', url: '/financial/cost-centers', permKey: 'financial_cashflow' },
        { title: 'Relatório de Conta', url: '/financial/bank-report', permKey: 'financial_bank_report' },
      ],
    },
    {
      label: 'Reservas',
      url: '/reservations',
      items: [
        { title: 'Reservas', url: '/reservations', permKey: 'reservations_view' },
      ],
    },
    {
      label: 'Promo Maker',
      url: '/promo-maker',
      items: [
        { title: 'Promo Maker', url: '/promo-maker' },
      ],
    },
    {
      label: 'NFS-e',
      items: [
        { title: 'Dashboard Fiscal', url: '/nfse' },
        { title: 'Emitir NFS-e', url: '/nfse/emit' },
        { title: 'Notas Emitidas', url: '/nfse/list' },
        { title: 'Serviços Fiscais', url: '/nfse/services' },
        { title: 'Configurações', url: '/nfse/settings' },
        { title: 'Certificado Digital', url: '/nfse/certificate' },
      ],
    },
    {
      label: 'WhatsApp',
      items: [
        { title: 'Conversas', url: '/whatsapp' },
        { title: 'Contatos', url: '/whatsapp/contacts' },
        { title: 'Etiquetas', url: '/whatsapp/labels' },
        { title: 'Respostas Rápidas', url: '/whatsapp/quick-replies' },
        { title: 'Configurações', url: '/whatsapp/settings' },
      ],
    },
    {
      label: 'Ferramentas',
      items: [
        { title: 'Calendário', url: '/calendar' },
        { title: 'Email', url: '/email' },
        { title: 'Relatórios', url: '/reports/dashboard', permKey: 'reports_dashboard' },
        ...(isAdmin ? [
          { title: 'Configurações', url: '/settings', permKey: 'settings_access' },
          { title: 'Aparência', url: '/settings/appearance', permKey: 'settings_access' },
          { title: 'Usuários', url: '/users' },
        ] : []),
      ],
    },
  ];

  return (
    <div ref={menuRef} className="relative">
      {/* Main menu bar */}
      <nav className="flex items-center bg-secondary/60 border-b h-7 px-1 gap-0">
        {menus.map(group => {
          const filteredItems = group.items.filter(i => hasPerm(i.permKey));
          if (filteredItems.length === 0) return null;
          const isOpen = openMenu === group.label;
          const isActive = filteredItems.some(i => location.pathname === i.url || location.pathname.startsWith(i.url + '/'));

          const isSingleItem = filteredItems.length === 1 && group.url;

          return (
            <div
              key={group.label}
              className="relative"
              onMouseEnter={() => !isSingleItem && setOpenMenu(group.label)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => {
                  if (isSingleItem && group.url) {
                    navigate(group.url);
                    setOpenMenu(null);
                  } else {
                    setOpenMenu(isOpen ? null : group.label);
                  }
                }}
                className={`px-3 py-1 text-xs font-medium transition-colors hover:bg-accent ${isActive ? 'text-primary font-semibold' : 'text-foreground/80'} ${isOpen ? 'bg-accent' : ''}`}
              >
                {group.label}
              </button>
              {/* Dropdown */}
              {isOpen && !isSingleItem && (
                <div className="absolute top-full left-0 z-50 min-w-[180px] bg-popover border shadow-md py-0.5">
                  {filteredItems.map(item => (
                    <button
                      key={item.url}
                      onClick={() => navigate(item.url)}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${location.pathname === item.url ? 'bg-accent text-primary font-medium' : 'text-foreground/80'}`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { companies, activeCompany, setActiveCompany, userCompanyIds, isMaster } = useCompany();
  const { userEmail } = usePermissions();
  const navigate = useNavigate();
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
        <header className="h-8 flex items-center bg-card border-b px-2 shrink-0 gap-2">
          {/* Logo */}
          <span className="text-xs font-bold text-primary tracking-wide mr-3">
            {activeCompany?.slug === 'vortex-vistos' ? 'VORTEX VISTOS' : 'VORTEX'}
          </span>

          {/* Company selector */}
          {showSelector ? (
            <Select value={activeCompany?.id || ''} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-[160px] h-6 text-xs border-border/50 bg-secondary/50">
                <Building className="h-3 w-3 mr-1 shrink-0 text-primary" />
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                {accessibleCompanies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : activeCompany ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Building className="h-3 w-3 text-primary" />
              {activeCompany.name}
            </span>
          ) : null}

          {/* Nova Cotação button */}
          <Button
            onClick={() => navigate('/sales/new')}
            size="sm"
            className="h-6 text-[11px] gap-1 bg-primary text-primary-foreground hover:bg-primary/90 ml-2"
          >
            <Plus className="h-3 w-3" />
            Nova Cotação
          </Button>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <Button
              onClick={() => navigate('/whatsapp')}
              size="sm"
              className="h-6 text-[11px] gap-1 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
            >
              <MessageCircle className="h-3 w-3" />
              WhatsApp
            </Button>
            <Button
              onClick={() => navigate('/email')}
              size="sm"
              className="h-6 text-[11px] gap-1"
            >
              <Mail className="h-3 w-3" />
              Email
            </Button>
            <Button
              onClick={() => setShowPhotoModal(true)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <Camera className="h-3 w-3" />
            </Button>
            <NotificationBell />
            {userEmail && (
              <span className="text-[11px] text-muted-foreground max-w-[120px] truncate hidden lg:inline">
                {userEmail}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => supabase.auth.signOut()}
              title="Sair"
            >
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </header>

        {/* Horizontal menu */}
        <TopMenuBar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>

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
              Qualquer cadastro em andamento será perdido. Deseja continuar?
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
