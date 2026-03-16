import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/contexts/CompanyContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface SaleRow {
  id: string;
  client_name: string;
  sale_date: string;
  total_sale: number;
  net_profit: number;
  status: string;
  payment_method: string;
  created_at: string;
  sale_workflow_status: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [search, setSearch] = useState('');
  const [showVendas, setShowVendas] = useState(true);
  const [showCotacoes, setShowCotacoes] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SaleRow | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const navigate = useNavigate();
  const { activeCompany } = useCompany();

  const fetchSales = () => {
    let query = supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    query.then(({ data }) => { if (data) setSales(data as SaleRow[]); });
  };

  useEffect(() => {
    fetchSales();
  }, [activeCompany?.id]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const isAdminEmail = user.email === 'thiago@vortexviagens.com.br';
      const { data: permsData } = await supabase
        .from('user_permissions')
        .select('user_role')
        .eq('user_id', user.id)
        .single();
      const role = (permsData as any)?.user_role || (isAdminEmail ? 'master' : 'vendedor');
      setIsMaster(role === 'master' || isAdminEmail);
    });
  }, []);

  const canDelete = (sale: SaleRow) => {
    if (sale.status === 'draft') return true;
    if (sale.status === 'active' && isMaster) return true;
    return false;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const saleId = deleteTarget.id;

    try {
      // Delete sale_item_images first (FK dependency)
      const { data: saleItems } = await supabase.from('sale_items').select('id').eq('sale_id', saleId);
      if (saleItems) {
        for (const si of saleItems) {
          await (supabase.from('sale_item_images' as any) as any).delete().eq('sale_item_id', si.id);
        }
      }

      // Delete all related records in cascade
      await supabase.from('receivables').delete().eq('sale_id', saleId);
      await supabase.from('accounts_payable').delete().eq('sale_id', saleId);
      await supabase.from('seller_commissions').delete().eq('sale_id', saleId);
      await supabase.from('sale_items').delete().eq('sale_id', saleId);
      await supabase.from('sale_suppliers').delete().eq('sale_id', saleId);
      await (supabase.from('sale_passengers' as any) as any).delete().eq('sale_id', saleId);
      await supabase.from('reservations').delete().eq('sale_id', saleId);

      // Delete calendar events related to this sale (by client name + date)
      if (deleteTarget.client_name && activeCompany?.id) {
        await supabase.from('calendar_events')
          .delete()
          .eq('empresa_id', activeCompany.id)
          .ilike('title', `%${deleteTarget.client_name}%`);
      }

      // Delete the sale itself
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      if (error) throw error;

      toast.success(deleteTarget.status === 'draft' ? 'Rascunho excluído!' : 'Venda e todos os lançamentos relacionados foram excluídos!');
      setDeleteTarget(null);
      fetchSales();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || ''));
    }
  };

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = sales
    .filter(s => {
      if (!showVendas && s.status === 'active') return false;
      if (!showCotacoes && s.status === 'draft') return false;
      return normalize(s.client_name).includes(normalize(search));
    });

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const workflowStatusMap: Record<string, { label: string; color: string }> = {
    em_aberto: { label: 'Em aberto', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    contatando: { label: 'Contatando', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    reservado: { label: 'Reservado', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    emitido: { label: 'Emitido', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    perdido: { label: 'Perdido', color: 'bg-red-100 text-red-800 border-red-300' },
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Vendas & Cotações</h1>
          <Button onClick={() => navigate('/sales/new')} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Nova Cotação</Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por cliente..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={showVendas} onCheckedChange={(v) => setShowVendas(!!v)} />
              <Badge variant="default" className="cursor-pointer">Emitidas</Badge>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={showCotacoes} onCheckedChange={(v) => setShowCotacoes(!!v)} />
              <Badge variant="outline" className="cursor-pointer">Cotações</Badge>
            </label>
          </div>
        </div>

        {/* Desktop Table */}
        <Card className="hidden sm:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data da Venda</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Lucro Líq.</TableHead>
                  <TableHead>Status Venda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell></TableRow>
                 ) : filtered.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/sales/new', { state: { editSaleId: s.id } })}>
                    <TableCell className="font-medium">{s.client_name}</TableCell>
                    <TableCell>{s.sale_date ? format(new Date(s.sale_date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="capitalize">{s.payment_method}</TableCell>
                    <TableCell>{fmt(Number(s.total_sale))}</TableCell>
                    <TableCell>{fmt(Number(s.net_profit))}</TableCell>
                    <TableCell>
                      {(() => {
                        const ws = workflowStatusMap[s.sale_workflow_status || 'em_aberto'] || workflowStatusMap.em_aberto;
                        return <Badge className={`${ws.color} border`} variant="outline">{ws.label}</Badge>;
                      })()}
                    </TableCell>
                    <TableCell><Badge variant={s.status === 'active' ? 'default' : s.status === 'draft' ? 'outline' : 'secondary'}>{s.status === 'active' ? 'Venda' : s.status === 'draft' ? 'Cotação' : s.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate('/sales/new', { state: { editSaleId: s.id } })}><Eye className="h-4 w-4" /></Button>
                        {canDelete(s) && (
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</p>
          ) : filtered.map(s => (
             <Card key={s.id} className="p-4 cursor-pointer" onClick={() => navigate('/sales/new', { state: { editSaleId: s.id } })}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{s.client_name}</p>
                  <p className="text-xs text-muted-foreground">{s.sale_date ? format(new Date(s.sale_date + 'T12:00:00'), 'dd/MM/yyyy') : '-'} · <span className="capitalize">{s.payment_method}</span></p>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  {(() => {
                    const ws = workflowStatusMap[s.sale_workflow_status || 'em_aberto'] || workflowStatusMap.em_aberto;
                    return <Badge className={`${ws.color} border text-xs`} variant="outline">{ws.label}</Badge>;
                  })()}
                  <Badge variant={s.status === 'active' ? 'default' : s.status === 'draft' ? 'outline' : 'secondary'} className="text-xs">
                    {s.status === 'active' ? 'Ativa' : s.status === 'draft' ? 'Rascunho' : s.status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-4 text-sm">
                  <span>Total: <strong>{fmt(Number(s.total_sale))}</strong></span>
                  <span>Lucro: <strong>{fmt(Number(s.net_profit))}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => navigate('/sales/new', { state: { editSaleId: s.id } })}><Eye className="h-4 w-4" /></Button>
                  {canDelete(s) && (
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteTarget?.status === 'draft' ? 'Excluir Rascunho' : 'Excluir Venda'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.status === 'draft'
                  ? `Tem certeza que deseja excluir o rascunho de "${deleteTarget?.client_name}"? Esta ação não pode ser desfeita.`
                  : `Tem certeza que deseja excluir a venda de "${deleteTarget?.client_name}"? Todos os lançamentos financeiros (contas a receber, contas a pagar, comissões), reservas e eventos no calendário relacionados serão permanentemente excluídos. Esta ação não pode ser desfeita.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}