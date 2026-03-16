import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { format, differenceInHours, parseISO } from 'date-fns';
import { Search, AlertTriangle, CheckCircle2, Clock, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
}

export default function ReservationsPage() {
  const { activeCompany } = useCompany();
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ReservationRow>>({});
  const [saving, setSaving] = useState(false);

  const fetchReservations = async () => {
    let query = supabase.from('reservations').select('*').order('created_at', { ascending: false });
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    if (data) setReservations(data as ReservationRow[]);
  };

  useEffect(() => {
    fetchReservations();
  }, [activeCompany?.id]);

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = reservations.filter(r =>
    normalize(r.description || '').includes(normalize(search)) ||
    (r.confirmation_code || '').includes(search)
  );

  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const confirmedCount = reservations.filter(r => r.status === 'confirmed').length;

  const statusMap: Record<string, string> = { pending: 'Pendente', confirmed: 'Confirmada', cancelled: 'Cancelada' };

  // Check if check-in is within 48h and status is not confirmed
  const isUrgent = (r: ReservationRow) => {
    if (!r.check_in || r.status === 'confirmed') return false;
    const checkInDate = parseISO(r.check_in + 'T12:00:00');
    const hoursUntil = differenceInHours(checkInDate, new Date());
    return hoursUntil >= 0 && hoursUntil <= 48;
  };

  const startEdit = (r: ReservationRow) => {
    setEditingId(r.id);
    setEditData({ description: r.description, confirmation_code: r.confirmation_code, status: r.status, check_in: r.check_in, check_out: r.check_out, notes: r.notes });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase.from('reservations').update({
      description: editData.description || '',
      confirmation_code: editData.confirmation_code || '',
      status: editData.status || 'pending',
      check_in: editData.check_in || null,
      check_out: editData.check_out || null,
      notes: editData.notes || '',
    }).eq('id', editingId);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Reserva atualizada');
    setEditingId(null);
    fetchReservations();
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  // Urgent notifications
  const urgentReservations = reservations.filter(isUrgent);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Reservas</h1>
        </div>

        {/* Urgent notifications */}
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

        {/* Counters */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{pendingCount} Pendente{pendingCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">{confirmedCount} Confirmada{confirmedCount !== 1 ? 's' : ''}</span>
          </div>
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
                  <TableHead>Descrição</TableHead>
                  <TableHead className="min-w-[200px]">Número da Reserva</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma reserva encontrada</TableCell></TableRow>
                ) : filtered.map(r => {
                  const urgent = isUrgent(r);
                  const isEditing = editingId === r.id;

                  return (
                    <TableRow key={r.id} className={`cursor-pointer ${urgent ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`} onClick={() => !isEditing && startEdit(r)}>
                      <TableCell>
                        {isEditing ? (
                          <Input value={editData.description || ''} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} className="h-8 text-sm" onClick={e => e.stopPropagation()} />
                        ) : (
                          <span className="font-medium">{r.description || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input value={editData.confirmation_code || ''} onChange={e => setEditData(p => ({ ...p, confirmation_code: e.target.value }))} className="h-8 text-sm" onClick={e => e.stopPropagation()} />
                        ) : (
                          r.confirmation_code || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input type="date" value={editData.check_in || ''} onChange={e => setEditData(p => ({ ...p, check_in: e.target.value }))} className="h-8 text-sm" onClick={e => e.stopPropagation()} />
                        ) : (
                          r.check_in ? format(parseISO(r.check_in + 'T12:00:00'), 'dd/MM/yyyy') : '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input type="date" value={editData.check_out || ''} onChange={e => setEditData(p => ({ ...p, check_out: e.target.value }))} className="h-8 text-sm" onClick={e => e.stopPropagation()} />
                        ) : (
                          r.check_out ? format(parseISO(r.check_out + 'T12:00:00'), 'dd/MM/yyyy') : '-'
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {isEditing ? (
                          <Select value={editData.status || 'pending'} onValueChange={v => setEditData(p => ({ ...p, status: v }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="confirmed">Confirmada</SelectItem>
                              <SelectItem value="cancelled">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            {urgent && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <Badge variant={r.status === 'confirmed' ? 'default' : r.status === 'cancelled' ? 'destructive' : 'secondary'}>{statusMap[r.status] || r.status}</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input value={editData.notes || ''} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} className="h-8 text-sm" placeholder="Observações..." onClick={e => e.stopPropagation()} />
                        ) : (
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] block">{r.notes || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {isEditing && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="default" onClick={saveEdit} disabled={saving} className="h-7 text-xs">
                              <Save className="h-3 w-3 mr-1" />{saving ? '...' : 'Salvar'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs">✕</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
