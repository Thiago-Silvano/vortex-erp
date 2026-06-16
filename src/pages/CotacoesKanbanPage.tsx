import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import { KanbanColumnData } from '@/components/kanban/KanbanColumn';
import { KanbanSale } from '@/components/kanban/KanbanCard';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table';
import { TableLoadingRow } from '@/components/TableLoadingRow';

import { useTableSort } from '@/hooks/useTableSort';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, LayoutGrid, List, Eye, Trash2, Filter, X,
  MapPin, Users, Calendar, DollarSign, AlertTriangle, Clock,
  Plane, Hotel, Car, Ticket, FileText, Link2, MessageCircle, Copy, Archive, ArchiveRestore,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format, differenceInDays, isValid } from 'date-fns';

const safeFormat = (value: string | null | undefined, fmt: string, suffix = ''): string => {
  if (!value) return '-';
  const d = new Date(suffix ? value + suffix : value);
  return isValid(d) ? format(d, fmt) : '-';
};

const safeDate = (value: string | null | undefined, suffix = ''): Date | null => {
  if (!value) return null;
  const d = new Date(suffix ? value + suffix : value);
  return isValid(d) ? d : null;
};

const safeText = (value: unknown): string => String(value ?? '').trim();
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DEFAULT_COLUMNS: KanbanColumnData[] = [
  { id: 'col-1', name: 'Nova Cotação', color: '#eab308', statusKey: 'em_aberto', sortOrder: 0 },
  { id: 'col-2', name: 'Em Atendimento', color: '#3b82f6', statusKey: 'contatando', sortOrder: 1 },
  { id: 'col-3', name: 'Proposta Enviada', color: '#f97316', statusKey: 'proposta_enviada', sortOrder: 2 },
  { id: 'col-4', name: 'Negociação', color: '#a855f7', statusKey: 'negociacao', sortOrder: 3 },
];

interface SellerOption {
  id: string;
  full_name: string;
}

interface CotacoesKanbanPageProps {
  archivedView?: boolean;
}

export default function CotacoesKanbanPage({ archivedView = false }: CotacoesKanbanPageProps = {}) {
  const [sales, setSales] = useState<KanbanSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<KanbanColumnData[]>(DEFAULT_COLUMNS);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p === '/cotacoes/lista' || p === '/cotacoes/arquivadas') return 'list';
    }
    return 'kanban';
  });
  const [search, setSearch] = useState('');
  const [filterSeller, setFilterSeller] = useState('all');
  const [filterDestination, setFilterDestination] = useState('all');
  const [filterStatus, setFilterStatus] = useState(archivedView ? 'perdido' : 'all_except_lost');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KanbanSale | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const location = useLocation();

  // Sync view mode with the current route (component is shared between
  // /cotacoes and /cotacoes/lista, so it does not remount on navigation)
  useEffect(() => {
    const p = location.pathname;
    if (p === '/cotacoes/lista' || p === '/cotacoes/arquivadas') setViewMode('list');
    else if (p === '/cotacoes') setViewMode('kanban');
  }, [location.pathname]);

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || ''));
  }, []);

  // Load sellers
  useEffect(() => {
    if (!activeCompany?.id) return;
    supabase.from('sellers').select('id, full_name').eq('empresa_id', activeCompany.id).eq('status', 'active')
      .then(({ data }) => { if (data) setSellers(data); });
  }, [activeCompany?.id]);

  // Load kanban columns from DB (or use defaults)
  useEffect(() => {
    if (!activeCompany?.id) return;
    supabase.from('kanban_columns').select('*').eq('empresa_id', activeCompany.id).order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setColumns(
            data
              .filter(d => d.status_key !== 'perdido' && d.status_key !== 'emitido')
              .map(d => ({
                id: d.id,
                name: d.name,
                color: d.color,
                statusKey: d.status_key,
                sortOrder: d.sort_order,
              }))
          );
        } else {
          setColumns(DEFAULT_COLUMNS);
        }
      });
  }, [activeCompany?.id]);

  // Load cotações (draft sales)
  const PAGE_SIZE = 20;
  const paginatedMode = archivedView || viewMode === 'list';

  const fetchSales = async (append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      if (!activeCompany?.id) { setSales([]); setHasMore(false); return; }

      let q: any = supabase
        .from('sales')
        .select('id, client_name, destination_name, trip_start_date, trip_end_date, total_sale, passengers_count, created_at, updated_at, sale_workflow_status, status, short_id, seller_id')
        .eq('empresa_id', activeCompany.id)
        .eq('status', 'draft');

      if (paginatedMode) {
        // Apply status filter server-side
        if (archivedView) {
          q = q.eq('sale_workflow_status', 'perdido');
        } else if (filterStatus === 'all_except_lost') {
          q = q.not('sale_workflow_status', 'in', '(perdido,emitido)');
        } else if (filterStatus !== 'all') {
          q = q.eq('sale_workflow_status', filterStatus);
        }
        // Search server-side
        const term = debouncedSearch.trim();
        if (term) {
          const safe = term.replace(/[,()]/g, ' ');
          q = q.or(`client_name.ilike.%${safe}%,destination_name.ilike.%${safe}%`);
        }
      }

      q = q.order('created_at', { ascending: false });

      if (paginatedMode) {
        const from = append ? sales.length : 0;
        q = q.range(from, from + PAGE_SIZE - 1);
      } else {
        q = q.limit(500);
      }

      const { data: salesData, error: salesError } = await q;
      if (salesError) {
        console.error('Erro ao carregar cotações:', salesError);
        toast.error('Erro ao carregar cotações');
        if (!append) setSales([]);
        setHasMore(false);
        return;
      }
      if (!salesData) { if (!append) setSales([]); setHasMore(false); return; }

      // Fetch sellers and sale items in parallel (avoid sequential round trips)
      const sellerIds: string[] = Array.from(new Set(salesData.filter((s: any) => s.seller_id).map((s: any) => s.seller_id as string)));
      const saleIds: string[] = salesData.map((s: any) => s.id as string);

      const [sellersRes, itemsRes] = await Promise.all([
        sellerIds.length > 0
          ? supabase.from('sellers').select('id, full_name').in('id', sellerIds)
          : Promise.resolve({ data: [] as any[] }),
        saleIds.length > 0
          ? supabase.from('sale_items').select('sale_id, metadata').in('sale_id', saleIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const sellerMap: Record<string, string> = Object.fromEntries(
        (sellersRes.data || []).map((s: any) => [s.id, s.full_name])
      );

      const itemsMap: Record<string, { has_aereo: boolean; has_hotel: boolean; has_carro: boolean; has_experiencia: boolean }> = {};
      if (itemsRes.data) {
        for (const item of itemsRes.data as any[]) {
            if (!itemsMap[item.sale_id]) itemsMap[item.sale_id] = { has_aereo: false, has_hotel: false, has_carro: false, has_experiencia: false };
            const meta = item.metadata as any;
            const type = meta?.service_type || meta?.type || '';
            if (type === 'aereo') itemsMap[item.sale_id].has_aereo = true;
            if (type === 'hotel') itemsMap[item.sale_id].has_hotel = true;
            if (type === 'carro' || type === 'transfer') itemsMap[item.sale_id].has_carro = true;
            if (type === 'experiencia' || type === 'ingresso') itemsMap[item.sale_id].has_experiencia = true;
        }
      }

      const enriched = salesData.map((s: any) => ({
        ...s,
        id: safeText(s.id),
        client_name: safeText(s.client_name) || 'CLIENTE NÃO INFORMADO',
        destination_name: safeText(s.destination_name),
        trip_start_date: safeText(s.trip_start_date) || null,
        trip_end_date: safeText(s.trip_end_date) || null,
        total_sale: Number.isFinite(Number(s.total_sale)) ? Number(s.total_sale) : 0,
        passengers_count: Number.isFinite(Number(s.passengers_count)) ? Number(s.passengers_count) : 1,
        created_at: safeText(s.created_at),
        updated_at: safeText(s.updated_at),
        sale_workflow_status: safeText(s.sale_workflow_status) || 'em_aberto',
        status: safeText(s.status) || 'draft',
        short_id: safeText(s.short_id),
        seller_name: s.seller_id ? safeText(sellerMap[s.seller_id]) : undefined,
        ...itemsMap[s.id],
      })) as KanbanSale[];

      if (append) setSales(prev => [...prev, ...enriched]);
      else setSales(enriched);
      setHasMore(paginatedMode && salesData.length === PAGE_SIZE);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Debounce search input (avoid spamming DB on every keystroke)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Refetch first page whenever filters/view change
  useEffect(() => {
    fetchSales(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?.id, viewMode, archivedView, filterStatus, debouncedSearch]);

  // Filter logic
  const normalize = (s: unknown) => safeText(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (search && !normalize(s.client_name).includes(normalize(search)) && !normalize(s.destination_name).includes(normalize(search))) return false;
      if (filterSeller !== 'all' && s.seller_name !== filterSeller) return false;
      if (filterDestination !== 'all' && s.destination_name !== filterDestination) return false;
      if (archivedView) {
        // Em arquivadas, só mostra perdido (independente do filtro)
        if (s.sale_workflow_status !== 'perdido') return false;
      } else if (filterStatus === 'all_except_lost') {
        if (s.sale_workflow_status === 'perdido' || s.sale_workflow_status === 'emitido') return false;
      } else if (filterStatus !== 'all' && s.sale_workflow_status !== filterStatus) return false;
      return true;
    });
  }, [sales, search, filterSeller, filterDestination, filterStatus, archivedView]);

  const destinations = useMemo(() => [...new Set(sales.map(s => s.destination_name).filter(Boolean))], [sales]);

  // Ordenação por coluna
  const { sortedData: sortedSales, sortState, requestSort } = useTableSort(filteredSales, {
    client_name: (s) => s.client_name,
    destination_name: (s) => s.destination_name || '',
    trip_start_date: (s) => s.trip_start_date || '',
    total_sale: (s) => Number(s.total_sale || 0),
    passengers_count: (s) => Number(s.passengers_count || 0),
    seller_name: (s) => s.seller_name || '',
    status: (s) => s.sale_workflow_status || '',
    created_at: (s) => s.created_at,
  });

  // In paginated mode, the page already loaded only the current batch from DB
  const visibleSortedSales = sortedSales;
  const visibleFilteredSales = filteredSales;

  // Move card handler
  const handleMoveCard = async (saleId: string, newStatus: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    const oldStatus = sale.sale_workflow_status;

    // Optimistic update
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, sale_workflow_status: newStatus } : s));

    // Update DB
    const { error } = await supabase.from('sales').update({
      sale_workflow_status: newStatus,
      updated_at: new Date().toISOString(),
    } as any).eq('id', saleId);

    if (error) {
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, sale_workflow_status: oldStatus } : s));
      toast.error('Erro ao mover cotação');
      return;
    }

    // Log the movement
    await supabase.from('quote_status_log').insert({
      sale_id: saleId,
      empresa_id: activeCompany?.id,
      from_status: oldStatus,
      to_status: newStatus,
      changed_by: userEmail,
    } as any);

    const colName = columns.find(c => c.statusKey === newStatus)?.name || newStatus;
    toast.success(`Cotação movida para "${colName}"`);
  };

  const handleViewSale = (id: string) => {
    navigate('/sales/new', { state: { editSaleId: id } });
  };

  // Bulk selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedSales.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedSales.map(s => s.id)));
  };
  const handleBulkChangeStatus = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const colName = columns.find(c => c.statusKey === bulkStatus)?.name || bulkStatus;
    const { error } = await supabase.from('sales').update({
      sale_workflow_status: bulkStatus,
      updated_at: new Date().toISOString(),
    } as any).in('id', ids);
    if (error) { toast.error('Erro ao alterar status'); return; }
    // Log
    const logs = ids.map(id => ({
      sale_id: id,
      empresa_id: activeCompany?.id,
      from_status: sales.find(s => s.id === id)?.sale_workflow_status || '',
      to_status: bulkStatus,
      changed_by: userEmail,
    }));
    await supabase.from('quote_status_log').insert(logs as any);
    toast.success(`${ids.length} cotação(ões) movida(s) para "${colName}"`);
    setSelectedIds(new Set());
    setBulkStatus('');
    fetchSales();
  };

  const handleDuplicate = async (sale: KanbanSale) => {
    try {
      // 1. Fetch full sale record
      const { data: original, error: saleErr } = await supabase
        .from('sales')
        .select('*')
        .eq('id', sale.id)
        .single();
      if (saleErr || !original) throw new Error('Erro ao buscar cotação original');

      // 2. Create new sale copy
      const { id: _id, short_id: _sid, created_at: _ca, updated_at: _ua, ...saleFields } = original as any;
      const { data: newSale, error: insertErr } = await supabase
        .from('sales')
        .insert({
          ...saleFields,
          client_name: `Cópia de ${original.client_name}`,
          sale_workflow_status: 'em_aberto',
        } as any)
        .select('id')
        .single();
      if (insertErr || !newSale) throw new Error('Erro ao criar cópia');

      // 3. Copy sale_items
      const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
      if (items && items.length > 0) {
        const newItems = items.map((item: any) => {
          const { id: _iid, sale_id: _sid2, created_at: _ica, ...itemFields } = item;
          return { ...itemFields, sale_id: newSale.id };
        });
        await supabase.from('sale_items').insert(newItems as any);
      }

      // 4. Copy quote options
      const { data: options } = await supabase.from('sale_quote_options' as any).select('*').eq('sale_id', sale.id);
      if (options && (options as any[]).length > 0) {
        const oldToNew: Record<string, string> = {};
        for (const opt of options as any[]) {
          const { id: _oid, sale_id: _osid, created_at: _oca, ...optFields } = opt;
          const { data: newOpt } = await supabase.from('sale_quote_options' as any).insert({ ...optFields, sale_id: newSale.id } as any).select('id').single();
          if (newOpt) oldToNew[opt.id] = (newOpt as any).id;
        }
        // Update copied items with new option IDs
        if (Object.keys(oldToNew).length > 0) {
          const { data: copiedItems } = await supabase.from('sale_items').select('id, quote_option_id, metadata').eq('sale_id', newSale.id);
          if (copiedItems) {
            for (const ci of copiedItems as any[]) {
              if (ci.quote_option_id && oldToNew[ci.quote_option_id]) {
                await supabase.from('sale_items').update({ quote_option_id: oldToNew[ci.quote_option_id] } as any).eq('id', ci.id);
              }
            }
          }
        }
      }

      toast.success('Cotação duplicada com sucesso!');
      fetchSales();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao duplicar cotação');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { data: saleItems } = await supabase.from('sale_items').select('id').eq('sale_id', deleteTarget.id);
      if (saleItems) {
        for (const si of saleItems) {
          await (supabase.from('sale_item_images' as any) as any).delete().eq('sale_item_id', si.id);
        }
      }
      await supabase.from('sale_items').delete().eq('sale_id', deleteTarget.id);
      await supabase.from('sales').delete().eq('id', deleteTarget.id);
      toast.success('Cotação excluída!');
      setDeleteTarget(null);
      fetchSales();
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || ''));
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Stats — sempre excluem cotações perdidas dos totais e contadores
  const statsSales = useMemo(
    () => filteredSales.filter(s => s.sale_workflow_status !== 'perdido'),
    [filteredSales]
  );
  const totalCotacoes = statsSales.length;
  const totalValor = statsSales.reduce((sum, s) => sum + Number(s.total_sale || 0), 0);
  const staleCount = statsSales.filter(s => {
    const updatedAt = safeDate(s.updated_at);
    return updatedAt ? differenceInDays(new Date(), updatedAt) >= 3 : false;
  }).length;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {archivedView ? 'Cotações Arquivadas' : 'Cotações'}
            </h1>
            <Badge variant="secondary" className="text-sm">
              {totalCotacoes} cotaç{totalCotacoes !== 1 ? 'ões' : 'ão'} — {fmt(totalValor)}
            </Badge>
            {staleCount > 0 && (
              <Badge variant="destructive" className="text-sm gap-1">
                <AlertTriangle className="h-3 w-3" />
                {staleCount} sem interação
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            {!archivedView && <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>}
            {!archivedView && <Button onClick={() => navigate('/sales/new')} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Cotação
            </Button>}
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar cliente ou destino..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {!archivedView && <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {(filterSeller !== 'all' || filterDestination !== 'all' || filterStatus !== 'all_except_lost') && (
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {[
                  filterSeller !== 'all',
                  filterDestination !== 'all',
                  filterStatus !== 'all_except_lost',
                ].filter(Boolean).length}
              </span>
            )}
          </Button>}
        </div>

        {/* Filter row */}
        {!archivedView && showFilters && (
          <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg border">
            <Select value={filterSeller} onValueChange={setFilterSeller}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos vendedores</SelectItem>
                {sellers.map(s => <SelectItem key={s.id} value={s.full_name}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDestination} onValueChange={setFilterDestination}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Destino" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos destinos</SelectItem>
                {destinations.map(d => <SelectItem key={d} value={d!}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_except_lost">Todas exceto arquivadas</SelectItem>
                <SelectItem value="all">Todos status (incluindo arquivadas)</SelectItem>
                {columns.map(c => <SelectItem key={c.statusKey} value={c.statusKey}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterSeller !== 'all' || filterDestination !== 'all' || filterStatus !== 'all_except_lost') && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterSeller('all'); setFilterDestination('all'); setFilterStatus('all_except_lost'); }}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </div>
        )}

        {/* Kanban View */}
        {!archivedView && viewMode === 'kanban' && (
          <>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-lg border flex-wrap">
                <span className="text-sm font-medium">{selectedIds.size} selecionada(s)</span>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Mover para status..." /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => <SelectItem key={c.statusKey} value={c.statusKey}>{c.name}</SelectItem>)}
                    <SelectItem value="perdido">Arquivar</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleBulkChangeStatus} disabled={!bulkStatus}>
                  <Archive className="h-4 w-4 mr-1" /> Aplicar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  <X className="h-4 w-4 mr-1" /> Limpar seleção
                </Button>
              </div>
            )}
            <KanbanBoard
              columns={columns.filter(c => c.statusKey !== 'perdido')}
              sales={filteredSales}
              onMoveCard={handleMoveCard}
              onViewSale={handleViewSale}
              onDuplicate={handleDuplicate}
              onDelete={(s) => setDeleteTarget(s)}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </>
        )}

        {/* List View */}
        {(archivedView || viewMode === 'list') && (
          <>
            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-lg border flex-wrap">
                <span className="text-sm font-medium">{selectedIds.size} selecionada(s)</span>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Mover para status..." /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => <SelectItem key={c.statusKey} value={c.statusKey}>{c.name}</SelectItem>)}
                    {!archivedView && <SelectItem value="perdido">Arquivar</SelectItem>}
                    {archivedView && <SelectItem value="em_aberto">Desarquivar (Nova Cotação)</SelectItem>}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleBulkChangeStatus} disabled={!bulkStatus}>
                  {archivedView ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
                  Aplicar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  <X className="h-4 w-4 mr-1" /> Limpar seleção
                </Button>
              </div>
            )}
            {/* Desktop Table */}
            <Card className="hidden sm:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={sortedSales.length > 0 && selectedIds.size === sortedSales.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <SortableTableHead sortKey="client_name" sortState={sortState} onSort={requestSort}>Cliente</SortableTableHead>
                      <SortableTableHead sortKey="destination_name" sortState={sortState} onSort={requestSort}>Destino</SortableTableHead>
                      <SortableTableHead sortKey="trip_start_date" sortState={sortState} onSort={requestSort}>Período</SortableTableHead>
                      <SortableTableHead sortKey="total_sale" sortState={sortState} onSort={requestSort}>Valor</SortableTableHead>
                      <SortableTableHead sortKey="passengers_count" sortState={sortState} onSort={requestSort}>Pax</SortableTableHead>
                      <SortableTableHead sortKey="seller_name" sortState={sortState} onSort={requestSort}>Vendedor</SortableTableHead>
                      <SortableTableHead sortKey="status" sortState={sortState} onSort={requestSort}>Status</SortableTableHead>
                      <SortableTableHead sortKey="created_at" sortState={sortState} onSort={requestSort}>Criado</SortableTableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
          <TableLoadingRow colSpan={10} />
        ) : sortedSales.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</TableCell></TableRow>
                    ) : visibleSortedSales.map(s => {
                      const col = columns.find(c => c.statusKey === s.sale_workflow_status) || columns[0];
                      const updatedAt = safeDate(s.updated_at);
                      const daysSince = updatedAt ? differenceInDays(new Date(), updatedAt) : 0;
                      return (
                        <TableRow key={s.id} className={cn('cursor-pointer hover:bg-muted/50', daysSince >= 3 && 'bg-destructive/5')} onClick={() => handleViewSale(s.id)}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(s.id)}
                              onCheckedChange={() => toggleSelect(s.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{s.client_name}</TableCell>
                          <TableCell>{s.destination_name || '-'}</TableCell>
                          <TableCell>
                            {safeFormat(s.trip_start_date, 'dd/MM', 'T12:00:00')}
                            {s.trip_end_date && ` - ${safeFormat(s.trip_end_date, 'dd/MM', 'T12:00:00')}`}
                          </TableCell>
                          <TableCell>{fmt(Number(s.total_sale))}</TableCell>
                          <TableCell>{s.passengers_count || 1}</TableCell>
                          <TableCell>{s.seller_name || '-'}</TableCell>
                          <TableCell>
                            <Badge className="border" style={{ backgroundColor: col.color + '20', color: col.color, borderColor: col.color + '50' }}>
                              {col.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{safeFormat(s.created_at, 'dd/MM/yy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleViewSale(s.id); }}><Eye className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); if (s.short_id) { window.open(`${window.location.origin}/proposta/${s.short_id}`, '_blank'); } else { toast.error('Sem link de proposta'); } }} title="Orçamento Interativo"><Link2 className="h-4 w-4 text-primary" /></Button>
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDuplicate(s); }} title="Duplicar"><Copy className="h-4 w-4 text-muted-foreground" /></Button>
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {hasMore && (
              <div className="hidden sm:flex justify-center mt-3">
                <Button variant="outline" disabled={loadingMore} onClick={() => fetchSales(true)}>
                  {loadingMore ? 'Carregando...' : 'Carregar mais 20'}
                </Button>
              </div>
            )}

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {filteredSales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</p>
              ) : visibleFilteredSales.map(s => {
                const col = columns.find(c => c.statusKey === s.sale_workflow_status) || columns[0];
                return (
                  <Card key={s.id} className="p-4 cursor-pointer border-l-4" style={{ borderLeftColor: col.color }} onClick={() => handleViewSale(s.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{s.client_name}</p>
                        <p className="text-xs text-muted-foreground">{s.destination_name || 'Sem destino'}</p>
                      </div>
                      <Badge className="text-xs border shrink-0" style={{ backgroundColor: col.color + '20', color: col.color, borderColor: col.color + '50' }}>
                        {col.name}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <strong>{fmt(Number(s.total_sale))}</strong>
                      <span className="text-xs text-muted-foreground">{safeFormat(s.created_at, 'dd/MM/yy')}</span>
                    </div>
                  </Card>
                );
              })}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" disabled={loadingMore} onClick={() => fetchSales(true)}>
                    {loadingMore ? 'Carregando...' : 'Carregar mais 20'}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Cotação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a cotação de "{deleteTarget?.client_name}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
