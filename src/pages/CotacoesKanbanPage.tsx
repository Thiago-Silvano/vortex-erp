import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, LayoutGrid, List, Eye, Trash2, Filter, X,
  MapPin, Users, Calendar, DollarSign, AlertTriangle, Clock,
  Plane, Hotel, Car, Ticket, FileText, Link2, MessageCircle,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
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
  { id: 'col-5', name: 'Fechada', color: '#22c55e', statusKey: 'emitido', sortOrder: 4 },
  { id: 'col-6', name: 'Perdida', color: '#ef4444', statusKey: 'perdido', sortOrder: 5 },
];

interface SellerOption {
  id: string;
  full_name: string;
}

export default function CotacoesKanbanPage() {
  const [sales, setSales] = useState<KanbanSale[]>([]);
  const [columns, setColumns] = useState<KanbanColumnData[]>(DEFAULT_COLUMNS);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [filterSeller, setFilterSeller] = useState('all');
  const [filterDestination, setFilterDestination] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KanbanSale | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
  const { activeCompany } = useCompany();

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
          setColumns(data.map(d => ({
            id: d.id,
            name: d.name,
            color: d.color,
            statusKey: d.status_key,
            sortOrder: d.sort_order,
          })));
        } else {
          setColumns(DEFAULT_COLUMNS);
        }
      });
  }, [activeCompany?.id]);

  // Load cotações (draft sales)
  const fetchSales = async () => {
    if (!activeCompany?.id) return;

    // Fetch sales with seller info
    const { data: salesData } = await supabase
      .from('sales')
      .select('id, client_name, destination_name, trip_start_date, trip_end_date, total_sale, passengers_count, created_at, updated_at, sale_workflow_status, status, short_id, seller_id')
      .eq('empresa_id', activeCompany.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (!salesData) return;

    // Get seller names
    const sellerIds = [...new Set(salesData.filter(s => s.seller_id).map(s => s.seller_id!))];
    let sellerMap: Record<string, string> = {};
    if (sellerIds.length > 0) {
      const { data: sellersData } = await supabase.from('sellers').select('id, full_name').in('id', sellerIds);
      if (sellersData) sellerMap = Object.fromEntries(sellersData.map(s => [s.id, s.full_name]));
    }

    // Get sale items metadata for service icons
    const saleIds = salesData.map(s => s.id);
    let itemsMap: Record<string, { has_aereo: boolean; has_hotel: boolean; has_carro: boolean; has_experiencia: boolean }> = {};
    if (saleIds.length > 0) {
      const { data: items } = await supabase.from('sale_items').select('sale_id, metadata').in('sale_id', saleIds);
      if (items) {
        for (const item of items) {
          if (!itemsMap[item.sale_id]) itemsMap[item.sale_id] = { has_aereo: false, has_hotel: false, has_carro: false, has_experiencia: false };
          const meta = item.metadata as any;
          const type = meta?.service_type || meta?.type || '';
          if (type === 'aereo') itemsMap[item.sale_id].has_aereo = true;
          if (type === 'hotel') itemsMap[item.sale_id].has_hotel = true;
          if (type === 'carro' || type === 'transfer') itemsMap[item.sale_id].has_carro = true;
          if (type === 'experiencia' || type === 'ingresso') itemsMap[item.sale_id].has_experiencia = true;
        }
      }
    }

    setSales(salesData.map(s => ({
      ...s,
      seller_name: s.seller_id ? sellerMap[s.seller_id] : undefined,
      ...itemsMap[s.id],
    })) as KanbanSale[]);
  };

  useEffect(() => { fetchSales(); }, [activeCompany?.id]);

  // Filter logic
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (search && !normalize(s.client_name).includes(normalize(search)) && !normalize(s.destination_name || '').includes(normalize(search))) return false;
      if (filterSeller !== 'all' && s.seller_name !== filterSeller) return false;
      if (filterDestination !== 'all' && s.destination_name !== filterDestination) return false;
      if (filterStatus !== 'all' && s.sale_workflow_status !== filterStatus) return false;
      return true;
    });
  }, [sales, search, filterSeller, filterDestination, filterStatus]);

  const destinations = useMemo(() => [...new Set(sales.map(s => s.destination_name).filter(Boolean))], [sales]);

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

  // Stats
  const totalCotacoes = filteredSales.length;
  const totalValor = filteredSales.reduce((sum, s) => sum + Number(s.total_sale || 0), 0);
  const staleCount = filteredSales.filter(s => differenceInDays(new Date(), new Date(s.updated_at)) >= 3).length;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Cotações</h1>
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
            <div className="flex items-center border rounded-lg overflow-hidden">
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
            </div>
            <Button onClick={() => navigate('/sales/new')} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Cotação
            </Button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar cliente ou destino..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {(filterSeller !== 'all' || filterDestination !== 'all' || filterStatus !== 'all') && (
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {[filterSeller, filterDestination, filterStatus].filter(f => f !== 'all').length}
              </span>
            )}
          </Button>
        </div>

        {/* Filter row */}
        {showFilters && (
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
                <SelectItem value="all">Todos status</SelectItem>
                {columns.map(c => <SelectItem key={c.statusKey} value={c.statusKey}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterSeller !== 'all' || filterDestination !== 'all' || filterStatus !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterSeller('all'); setFilterDestination('all'); setFilterStatus('all'); }}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <KanbanBoard
            columns={columns}
            sales={filteredSales}
            onMoveCard={handleMoveCard}
            onViewSale={handleViewSale}
          />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <>
            {/* Desktop Table */}
            <Card className="hidden sm:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Pax</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</TableCell></TableRow>
                    ) : filteredSales.map(s => {
                      const col = columns.find(c => c.statusKey === s.sale_workflow_status) || columns[0];
                      const daysSince = differenceInDays(new Date(), new Date(s.updated_at));
                      return (
                        <TableRow key={s.id} className={cn('cursor-pointer hover:bg-muted/50', daysSince >= 3 && 'bg-destructive/5')} onClick={() => handleViewSale(s.id)}>
                          <TableCell className="font-medium">{s.client_name}</TableCell>
                          <TableCell>{s.destination_name || '-'}</TableCell>
                          <TableCell>
                            {s.trip_start_date ? format(new Date(s.trip_start_date + 'T12:00:00'), 'dd/MM') : '-'}
                            {s.trip_end_date && ` - ${format(new Date(s.trip_end_date + 'T12:00:00'), 'dd/MM')}`}
                          </TableCell>
                          <TableCell>{fmt(Number(s.total_sale))}</TableCell>
                          <TableCell>{s.passengers_count || 1}</TableCell>
                          <TableCell>{s.seller_name || '-'}</TableCell>
                          <TableCell>
                            <Badge className="border" style={{ backgroundColor: col.color + '20', color: col.color, borderColor: col.color + '50' }}>
                              {col.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'dd/MM/yy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleViewSale(s.id); }}><Eye className="h-4 w-4" /></Button>
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

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {filteredSales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</p>
              ) : filteredSales.map(s => {
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
                      <span className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'dd/MM/yy')}</span>
                    </div>
                  </Card>
                );
              })}
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
