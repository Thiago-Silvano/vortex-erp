import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/contexts/CompanyContext';

interface SaleRow {
  id: string;
  client_name: string;
  sale_date: string;
  total_sale: number;
  net_profit: number;
  status: string;
  payment_method: string;
  created_at: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { activeCompany } = useCompany();

  useEffect(() => {
    let query = supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    query.then(({ data }) => { if (data) setSales(data as SaleRow[]); });
  }, [activeCompany?.id]);

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = sales.filter(s => normalize(s.client_name).includes(normalize(search)));

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
          <Button onClick={() => navigate('/sales/new')}><Plus className="h-4 w-4 mr-2" />Nova Venda</Button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data da Venda</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Lucro Líq.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell></TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.client_name}</TableCell>
                    <TableCell>{s.sale_date ? format(new Date(s.sale_date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="capitalize">{s.payment_method}</TableCell>
                    <TableCell>{fmt(Number(s.total_sale))}</TableCell>
                    <TableCell>{fmt(Number(s.net_profit))}</TableCell>
                    <TableCell><Badge variant={s.status === 'active' ? 'default' : s.status === 'draft' ? 'outline' : 'secondary'}>{s.status === 'active' ? 'Ativa' : s.status === 'draft' ? 'Rascunho' : s.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => navigate('/sales/new', { state: { editSaleId: s.id } })}><Eye className="h-4 w-4" /></Button>
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
