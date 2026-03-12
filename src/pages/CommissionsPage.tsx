import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, CheckCircle, Clock, XCircle, Filter, TrendingUp, Award, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Commission {
  id: string;
  seller_id: string;
  sale_id: string | null;
  client_name: string;
  sale_date: string | null;
  payment_date: string | null;
  sale_value: number;
  received_value: number;
  cost_value: number;
  profit_value: number;
  commission_percentage: number;
  commission_value: number;
  commission_type: string;
  status: string;
  closing_id: string | null;
  notes: string;
  seller_name?: string;
}

interface Seller {
  id: string;
  full_name: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  closed: 'Fechada',
  paid: 'Paga',
  cancelled: 'Cancelada',
};

const statusVariant = (s: string) => {
  if (s === 'paid') return 'default';
  if (s === 'approved' || s === 'closed') return 'secondary';
  if (s === 'cancelled') return 'destructive';
  return 'outline';
};

export default function CommissionsPage() {
  const { activeCompany } = useCompany();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filterSeller, setFilterSeller] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFrom, setFilterFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterTo, setFilterTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [detailComm, setDetailComm] = useState<Commission | null>(null);

  const load = async () => {
    if (!activeCompany) return;
    const { data: sellersData } = await (supabase.from('sellers') as any).select('id, full_name').eq('empresa_id', activeCompany.id).order('full_name');
    if (sellersData) setSellers(sellersData);

    let query = (supabase.from('seller_commissions') as any).select('*').eq('empresa_id', activeCompany.id).order('created_at', { ascending: false });
    if (filterFrom) query = query.gte('sale_date', filterFrom);
    if (filterTo) query = query.lte('sale_date', filterTo);
    if (filterSeller !== 'all') query = query.eq('seller_id', filterSeller);
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    const { data } = await query;
    if (data) {
      const enriched = data.map((c: any) => ({
        ...c,
        seller_name: sellersData?.find((s: any) => s.id === c.seller_id)?.full_name || '',
      }));
      setCommissions(enriched);
    }
  };

  useEffect(() => { load(); }, [activeCompany, filterSeller, filterStatus, filterFrom, filterTo]);

  const updateStatus = async (id: string, newStatus: string) => {
    const comm = commissions.find(c => c.id === id);
    await (supabase.from('seller_commissions') as any).update({ status: newStatus, updated_at: new Date().toISOString(), payment_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null }).eq('id', id);

    // When marking as paid, update the related accounts_payable too
    if (newStatus === 'paid' && comm?.sale_id) {
      await supabase.from('accounts_payable').update({
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
      }).eq('sale_id', comm.sale_id).eq('origin_type', 'commission');
    }

    // When cancelling, also cancel the related accounts_payable
    if (newStatus === 'cancelled' && comm?.sale_id) {
      await supabase.from('accounts_payable').delete().eq('sale_id', comm.sale_id).eq('origin_type', 'commission');
    }

    toast.success(`Comissão ${statusLabels[newStatus]?.toLowerCase()}`);
    load();
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const totals = useMemo(() => {
    const pending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.commission_value, 0);
    const approved = commissions.filter(c => c.status === 'approved' || c.status === 'closed').reduce((s, c) => s + c.commission_value, 0);
    const paid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.commission_value, 0);
    const total = commissions.reduce((s, c) => s + c.commission_value, 0);
    return { pending, approved, paid, total };
  }, [commissions]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6" /> Comissões</h1>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-yellow-500" /><div><p className="text-sm text-muted-foreground">Pendentes</p><p className="text-xl font-bold">{fmt(totals.pending)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-blue-500" /><div><p className="text-sm text-muted-foreground">Aprovadas</p><p className="text-xl font-bold">{fmt(totals.approved)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-green-500" /><div><p className="text-sm text-muted-foreground">Pagas</p><p className="text-xl font-bold">{fmt(totals.paid)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Total</p><p className="text-xl font-bold">{fmt(totals.total)}</p></div></div></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div><Label>De</Label><Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="w-40" /></div>
              <div><Label>Até</Label><Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="w-40" /></div>
              <div><Label>Vendedor</Label>
                <Select value={filterSeller} onValueChange={setFilterSeller}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission Table */}
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Venda</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma comissão encontrada</TableCell></TableRow>
                ) : commissions.map(c => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailComm(c)}>
                    <TableCell>{c.sale_date ? format(new Date(c.sale_date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="font-medium">{c.seller_name}</TableCell>
                    <TableCell>{c.client_name}</TableCell>
                    <TableCell>{fmt(c.sale_value)}</TableCell>
                    <TableCell>{fmt(c.profit_value)}</TableCell>
                    <TableCell>{c.commission_percentage}%</TableCell>
                    <TableCell className="font-bold">{fmt(c.commission_value)}</TableCell>
                    <TableCell><Badge variant={statusVariant(c.status) as any}>{statusLabels[c.status] || c.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => setDetailComm(c)}><FileText className="h-4 w-4" /></Button>
                        {c.status === 'pending' && <Button variant="ghost" size="sm" onClick={() => updateStatus(c.id, 'approved')} title="Aprovar"><CheckCircle className="h-4 w-4 text-blue-500" /></Button>}
                        {c.status === 'approved' && <Button variant="ghost" size="sm" onClick={() => updateStatus(c.id, 'paid')} title="Marcar como paga"><DollarSign className="h-4 w-4 text-green-500" /></Button>}
                        {(c.status === 'pending' || c.status === 'approved') && <Button variant="ghost" size="sm" onClick={() => updateStatus(c.id, 'cancelled')} title="Cancelar"><XCircle className="h-4 w-4 text-destructive" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailComm} onOpenChange={() => setDetailComm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Memória de Cálculo</DialogTitle></DialogHeader>
          {detailComm && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p className="text-muted-foreground">Vendedor:</p><p className="font-medium">{detailComm.seller_name}</p>
                <p className="text-muted-foreground">Cliente:</p><p className="font-medium">{detailComm.client_name}</p>
                <p className="text-muted-foreground">Data da venda:</p><p>{detailComm.sale_date ? format(new Date(detailComm.sale_date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</p>
                <p className="text-muted-foreground">Valor da venda:</p><p>{fmt(detailComm.sale_value)}</p>
                <p className="text-muted-foreground">Valor recebido:</p><p>{fmt(detailComm.received_value)}</p>
                <p className="text-muted-foreground">Custo:</p><p>{fmt(detailComm.cost_value)}</p>
                <p className="text-muted-foreground">Lucro:</p><p>{fmt(detailComm.profit_value)}</p>
                <p className="text-muted-foreground">Tipo de comissão:</p><p>{detailComm.commission_type}</p>
                <p className="text-muted-foreground">Percentual:</p><p>{detailComm.commission_percentage}%</p>
                <p className="text-muted-foreground">Valor da comissão:</p><p className="font-bold text-primary">{fmt(detailComm.commission_value)}</p>
                <p className="text-muted-foreground">Status:</p><p><Badge variant={statusVariant(detailComm.status) as any}>{statusLabels[detailComm.status]}</Badge></p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
