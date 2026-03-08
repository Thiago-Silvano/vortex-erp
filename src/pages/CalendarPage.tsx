import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ChevronLeft, ChevronRight, Search, Trash2, Calendar as CalendarIcon, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  isSameMonth, isSameDay, isBefore, startOfDay, addWeeks, subWeeks, startOfISOWeek, endOfISOWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  passengers: number;
  created_at: string;
  event_type?: string;
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const MAX_VISIBLE_EVENTS = 2;

const EVENT_TYPES = [
  { value: 'geral', label: 'Geral' },
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'biometria', label: 'Biometria' },
  { value: 'entrega_documentos', label: 'Entrega de Documentos' },
  { value: 'embarque', label: 'Embarque' },
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  geral: 'bg-primary/10 text-primary',
  entrevista: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  biometria: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  entrega_documentos: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  embarque: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const { activeCompany } = useCompany();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filter, setFilter] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newPassengers, setNewPassengers] = useState(1);
  const [newEventType, setNewEventType] = useState('geral');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    let query = supabase.from('calendar_events').select('*').order('event_date');
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    if (data) setEvents(data.map((e: any) => ({ ...e, passengers: e.passengers ?? 1, event_type: e.event_type || 'geral' })));
  };

  useEffect(() => { fetchEvents(); }, [activeCompany?.id]);

  const today = new Date();

  const upcomingEvents = useMemo(() =>
    events.filter(ev => new Date(ev.event_date + 'T23:59:59') >= startOfDay(today)),
  [events]);

  const upcomingPassengers = useMemo(() =>
    upcomingEvents.reduce((sum, ev) => sum + (ev.passengers || 1), 0),
  [upcomingEvents]);

  const openNewEventForDate = (dateStr: string) => {
    const selectedDate = new Date(dateStr + 'T12:00:00');
    if (isBefore(startOfDay(selectedDate), startOfDay(today))) return;
    setEditingEvent(null);
    setNewTitle(''); setNewDate(dateStr); setNewTime(''); setNewPassengers(1); setNewEventType('geral');
    setDialogOpen(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setNewTitle(ev.title); setNewDate(ev.event_date); setNewTime(ev.event_time?.slice(0, 5) || '');
    setNewPassengers(ev.passengers || 1); setNewEventType(ev.event_type || 'geral');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!newTitle.trim() || !newDate) { toast.error('Preencha o evento e a data.'); return; }
    const selectedDate = new Date(newDate + 'T12:00:00');
    if (!editingEvent && isBefore(startOfDay(selectedDate), startOfDay(today))) {
      toast.error('Não é possível adicionar eventos em datas passadas.'); return;
    }
    if (!editingEvent && isSameDay(selectedDate, today) && newTime) {
      const [h, m] = newTime.split(':').map(Number);
      if (h * 60 + m < today.getHours() * 60 + today.getMinutes()) {
        toast.error('Não é possível adicionar eventos em horários já passados.'); return;
      }
    }
    setLoading(true);
    const payload: any = {
      title: newTitle.trim(), event_date: newDate, event_time: newTime || null,
      passengers: newPassengers || 1, empresa_id: activeCompany?.id || null,
      event_type: newEventType,
    };
    if (editingEvent) {
      await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
      toast.success('Evento atualizado!');
    } else {
      await supabase.from('calendar_events').insert(payload);
      toast.success('Evento adicionado!');
    }
    setLoading(false); setDialogOpen(false); setEditingEvent(null);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('calendar_events').delete().eq('id', id);
    toast.success('Evento removido.');
    fetchEvents();
  };

  const isSearching = filter.trim().length > 0;
  const filteredEvents = useMemo(() => {
    if (!isSearching) return events;
    const norm = normalize(filter);
    return events.filter(e => normalize(e.title).includes(norm));
  }, [events, filter, isSearching]);

  const eventsMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach(ev => {
      if (!map[ev.event_date]) map[ev.event_date] = [];
      map[ev.event_date].push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Navigation
  const navigate = (dir: number) => {
    if (viewMode === 'month') setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const headerLabel = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, 'dd MMM', { locale: ptBR })} — ${format(we, 'dd MMM yyyy', { locale: ptBR })}`;
    }
    return format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Month grid
  const monthDays = useMemo(() => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const cs = startOfWeek(ms, { weekStartsOn: 0 });
    const ce = endOfWeek(me, { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = cs;
    while (d <= ce) { days.push(d); d = addDays(d, 1); }
    return days;
  }, [currentDate]);

  // Week days
  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [currentDate]);

  const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getEventColorClass = (ev: CalendarEvent) =>
    EVENT_TYPE_COLORS[ev.event_type || 'geral'] || EVENT_TYPE_COLORS.geral;

  const renderEventPill = (ev: CalendarEvent, compact = false) => (
    <div
      key={ev.id}
      className={`flex items-center gap-1 ${getEventColorClass(ev)} rounded px-1.5 py-0.5 text-[11px] leading-tight truncate cursor-pointer hover:opacity-80`}
      title={`${ev.title}${ev.event_time ? ` - ${ev.event_time.slice(0, 5)}` : ''}`}
      onClick={e => { e.stopPropagation(); openEditEvent(ev); }}
    >
      {ev.event_time && <span className="font-semibold shrink-0">{ev.event_time.slice(0, 5)}</span>}
      <span className="truncate">{ev.title}</span>
      {!compact && <span className="shrink-0 text-[10px] opacity-70">{ev.passengers || 1}p</span>}
    </div>
  );

  const renderDayCell = (d: Date, isMonthView = true) => {
    const dateKey = format(d, 'yyyy-MM-dd');
    const dayEvents = eventsMap[dateKey] || [];
    const isCurrentMonth = isMonthView ? isSameMonth(d, currentDate) : true;
    const isToday = isSameDay(d, today);
    const isPast = isBefore(startOfDay(d), startOfDay(today));
    const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
    const hiddenCount = dayEvents.length - MAX_VISIBLE_EVENTS;

    return (
      <div
        key={dateKey}
        className={`group/day relative min-h-[100px] md:min-h-[120px] border-b border-r p-1.5 flex flex-col transition-colors ${
          isPast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/20'
        } ${!isCurrentMonth ? 'bg-muted/30' : ''} ${isToday ? 'bg-primary/5' : ''}`}
        onClick={() => !isPast && openNewEventForDate(dateKey)}
      >
        <span className={`text-xs font-medium self-end rounded-full w-6 h-6 flex items-center justify-center ${
          isToday ? 'bg-primary text-primary-foreground' : !isCurrentMonth ? 'text-muted-foreground/50' : 'text-foreground'
        }`}>{format(d, 'd')}</span>
        <div className="flex-1 mt-1 space-y-0.5 overflow-hidden">
          {visibleEvents.map(ev => renderEventPill(ev))}
          {hiddenCount > 0 && (
            <div className="text-[10px] text-muted-foreground font-medium px-1.5" onClick={e => e.stopPropagation()}>
              +{hiddenCount} mais
            </div>
          )}
        </div>
      </div>
    );
  };

  // Day view
  const renderDayView = () => {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    const dayEvents = (eventsMap[dateKey] || []).sort((a, b) =>
      (a.event_time || '').localeCompare(b.event_time || '')
    );
    const isPast = isBefore(startOfDay(currentDate), startOfDay(today));

    return (
      <div className="border rounded-lg bg-card p-4 space-y-2">
        {dayEvents.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum evento neste dia</p>
        ) : dayEvents.map(ev => (
          <div
            key={ev.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${getEventColorClass(ev)} cursor-pointer hover:opacity-80`}
            onClick={() => openEditEvent(ev)}
          >
            <div>
              <p className="font-medium text-sm">{ev.title}</p>
              <p className="text-xs opacity-70">
                {ev.event_time ? ev.event_time.slice(0, 5) : 'Sem horário'} · {ev.passengers || 1} pax
                {ev.event_type && ev.event_type !== 'geral' && ` · ${EVENT_TYPES.find(t => t.value === ev.event_type)?.label}`}
              </p>
            </div>
          </div>
        ))}
        {!isPast && (
          <Button variant="outline" className="w-full mt-2" onClick={() => openNewEventForDate(dateKey)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar evento
          </Button>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Calendário</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar evento..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-9 w-full sm:w-64" />
            </div>
            <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditingEvent(null); }}>
              <Button onClick={() => { setEditingEvent(null); setNewTitle(''); setNewDate(''); setNewTime(''); setNewPassengers(1); setNewEventType('geral'); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Evento
              </Button>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingEvent ? 'Editar Evento' : 'Adicionar Evento'}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div><Label>Evento</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nome do evento" /></div>
                  <div><Label>Tipo</Label>
                    <Select value={newEventType} onValueChange={setNewEventType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Data</Label><Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={editingEvent ? undefined : format(today, 'yyyy-MM-dd')} /></div>
                  <div><Label>Hora (opcional)</Label><Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} /></div>
                  <div><Label>Passageiros</Label><Input type="number" min={1} value={newPassengers} onChange={e => setNewPassengers(Math.max(1, parseInt(e.target.value) || 1))} /></div>
                </div>
                <DialogFooter className="flex justify-between sm:justify-between">
                  {editingEvent && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>
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
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
              <div className="p-8 text-center text-muted-foreground">Nenhum evento encontrado para "{filter}"</div>
            ) : filteredEvents.map(ev => (
              <div key={ev.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => openEditEvent(ev)}>
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
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* View mode tabs + navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="day">Dia</TabsTrigger>
                  <TabsTrigger value="week">Semana</TabsTrigger>
                  <TabsTrigger value="month">Mês</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-lg font-semibold capitalize min-w-[200px] text-center">{headerLabel()}</h2>
                <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            {viewMode === 'day' && renderDayView()}

            {viewMode === 'week' && (
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="grid grid-cols-7">
                  {weekDays.map((d, i) => (
                    <div key={i} className={`p-2 text-center text-xs font-semibold border-b ${isSameDay(d, today) ? 'bg-primary/10 text-primary' : 'text-muted-foreground bg-muted/50'}`}>
                      {weekDayLabels[d.getDay()]} {format(d, 'dd')}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {weekDays.map(d => renderDayCell(d, false))}
                </div>
              </div>
            )}

            {viewMode === 'month' && (
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="grid grid-cols-7">
                  {weekDayLabels.map(wd => (
                    <div key={wd} className="p-2 text-center text-xs font-semibold text-muted-foreground bg-muted/50 border-b">{wd}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDays.map(d => renderDayCell(d))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
