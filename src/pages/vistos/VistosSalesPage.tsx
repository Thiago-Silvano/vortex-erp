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
import { Plus, Search, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const { activeCompany } = useCompany();
  const [sales, setSales] = useState<VisaSale[]>([]);
  const [filter, setFilter] = useState('');

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

  const paymentLabels: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', boleto: 'Boleto' };

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
                      <Button variant="ghost" size="icon" onClick={() => navigate('/vistos/sales/edit', { state: { editSaleId: s.id } })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
