import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { generateReportPdf } from '@/lib/generateReportPdf';

export default function ReportCheckins() {
  const { activeCompany } = useCompany();
  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let q = supabase.from('reservations').select('*').order('check_in');
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    q.then(({ data }) => { if (data) setReservations(data); });
  }, [activeCompany?.id]);

  const filtered = reservations.filter(r => {
    if (filter === 'upcoming') return r.status === 'pending';
    if (filter === 'done') return r.status === 'confirmed';
    return true;
  });

  const statusMap: Record<string, string> = { pending: 'Pendente', confirmed: 'Realizado', cancelled: 'Cancelado' };

  const exportPdf = () => {
    generateReportPdf({
      title: 'Relatório de Check-ins',
      headers: ['Descrição', 'Localizador', 'Check-in', 'Check-out', 'Status', 'Observações'],
      rows: filtered.map(r => [
        r.description || '-', r.confirmation_code || '-',
        r.check_in ? format(new Date(r.check_in + 'T12:00:00'), 'dd/MM/yyyy') : '-',
        r.check_out ? format(new Date(r.check_out + 'T12:00:00'), 'dd/MM/yyyy') : '-',
        statusMap[r.status] || r.status, r.notes || '-',
      ]),
    });
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-foreground">Relatório de Check-ins</h1>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="upcoming">Próximos</SelectItem>
                <SelectItem value="done">Realizados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Localizador</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.description || '-'}</TableCell>
                    <TableCell className="font-mono">{r.confirmation_code || '-'}</TableCell>
                    <TableCell>{r.check_in ? format(new Date(r.check_in + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>{r.check_out ? format(new Date(r.check_out + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell><Badge variant={r.status === 'confirmed' ? 'default' : 'secondary'}>{statusMap[r.status] || r.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.notes || '-'}</TableCell>
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
