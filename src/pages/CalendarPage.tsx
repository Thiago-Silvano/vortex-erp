import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, ChevronLeft, ChevronRight, Search, Trash2, Calendar as CalendarIcon, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  passengers: number;
  created_at: string;
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const MAX_VISIBLE_EVENTS = 2;

export default function CalendarPage() {
  const { activeCompany } = useCompany();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newPassengers, setNewPassengers] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    let query = supabase.from('calendar_events').select('*').order('event_date');
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    if (data) setEvents(data.map((e: any) => ({ ...e, passengers: e.passengers ?? 1 })));
  };

  useEffect(() => { fetchEvents(); }, []);

  const today = new Date();

  const upcomingEvents = useMemo(() => {
    return events.filter(ev => {
      const evDate = new Date(ev.event_date + 'T23:59:59');
      return evDate >= startOfDay(today);
    });
  }, [events]);

  const upcomingPassengers = useMemo(() => {
    return upcomingEvents.reduce((sum, ev) => sum + (ev.passengers || 1), 0);
  }, [upcomingEvents]);

  const openNewEventForDate = (dateStr: string) => {
    const selectedDate = new Date(dateStr + 'T12:00:00');
    if (isBefore(startOfDay(selectedDate), startOfDay(today))) return;
    setEditingEvent(null);
    setNewTitle('');
    setNewDate(dateStr);
    setNewTime('');
    setNewPassengers(1);
    setDialogOpen(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setNewTitle(ev.title);
    setNewDate(ev.event_date);
    setNewTime(ev.event_time?.slice(0, 5) || '');
    setNewPassengers(ev.passengers || 1);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!newTitle.trim() || !newDate) {
      toast.error('Preencha o evento e a data.');
      return;
    }

    const selectedDate = new Date(newDate + 'T12:00:00');
    if (!editingEvent && isBefore(startOfDay(selectedDate), startOfDay(today))) {
      toast.error('Não é possível adicionar eventos em datas passadas.');
      return;
    }

    if (!editingEvent && isSameDay(selectedDate, today) && newTime) {
      const [h, m] = newTime.split(':').map(Number);
      const eventMinutes = h * 60 + m;
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      if (eventMinutes < nowMinutes) {
        toast.error('Não é possível adicionar eventos em horários já passados.');
        return;
      }
    }

    setLoading(true);
    const payload = {
      title: newTitle.trim(),
      event_date: newDate,
      event_time: newTime || null,
      passengers: newPassengers || 1,
    };

    if (editingEvent) {
      const { error } = await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
      if (error) { toast.error('Erro ao atualizar evento.'); setLoading(false); return; }
      toast.success('Evento atualizado!');
    } else {
      const { error } = await supabase.from('calendar_events').insert(payload);
      if (error) { toast.error('Erro ao salvar evento.'); setLoading(false); return; }
      toast.success('Evento adicionado!');
    }

    setLoading(false);
    setNewTitle(''); setNewDate(''); setNewTime(''); setNewPassengers(1);
    setEditingEvent(null);
    setDialogOpen(false);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('calendar_events').delete().eq('id', id);
    toast.success('Evento removido.');
    fetchEvents();
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) { days.push(day); day = addDays(day, 1); }

  const isSearching = filter.trim().length > 0;

  const filteredEvents = useMemo(() => {
    if (!isSearching) return events;
    const norm = normalize(filter);
    return events.filter(e => normalize(e.title).includes(norm));
  }, [events, filter, isSearching]);

  const eventsMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach(ev => {
      const key = ev.event_date;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [filteredEvents]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Calendário</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar evento..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setEditingEvent(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingEvent(null); setNewTitle(''); setNewDate(''); setNewTime(''); setNewPassengers(1); }}>
                  <Plus className="h-4 w-4 mr-1" /> Evento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingEvent ? 'Editar Evento' : 'Adicionar Evento'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Evento</Label>
                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nome do evento" />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      min={editingEvent ? undefined : format(today, 'yyyy-MM-dd')}
                    />
                  </div>
                  <div>
                    <Label>Hora (opcional)</Label>
                    <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
                  </div>
                  <div>
                    <Label>Passageiros</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newPassengers}
                      onChange={e => setNewPassengers(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                </div>
                <DialogFooter className="flex justify-between sm:justify-between">
                  {editingEvent && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover evento?</AlertDialogTitle>
                          <AlertDialogDescription>O evento "{editingEvent.title}" será removido permanentemente.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { handleDelete(editingEvent.id); setDialogOpen(false); setEditingEvent(null); }}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <div className="flex gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Upcoming events counter */}
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm px-3 py-1.5 gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            {upcomingEvents.length} evento{upcomingEvents.length !== 1 ? 's' : ''} pendente{upcomingEvents.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1.5 gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {upcomingPassengers} passageiro{upcomingPassengers !== 1 ? 's' : ''}
          </Badge>
        </div>

        {isSearching ? (
          <div className="border rounded-lg bg-card divide-y">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum evento encontrado para "{filter}"
              </div>
            ) : (
              filteredEvents.map(ev => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => openEditEvent(ev)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ev.event_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        {ev.event_time && ` às ${ev.event_time.slice(0, 5)}`}
                        {' · '}{ev.passengers || 1} pax
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="shrink-0 text-destructive hover:text-destructive/80 p-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover evento?</AlertDialogTitle>
                        <AlertDialogDescription>O evento "{ev.title}" será removido permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(ev.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold capitalize min-w-[180px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden bg-card">
              <div className="grid grid-cols-7">
                {weekDays.map(wd => (
                  <div key={wd} className="p-2 text-center text-xs font-semibold text-muted-foreground bg-muted/50 border-b">
                    {wd}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const dateKey = format(d, 'yyyy-MM-dd');
                  const dayEvents = eventsMap[dateKey] || [];
                  const isCurrentMonth = isSameMonth(d, currentMonth);
                  const isToday = isSameDay(d, today);
                  const isPast = isBefore(startOfDay(d), startOfDay(today));
                  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
                  const hiddenCount = dayEvents.length - MAX_VISIBLE_EVENTS;
                  const isFuture = !isPast;

                  return (
                    <div
                      key={i}
                      className={`group/day relative min-h-[100px] md:min-h-[120px] border-b border-r p-1.5 flex flex-col transition-colors ${
                        isPast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/20'
                      } ${!isCurrentMonth ? 'bg-muted/30' : ''} ${isToday ? 'bg-primary/5' : ''}`}
                      onClick={() => !isPast && openNewEventForDate(dateKey)}
                    >
                      <span className={`text-xs font-medium self-end rounded-full w-6 h-6 flex items-center justify-center ${
                        isToday ? 'bg-primary text-primary-foreground' : !isCurrentMonth ? 'text-muted-foreground/50' : 'text-foreground'
                      }`}>
                        {format(d, 'd')}
                      </span>
                      <div className="flex-1 mt-1 space-y-0.5 overflow-hidden">
                        {visibleEvents.map(ev => (
                          <div
                            key={ev.id}
                            className="group flex items-center gap-1 bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[11px] leading-tight truncate cursor-pointer hover:bg-primary/20"
                            title={`${ev.title}${ev.event_time ? ` - ${ev.event_time.slice(0, 5)}` : ''} · ${ev.passengers || 1} pax`}
                            onClick={e => { e.stopPropagation(); openEditEvent(ev); }}
                          >
                            {ev.event_time && (
                              <span className="font-semibold shrink-0">{ev.event_time.slice(0, 5)}</span>
                            )}
                            <span className="truncate">{ev.title}</span>
                            {isFuture && (
                              <span className="shrink-0 text-[10px] opacity-70">{ev.passengers || 1}p</span>
                            )}
                          </div>
                        ))}
                        {hiddenCount > 0 && (
                          <div
                            className="text-[10px] text-muted-foreground font-medium px-1.5"
                            onClick={e => e.stopPropagation()}
                          >
                            +{hiddenCount} mais
                          </div>
                        )}
                      </div>
                      {/* Hover expand overlay for overflow */}
                      {hiddenCount > 0 && (
                        <div className="hidden group-hover/day:block absolute top-8 left-0 right-0 bg-card border rounded-md shadow-lg p-2 z-40 space-y-0.5"
                          onClick={e => e.stopPropagation()}
                        >
                          {dayEvents.map(ev => (
                            <div
                              key={ev.id}
                              className="flex items-center gap-1 bg-primary/10 text-primary rounded px-1.5 py-1 text-xs leading-tight cursor-pointer hover:bg-primary/20"
                              onClick={() => openEditEvent(ev)}
                            >
                              {ev.event_time && (
                                <span className="font-semibold shrink-0">{ev.event_time.slice(0, 5)}</span>
                              )}
                              <span className="break-words">{ev.title}</span>
                              {isFuture && (
                                <span className="shrink-0 text-[10px] opacity-70 ml-auto">{ev.passengers || 1}p</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
