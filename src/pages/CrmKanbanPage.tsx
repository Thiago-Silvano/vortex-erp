import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  DragStartEvent, DragEndEvent,
} from '@dnd-kit/core';
import AppLayout from '@/components/AppLayout';
import CrmKanbanColumn, { CrmColumnData } from '@/components/crm-kanban/CrmKanbanColumn';
import CrmKanbanCard, { CrmLead } from '@/components/crm-kanban/CrmKanbanCard';
import CrmWhatsAppDrawer from '@/components/crm-kanban/CrmWhatsAppDrawer';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Plus, Search, Filter, X, AlertTriangle, TrendingUp,
  Users, DollarSign, Clock, Target,
} from 'lucide-react';
import { differenceInHours, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { getProfilePic, getServerUrl } from '@/lib/whatsappApi';

const CRM_COLUMNS: CrmColumnData[] = [
  { id: 'col-1', name: 'Novos Leads', color: '#3b82f6', statusKey: 'em_aberto', sortOrder: 0 },
  { id: 'col-2', name: 'Em Atendimento', color: '#8b5cf6', statusKey: 'contatando', sortOrder: 1 },
  { id: 'col-3', name: 'Cotações Enviadas', color: '#f97316', statusKey: 'proposta_enviada', sortOrder: 2 },
  { id: 'col-4', name: 'Negociando', color: '#eab308', statusKey: 'negociacao', sortOrder: 3 },
];

interface SellerOption { id: string; full_name: string; }

export default function CrmKanbanPage() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [columns, setColumns] = useState<CrmColumnData[]>(CRM_COLUMNS);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [search, setSearch] = useState('');
  const [filterSeller, setFilterSeller] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [drawerLead, setDrawerLead] = useState<CrmLead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profilePics, setProfilePics] = useState<Record<string, string | null>>({});

  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const empresaId = activeCompany?.id || '';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || ''));
  }, []);

  // Load sellers
  useEffect(() => {
    if (!empresaId) return;
    supabase.from('sellers').select('id, full_name').eq('empresa_id', empresaId).eq('status', 'active')
      .then(({ data }) => { if (data) setSellers(data); });
  }, [empresaId]);

  // Load columns from DB
  useEffect(() => {
    if (!empresaId) return;
    supabase.from('kanban_columns').select('*').eq('empresa_id', empresaId).order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setColumns(data.map(d => ({
            id: d.id, name: d.name, color: d.color,
            statusKey: d.status_key, sortOrder: d.sort_order,
          })));
        }
      });
  }, [empresaId]);

  // Load sales/leads with WhatsApp data
  const fetchLeads = useCallback(async () => {
    if (!empresaId) return;

    const { data: salesData } = await supabase
      .from('sales')
      .select('id, client_name, client_phone, destination_name, total_sale, passengers_count, created_at, updated_at, sale_workflow_status, status, short_id, seller_id')
      .eq('empresa_id', empresaId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (!salesData) return;

    // Get seller names
    const sellerIds = [...new Set(salesData.filter(s => (s as any).seller_id).map(s => (s as any).seller_id!))];
    let sellerMap: Record<string, string> = {};
    if (sellerIds.length > 0) {
      const { data: sellersData } = await supabase.from('sellers').select('id, full_name').in('id', sellerIds);
      if (sellersData) sellerMap = Object.fromEntries(sellersData.map(s => [s.id, s.full_name]));
    }

    // Get WhatsApp data - match by phone OR contact_name
    let whatsappMap: Record<string, { last_message: string; last_message_at: string; unread_count: number; phone: string }> = {};
    
    // First pass: match by phone
    const phones = [...new Set(salesData.map(s => (s as any).client_phone).filter(Boolean))] as string[];
    if (phones.length > 0) {
      for (const phone of phones) {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 8) continue;
        const { data: convs } = await (supabase
          .from('whatsapp_conversations')
          .select('last_message, last_message_at, unread_count, phone')
          .eq('empresa_id', empresaId)
          .or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone.slice(-8)}%`)
          .order('last_message_at', { ascending: false })
          .limit(1) as any);
        if (convs?.[0]) {
          whatsappMap[cleanPhone] = {
            last_message: convs[0].last_message,
            last_message_at: convs[0].last_message_at,
            unread_count: convs[0].unread_count || 0,
            phone: convs[0].phone || cleanPhone,
          };
        }
      }
    }

    // Second pass: for sales without phone or without a match, try matching by contact_name
    const unmatchedSales = salesData.filter((s: any) => {
      const cp = (s.client_phone || '').replace(/\D/g, '');
      return !cp || cp.length < 8 || !whatsappMap[cp];
    });
    if (unmatchedSales.length > 0) {
      const names = [...new Set(unmatchedSales.map((s: any) => s.client_name).filter(Boolean))];
      for (const name of names) {
        const { data: convs } = await (supabase
          .from('whatsapp_conversations')
          .select('last_message, last_message_at, unread_count, phone, contact_name')
          .eq('empresa_id', empresaId)
          .ilike('contact_name', name)
          .order('last_message_at', { ascending: false })
          .limit(1) as any);
        if (convs?.[0]) {
          // Use name as key prefixed to avoid collision
          whatsappMap[`name:${name}`] = {
            last_message: convs[0].last_message,
            last_message_at: convs[0].last_message_at,
            unread_count: convs[0].unread_count || 0,
            phone: convs[0].phone || '',
          };
        }
      }
    }

    const mappedLeads: CrmLead[] = salesData.map((s: any) => {
      const cleanPhone = (s.client_phone || '').replace(/\D/g, '');
      const wa = whatsappMap[cleanPhone] || whatsappMap[`name:${s.client_name}`];
      const effectivePhone = cleanPhone || wa?.phone || '';
      return {
        id: s.id,
        client_name: s.client_name,
        client_phone: s.client_phone || (wa?.phone ? wa.phone : undefined),
        destination_name: s.destination_name,
        total_sale: s.total_sale,
        passengers_count: s.passengers_count,
        seller_name: s.seller_id ? sellerMap[s.seller_id] : undefined,
        seller_id: s.seller_id,
        created_at: s.created_at,
        updated_at: s.updated_at,
        sale_workflow_status: s.sale_workflow_status || 'em_aberto',
        status: s.status,
        short_id: s.short_id,
        last_whatsapp_message: wa?.last_message,
        last_whatsapp_at: wa?.last_message_at,
        whatsapp_unread: wa?.unread_count,
        profile_pic: profilePics[effectivePhone] || null,
        has_quote: true,
        quote_status: s.sale_workflow_status === 'proposta_enviada' ? 'sent' : s.sale_workflow_status === 'negociacao' ? 'viewed' : 'not_sent',
      };
    });

    setLeads(mappedLeads);
  }, [empresaId, profilePics]);

  useEffect(() => { fetchLeads(); }, [empresaId]);

  // Load profile pics
  useEffect(() => {
    if (!empresaId || !leads.length) return;
    const loadPics = async () => {
      try {
        const serverUrl = await getServerUrl(empresaId);
        if (serverUrl.includes('localhost')) return;
        for (const lead of leads) {
          const phone = (lead.client_phone || '').replace(/\D/g, '');
          if (!phone || profilePics[phone] !== undefined) continue;
          setProfilePics(prev => ({ ...prev, [phone]: null }));
          try {
            const url = await getProfilePic(serverUrl, empresaId, phone);
            if (url) {
              const { data } = await supabase.functions.invoke('proxy-image', { body: { url } });
              setProfilePics(prev => ({ ...prev, [phone]: data?.dataUrl || url }));
            }
          } catch {}
        }
      } catch {}
    };
    loadPics();
  }, [leads.length, empresaId]);

  // Realtime updates
  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel(`crm-kanban-realtime-${empresaId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `empresa_id=eq.${empresaId}`,
      }, () => {
        fetchLeads();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_conversations',
        filter: `empresa_id=eq.${empresaId}`,
      }, () => {
        fetchLeads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [empresaId, fetchLeads]);

  // Filters
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (search && !normalize(l.client_name).includes(normalize(search)) && !normalize(l.client_phone || '').includes(normalize(search))) return false;
      if (filterSeller !== 'all' && l.seller_name !== filterSeller) return false;
      if (filterStatus !== 'all' && l.sale_workflow_status !== filterStatus) return false;
      return true;
    });
  }, [leads, search, filterSeller, filterStatus]);

  const leadsByColumn = useMemo(() => {
    const map: Record<string, CrmLead[]> = {};
    columns.forEach(c => { map[c.statusKey] = []; });
    filteredLeads.forEach(l => {
      const key = l.sale_workflow_status || 'em_aberto';
      if (map[key]) map[key].push(l);
      else if (map['em_aberto']) map['em_aberto'].push(l);
    });
    return map;
  }, [columns, filteredLeads]);

  // Stats
  const totalLeads = filteredLeads.length;
  const totalValue = filteredLeads.reduce((sum, l) => sum + Number(l.total_sale || 0), 0);
  const staleCount = filteredLeads.filter(l => differenceInHours(new Date(), new Date(l.last_whatsapp_at || l.updated_at)) >= 24).length;
  const unreadTotal = filteredLeads.reduce((sum, l) => sum + (l.whatsapp_unread || 0), 0);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const saleId = active.id as string;
    const overId = over.id as string;

    const targetColumn = columns.find(c => c.statusKey === overId);
    const lead = leads.find(l => l.id === saleId);
    
    let newStatus = '';
    if (targetColumn) {
      newStatus = targetColumn.statusKey;
    } else {
      const targetLead = leads.find(l => l.id === overId);
      if (targetLead) newStatus = targetLead.sale_workflow_status;
    }

    if (!newStatus || !lead || lead.sale_workflow_status === newStatus) return;

    // Optimistic
    setLeads(prev => prev.map(l => l.id === saleId ? { ...l, sale_workflow_status: newStatus } : l));

    const { error } = await supabase.from('sales').update({
      sale_workflow_status: newStatus,
      updated_at: new Date().toISOString(),
    } as any).eq('id', saleId);

    if (error) {
      setLeads(prev => prev.map(l => l.id === saleId ? { ...l, sale_workflow_status: lead.sale_workflow_status } : l));
      toast.error('Erro ao mover lead');
      return;
    }

    // If moved to "ganhos", convert to sale
    if (newStatus === 'emitido' && lead.status === 'draft') {
      await supabase.from('sales').update({ status: 'confirmed' } as any).eq('id', saleId);
      setLeads(prev => prev.map(l => l.id === saleId ? { ...l, status: 'confirmed' } : l));
    }

    await supabase.from('quote_status_log').insert({
      sale_id: saleId, empresa_id: empresaId,
      from_status: lead.sale_workflow_status, to_status: newStatus,
      changed_by: userEmail,
    } as any);

    const colName = columns.find(c => c.statusKey === newStatus)?.name || newStatus;
    toast.success(`Movido para "${colName}"`);
  }, [columns, leads, empresaId, userEmail]);

  // Actions
  const handleOpenChat = (lead: CrmLead) => {
    setDrawerLead(lead);
    setDrawerOpen(true);
  };

  const handleOpenQuote = (lead: CrmLead) => {
    navigate('/sales/new', { state: { editSaleId: lead.id } });
  };

  const handleEdit = (lead: CrmLead) => {
    if (lead.short_id) {
      const link = `${window.location.origin}/proposta/${lead.short_id}`;
      window.open(link, '_blank');
    } else {
      toast.error('Esta venda não possui um link de proposta.');
    }
  };

  const [convertTarget, setConvertTarget] = useState<CrmLead | null>(null);

  const handleConvert = (lead: CrmLead) => {
    setConvertTarget(lead);
  };

  const confirmConvert = async () => {
    if (!convertTarget) return;
    const { error } = await supabase.from('sales').update({
      status: 'confirmed',
      sale_workflow_status: 'emitido',
      updated_at: new Date().toISOString(),
    } as any).eq('id', convertTarget.id);

    if (error) {
      toast.error('Erro ao converter');
      setConvertTarget(null);
      return;
    }

    setLeads(prev => prev.map(l => l.id === convertTarget.id ? { ...l, status: 'confirmed', sale_workflow_status: 'emitido' } : l));
    toast.success('Convertido em venda!');
    setConvertTarget(null);
  };

  const handleSendQuoteFromDrawer = (lead: CrmLead) => {
    navigate('/sales/new', { state: { editSaleId: lead.id } });
  };

  const handleFollowUp = async (lead: CrmLead) => {
    if (!lead.client_phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    // Pre-fill follow-up message
    toast.info('Mensagem de follow-up preparada no chat');
  };

  const activeLead = useMemo(() => leads.find(l => l.id === activeId), [activeId, leads]);
  const activeColumn = activeLead ? columns.find(c => c.statusKey === activeLead.sale_workflow_status) : null;

  return (
    <AppLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-foreground">Kanban CRM</h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Target className="h-3 w-3" />
                {totalLeads} cotações
              </Badge>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <DollarSign className="h-3 w-3" />
                {fmt(totalValue)}
              </Badge>
            </div>
          </div>
          <Button onClick={() => navigate('/sales/new')} size="sm" className="gap-1.5 h-7 text-xs">
            <Plus className="h-3.5 w-3.5" /> Nova Cotação
          </Button>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-7 text-xs" placeholder="Buscar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5 h-7 text-xs">
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {(filterSeller !== 'all' || filterStatus !== 'all') && (
              <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 text-[9px] flex items-center justify-center">
                {[filterSeller, filterStatus].filter(f => f !== 'all').length}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-md border">
            <Select value={filterSeller} onValueChange={setFilterSeller}>
              <SelectTrigger className="w-[160px] h-7 text-xs"><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos vendedores</SelectItem>
                {sellers.map(s => <SelectItem key={s.id} value={s.full_name}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {columns.map(c => <SelectItem key={c.statusKey} value={c.statusKey}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterSeller !== 'all' || filterStatus !== 'all') && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFilterSeller('all'); setFilterStatus('all'); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Limpar
              </Button>
            )}
          </div>
        )}

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4 px-0.5">
            {columns.sort((a, b) => a.sortOrder - b.sortOrder).map(col => (
              <CrmKanbanColumn
                key={col.id}
                column={col}
                leads={leadsByColumn[col.statusKey] || []}
                onOpenChat={handleOpenChat}
                onOpenQuote={handleOpenQuote}
                onConvert={handleConvert}
                onEdit={handleEdit}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && activeColumn ? (
              <div className="rotate-2 opacity-90">
                <CrmKanbanCard
                  lead={activeLead}
                  columnColor={activeColumn.color}
                  onOpenChat={() => {}}
                  onOpenQuote={() => {}}
                  onConvert={() => {}}
                  onEdit={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* WhatsApp Drawer */}
      <CrmWhatsAppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        lead={drawerLead}
        empresaId={empresaId}
        onSendQuote={handleSendQuoteFromDrawer}
        onConvert={handleConvert}
        onFollowUp={handleFollowUp}
      />

      {/* Convert Confirmation Dialog */}
      <AlertDialog open={!!convertTarget} onOpenChange={(open) => { if (!open) setConvertTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter em Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente converter a cotação de "{convertTarget?.client_name}" em venda?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConvert}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
