import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReportClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('clients').select('*').order('full_name').then(({ data }) => { if (data) setClients(data); });
    supabase.from('sales').select('*').then(({ data }) => { if (data) setSales(data); });
  }, []);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const clientStats = useMemo(() => {
    return clients.map(c => {
      const clientSales = sales.filter(s => s.client_name?.toLowerCase() === c.full_name?.toLowerCase());
      return {
        ...c,
        numCompras: clientSales.length,
        totalGasto: clientSales.reduce((s, v) => s + Number(v.total_sale || 0), 0),
      };
    });
  }, [clients, sales]);

  const totalClientes = clients.length;
  const comCompras = clientStats.filter(c => c.numCompras > 0).length;
  const semCompras = totalClientes - comCompras;

  // Clients registered by month
  const clientsByMonth = useMemo(() => {
    const map = new Map<string, number>();
    clients.forEach(c => {
      const key = format(parseISO(c.created_at), 'MMM/yy', { locale: ptBR });
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [clients]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Relatório de Clientes</h1>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Cadastrados</p><p className="text-xl font-bold">{totalClientes}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Com Compras</p><p className="text-xl font-bold text-primary">{comCompras}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Sem Compras</p><p className="text-xl font-bold text-muted-foreground">{semCompras}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Clientes por Mês</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Novos Clientes" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Nº Compras</TableHead>
                  <TableHead>Total Gasto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientStats.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.email || '-'}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell>{c.numCompras}</TableCell>
                    <TableCell className="font-medium">{fmt(c.totalGasto)}</TableCell>
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
