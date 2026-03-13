import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface VisaSale {
  id: string;
  client_name: string;
  sale_date: string;
  total_value: number;
  payment_method: string;
  status: string;
  product_name?: string;
}

export default function VistosSalesPage() {
  const navigate = useNavigate();
  const { activeCompany, isMaster } = useCompany();
  const [sales, setSales] = useState<VisaSale[]>([]);
  const [filter, setFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<VisaSale | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSales = async () => {
    if (!activeCompany?.id) return;
    const { data } = await supabase
      .from('visa_sales')
      .select('*, visa_products(name)')
      .eq('empresa_id', activeCompany.id)
      .order('sale_date', { ascending: false });

    if (data) {
      setSales(data.map((s: any) => ({
        ...s,
        product_name: s.visa_products?.name || '',
      })));
    }
  };

  useEffect(() => { fetchSales(); }, [activeCompany?.id]);

  const filtered = sales.filter(s =>
    s.client_name.toLowerCase().includes(filter.toLowerCase()) ||
    (s.product_name || '').toLowerCase().includes(filter.toLowerCase())
  );

  const paymentLabels: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', boleto: 'Boleto', cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Débito', transferencia: 'Transferência' };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Delete related receivables
      await supabase.from('receivables').delete().eq('visa_sale_id', deleteTarget.id);
      // Delete related applicants
      await supabase.from('visa_applicants').delete().eq('visa_sale_id', deleteTarget.id);
      // Delete related payments
      await supabase.from('visa_sale_payments').delete().eq('visa_sale_id', deleteTarget.id);
      // Delete related processes
      await supabase.from('visa_processes').delete().eq('visa_sale_id', deleteTarget.id);
      // Delete related commissions
      await supabase.from('seller_commissions').delete().eq('visa_sale_id', deleteTarget.id);
      // Delete the sale
      const { error } = await supabase.from('visa_sales').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Venda excluída com sucesso');
      setSales(prev => prev.filter(s => s.id !== deleteTarget.id));
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Vendas — Vistos</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-9 w-full sm:w-64" />
            </div>
            <Button onClick={() => navigate('/vistos/sales/new')}><Plus className="h-4 w-4 mr-1" /> Nova Venda</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada</TableCell></TableRow>
                 ) : filtered.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/vistos/sales/edit', { state: { editSaleId: s.id } })}>
                    <TableCell className="font-medium">{s.client_name}</TableCell>
                    <TableCell>{s.product_name}</TableCell>
                    <TableCell>{format(new Date(s.sale_date + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">R$ {(s.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{paymentLabels[s.payment_method] || s.payment_method}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                        {s.status === 'active' ? 'Ativa' : s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate('/vistos/sales/edit', { state: { editSaleId: s.id } }); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isMaster && (
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}>
                            <Trash2 className="h-4 w-4" />
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

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir venda</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a venda de <strong>{deleteTarget?.client_name}</strong>? Todas as parcelas no contas a receber serão excluídas. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
