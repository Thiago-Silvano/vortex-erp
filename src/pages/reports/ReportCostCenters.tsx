import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useCompany } from '@/contexts/CompanyContext';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f43f5e', '#14b8a6'];

export default function ReportCostCenters() {
  const { activeCompany } = useCompany();
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);

  useEffect(() => {
    let qCC = supabase.from('cost_centers').select('*').order('name');
    let qRec = supabase.from('receivables').select('*');
    let qPay = supabase.from('accounts_payable').select('*');
    if (activeCompany?.id) {
      qCC = qCC.eq('empresa_id', activeCompany.id);
      qRec = qRec.eq('empresa_id', activeCompany.id);
      qPay = qPay.eq('empresa_id', activeCompany.id);
    }
    qCC.then(({ data }) => { if (data) setCostCenters(data); });
    qRec.then(({ data }) => { if (data) setReceivables(data); });
    qPay.then(({ data }) => { if (data) setPayables(data); });
  }, [activeCompany?.id]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const ccData = useMemo(() => {
    return costCenters.map(cc => {
      const receitas = receivables.filter(r => r.cost_center_id === cc.id).reduce((s, r) => s + Number(r.amount || 0), 0);
      const despesas = payables.filter(r => r.cost_center_id === cc.id).reduce((s, r) => s + Number(r.amount || 0), 0);
      return { name: cc.name, receitas, despesas, saldo: receitas - despesas };
    }).filter(c => c.receitas > 0 || c.despesas > 0);
  }, [costCenters, receivables, payables]);

  const pieData = ccData.map(c => ({ name: c.name, value: c.receitas + c.despesas })).filter(c => c.value > 0);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Relatório por Centro de Custo</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Distribuição Financeira</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead>Receitas</TableHead>
                    <TableHead>Despesas</TableHead>
                    <TableHead>Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ccData.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum dado</TableCell></TableRow>
                  ) : ccData.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-primary">{fmt(c.receitas)}</TableCell>
                      <TableCell className="text-destructive">{fmt(c.despesas)}</TableCell>
                      <TableCell className={c.saldo >= 0 ? 'text-primary font-medium' : 'text-destructive font-medium'}>{fmt(c.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}