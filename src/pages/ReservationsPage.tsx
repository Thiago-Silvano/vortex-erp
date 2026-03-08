import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ReservationRow {
  id: string;
  description: string;
  confirmation_code: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  notes: string;
  sale_id: string;
  created_at: string;
}

export default function ReservationsPage() {
  const { activeCompany } = useCompany();
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let query = supabase.from('reservations').select('*').order('created_at', { ascending: false });
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    query.then(({ data }) => { if (data) setReservations(data as ReservationRow[]); });
  }, [activeCompany?.id]);

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = reservations.filter(r =>
    normalize(r.description || '').includes(normalize(search)) ||
    (r.confirmation_code || '').includes(search)
  );

  const statusMap: Record<string, string> = { pending: 'Pendente', confirmed: 'Confirmada', cancelled: 'Cancelada' };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Reservas</h1>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por descrição ou código..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma reserva encontrada</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.description || '-'}</TableCell>
                    <TableCell>{r.confirmation_code || '-'}</TableCell>
                    <TableCell>{r.check_in ? format(new Date(r.check_in + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>{r.check_out ? format(new Date(r.check_out + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell><Badge variant={r.status === 'confirmed' ? 'default' : 'secondary'}>{statusMap[r.status] || r.status}</Badge></TableCell>
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
