import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table';
import { useTableSort } from '@/hooks/useTableSort';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { format, differenceInHours, parseISO } from 'date-fns';
import { Search, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
  service_type: string | null;
}

export default function ReservationsPage() {
  const { activeCompany } = useCompany();
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReservation, setSelectedReservation] = useState<ReservationRow | null>(null);
  const [editStatus, setEditStatus] = useState('pending');
  const [saving, setSaving] = useState(false);

  const fetchReservations = async () => {
    let query = supabase.from('reservations').select('*')
      .eq('service_type', 'aereo')
      .order('check_in', { ascending: true, nullsFirst: false });
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    if (data) setReservations(data as ReservationRow[]);
  };

  useEffect(() => {
    fetchReservations();
  }, [activeCompany?.id]);

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filtered = reservations.filter(r => {
    // Status filter
    if (statusFilter === 'pending' && r.status !== 'pending') return false;
    if (statusFilter === 'confirmed' && r.status !== 'confirmed') return false;
    // Search
    if (search) {
      return normalize(r.description || '').includes(normalize(search)) ||
        (r.confirmation_code || '').includes(search);
    }
    return true;
  });

  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const confirmedCount = reservations.filter(r => r.status === 'confirmed').length;

  const statusMap: Record<string, string> = { pending: 'Pendente', confirmed: 'Confirmada', cancelled: 'Cancelada' };

  const isUrgent = (r: ReservationRow) => {
    if (!r.check_in || r.status === 'confirmed') return false;
    const checkInDate = parseISO(r.check_in + 'T12:00:00');
    const hoursUntil = differenceInHours(checkInDate, new Date());
    return hoursUntil >= 0 && hoursUntil <= 48;
  };

  const openStatusDialog = (r: ReservationRow) => {
    setSelectedReservation(r);
    setEditStatus(r.status);
  };

  const saveStatus = async () => {
    if (!selectedReservation) return;
    setSaving(true);
    const { error } = await supabase.from('reservations').update({ status: editStatus }).eq('id', selectedReservation.id);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Status atualizado');
    setSelectedReservation(null);
    fetchReservations();
  };

  const urgentReservations = filtered.filter(isUrgent);

  const { sortedData, sortState, requestSort } = useTableSort(filtered, {
    description: (r) => r.description,
    confirmation_code: (r) => r.confirmation_code,
    check_in: (r) => r.check_in,
    check_out: (r) => r.check_out,
    status: (r) => r.status,
    notes: (r) => r.notes,
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Reservas Aéreas</h1>
        </div>

        {urgentReservations.length > 0 && (
          <div className="space-y-2">
            {urgentReservations.map(r => (
              <div key={r.id} className="flex items-center gap-2 p-3 rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/20 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span><strong>{r.description || 'Reserva'}</strong> — Check-in em menos de 48h ({r.check_in ? format(parseISO(r.check_in + 'T12:00:00'), 'dd/MM/yyyy') : ''}). Confirme a reserva!</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{pendingCount} Pendente{pendingCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">{confirmedCount} Confirmada{confirmedCount !== 1 ? 's' : ''}</span>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="confirmed">Confirmadas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por descrição ou número da reserva..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="description" sortState={sortState} onSort={requestSort}>Descrição</SortableTableHead>
                  <SortableTableHead sortKey="confirmation_code" sortState={sortState} onSort={requestSort} className="min-w-[200px]">Número da Reserva</SortableTableHead>
                  <SortableTableHead sortKey="check_in" sortState={sortState} onSort={requestSort}>Check-in</SortableTableHead>
                  <SortableTableHead sortKey="check_out" sortState={sortState} onSort={requestSort}>Check-out</SortableTableHead>
                  <SortableTableHead sortKey="status" sortState={sortState} onSort={requestSort}>Status</SortableTableHead>
                  <SortableTableHead sortKey="notes" sortState={sortState} onSort={requestSort}>Observações</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma reserva encontrada</TableCell></TableRow>
                ) : sortedData.map(r => {
                  const urgent = isUrgent(r);
                  const isOverdue = r.check_in && r.status === 'pending' && parseISO(r.check_in + 'T12:00:00') < new Date();
                  const rowBg = r.status === 'confirmed'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20'
                    : isOverdue
                      ? 'bg-red-50 dark:bg-red-950/20'
                      : urgent
                        ? 'bg-red-50 dark:bg-red-950/20'
                        : r.status === 'pending'
                          ? 'bg-orange-50 dark:bg-orange-950/20'
                          : '';
                  return (
                    <TableRow key={r.id} className={`cursor-pointer ${rowBg} ${r.status === 'confirmed' ? 'hover:bg-emerald-100 dark:hover:bg-emerald-950/40' : (isOverdue || urgent) ? 'hover:bg-red-100 dark:hover:bg-red-950/40' : r.status === 'pending' ? 'hover:bg-orange-100 dark:hover:bg-orange-950/40' : 'hover:bg-muted/50'}`} onClick={() => openStatusDialog(r)}>
                      <TableCell><span className="font-medium">{r.description || '-'}</span></TableCell>
                      <TableCell className="font-mono">{r.confirmation_code || '-'}</TableCell>
                      <TableCell>{r.check_in ? format(parseISO(r.check_in + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>{r.check_out ? format(parseISO(r.check_out + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant={r.status === 'confirmed' ? 'default' : r.status === 'cancelled' ? 'destructive' : 'secondary'}>{statusMap[r.status] || r.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-sm text-muted-foreground truncate max-w-[150px] block">{r.notes || '-'}</span></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Status change dialog */}
        <Dialog open={!!selectedReservation} onOpenChange={open => { if (!open) setSelectedReservation(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg">Alterar Status</DialogTitle>
            </DialogHeader>
            {selectedReservation && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedReservation.description || 'Reserva'}</p>
                  {selectedReservation.confirmation_code && (
                    <p className="text-xs text-muted-foreground font-mono">Localizador: {selectedReservation.confirmation_code}</p>
                  )}
                  {selectedReservation.check_in && (
                    <p className="text-xs text-muted-foreground">
                      Check-in: {format(parseISO(selectedReservation.check_in + 'T12:00:00'), 'dd/MM/yyyy')}
                      {selectedReservation.check_out && ` → ${format(parseISO(selectedReservation.check_out + 'T12:00:00'), 'dd/MM/yyyy')}`}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="confirmed">Confirmada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setSelectedReservation(null)} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition-colors">
                    Cancelar
                  </button>
                  <button onClick={saveStatus} disabled={saving || editStatus === selectedReservation.status} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
