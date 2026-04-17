import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, User, GripVertical, Send, Plus, Trash2, LayoutGrid, List, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { toast } from 'sonner';
import { format } from 'date-fns';

type ProcessStatus = 'falta_passaporte' | 'produzindo' | 'agendado' | 'aguardando_renovacao' | 'aprovado' | 'negado';

interface Process {
  id: string;
  visa_sale_id: string;
  applicant_id: string;
  product_id: string;
  client_name: string;
  applicant_name: string;
  status: ProcessStatus;
  describe_duties: string;
  photo_url: string;
  documents: any[];
  consulate: string;
  interview_date: string | null;
  interview_time: string | null;
  interview_notes: string;
  created_at: string;
  product_name?: string;
  _client_id?: string | null;
}

const STATUSES: { key: ProcessStatus; label: string; color: string }[] = [
  { key: 'falta_passaporte', label: 'Falta Passaporte', color: 'bg-amber-500' },
  { key: 'produzindo', label: 'Produzindo', color: 'bg-blue-500' },
  { key: 'agendado', label: 'Agendado', color: 'bg-violet-500' },
  { key: 'aguardando_renovacao', label: 'Aguard. Renovação', color: 'bg-orange-500' },
  { key: 'aprovado', label: 'Aprovado', color: 'bg-emerald-500' },
  { key: 'negado', label: 'Negado', color: 'bg-red-500' },
];

const CONSULATES = ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Recife', 'Porto Alegre'];

export default function VistosProductionPage() {
  const { activeCompany } = useCompany();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Process | null>(null);

  const canDelete = userEmail === 'thiago@vortexviagens.com.br';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || '');
    });
  }, []);

  // Interview form
  const [intConsulate, setIntConsulate] = useState('');
  const [intDate, setIntDate] = useState('');
  const [intTime, setIntTime] = useState('');
  const [intNotes, setIntNotes] = useState('');

  // Detail form
  const [duties, setDuties] = useState('');
  const [uploading, setUploading] = useState(false);

  // WhatsApp - removed old modal state

  // Add manual process
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addApplicant, setAddApplicant] = useState('');
  const [addProduct, setAddProduct] = useState('');
  const [products, setProducts] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    if (!activeCompany?.id) return;
    supabase.from('visa_products').select('id, name').eq('empresa_id', activeCompany.id).then(({ data }) => {
      if (data) setProducts(data as any);
    });
  }, [activeCompany?.id]);

  const fetchProcesses = async () => {
    if (!activeCompany?.id) return;
    const { data } = await supabase
      .from('visa_processes')
      .select('*, visa_products(name)')
      .eq('empresa_id', activeCompany.id)
      .order('created_at');

    if (data) {
      // Fetch client photos to sync with processes
      const clientNames = [...new Set(data.map((p: any) => p.client_name).concat(data.map((p: any) => p.applicant_name)))];
      const { data: clients } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('empresa_id', activeCompany.id)
        .in('full_name', clientNames);
      
      const clientMap = new Map<string, string>();
      clients?.forEach((c: any) => clientMap.set(c.full_name, c.id));

      // Fetch all client photos for matching clients
      const clientIds = [...new Set(clients?.map((c: any) => c.id) || [])];
      let clientPhotosMap = new Map<string, string>();
      if (clientIds.length > 0) {
        const { data: photos } = await supabase
          .from('client_photos')
          .select('client_id, file_url')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false });
        photos?.forEach((p: any) => {
          if (!clientPhotosMap.has(p.client_id)) {
            clientPhotosMap.set(p.client_id, p.file_url);
          }
        });
      }

      setProcesses(data.map((p: any) => {
        const clientId = clientMap.get(p.applicant_name) || clientMap.get(p.client_name);
        const clientPhoto = clientId ? clientPhotosMap.get(clientId) : undefined;
        return {
          ...p,
          documents: Array.isArray(p.documents) ? p.documents : [],
          product_name: p.visa_products?.name || '',
          photo_url: p.photo_url || clientPhoto || '',
          _client_id: clientId || null,
        };
      }));
    }
  };

  useEffect(() => { fetchProcesses(); }, [activeCompany?.id]);

  const moveToStatus = async (processId: string, newStatus: ProcessStatus) => {
    // If moving to 'agendado', open interview form
    const proc = processes.find(p => p.id === processId);
    if (!proc) return;

    if (newStatus === 'agendado') {
      setSelectedProcess({ ...proc, status: newStatus });
      setIntConsulate(proc.consulate || '');
      setIntDate(proc.interview_date || '');
      setIntTime(proc.interview_time?.slice(0, 5) || '');
      setIntNotes(proc.interview_notes || '');
      setInterviewOpen(true);
      return;
    }

    await supabase.from('visa_processes').update({ status: newStatus }).eq('id', processId);
    
    // Send email notification for key status changes
    if (['aprovado', 'negado'].includes(newStatus)) {
      supabase.functions.invoke('visa-notification', {
        body: { processId, newStatus },
      }).catch(err => console.error('Notification error:', err));
    }

    toast.success(`Status atualizado para ${STATUSES.find(s => s.key === newStatus)?.label}`);
    fetchProcesses();
  };

  const saveInterview = async () => {
    if (!selectedProcess) return;
    if (!intConsulate || !intDate || !intTime) {
      toast.error('Preencha consulado, data e horário.');
      return;
    }

    await supabase.from('visa_processes').update({
      status: 'agendado' as ProcessStatus,
      consulate: intConsulate,
      interview_date: intDate,
      interview_time: intTime,
      interview_notes: intNotes,
    }).eq('id', selectedProcess.id);

    // Create calendar event
    await supabase.from('calendar_events').insert({
      empresa_id: activeCompany?.id,
      title: `Entrevista Consulado — ${selectedProcess.applicant_name}`,
      event_date: intDate,
      event_time: intTime,
      passengers: 1,
      event_type: 'entrevista',
    });

    // Send email notification
    supabase.functions.invoke('visa-notification', {
      body: { processId: selectedProcess.id, newStatus: 'agendado' },
    }).catch(err => console.error('Notification error:', err));

    toast.success('Entrevista agendada e evento criado no calendário!');
    setInterviewOpen(false);
    fetchProcesses();
  };

  const openDetail = (proc: Process) => {
    setSelectedProcess(proc);
    setDuties(proc.describe_duties || '');
    setDetailOpen(true);
  };

  const saveDetail = async () => {
    if (!selectedProcess) return;
    await supabase.from('visa_processes').update({ describe_duties: duties }).eq('id', selectedProcess.id);
    toast.success('Processo atualizado!');
    setDetailOpen(false);
    fetchProcesses();
  };

  const uploadFile = async (processId: string, file: File, type: 'photo' | 'document') => {
    setUploading(true);
    const path = `${processId}/${type}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('visa-documents').upload(path, file);
    if (error) { toast.error('Erro no upload.'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('visa-documents').getPublicUrl(path);

    if (type === 'photo') {
      await supabase.from('visa_processes').update({ photo_url: publicUrl }).eq('id', processId);
      
      // Also save to client_photos for sync
      const proc = processes.find(p => p.id === processId);
      if (proc?._client_id) {
        await supabase.from('client_photos').insert({
          client_id: proc._client_id,
          file_url: publicUrl,
          file_name: file.name,
          uploaded_by: 'produção',
          empresa_id: activeCompany?.id,
        } as any);
      }
    } else {
      const proc = processes.find(p => p.id === processId);
      const docs = [...(proc?.documents || []), { name: file.name, url: publicUrl }];
      await supabase.from('visa_processes').update({ documents: docs }).eq('id', processId);
    }
    setUploading(false);
    toast.success('Arquivo enviado!');
    fetchProcesses();
  };

  // Drag and drop
  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (status: ProcessStatus) => {
    if (draggedId) {
      moveToStatus(draggedId, status);
      setDraggedId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('visa_processes').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Erro ao excluir processo.');
      return;
    }
    toast.success('Processo excluído.');
    setDeleteTarget(null);
    fetchProcesses();
  };

  const filteredProcesses = processes.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.applicant_name?.toLowerCase().includes(q) ||
      p.client_name?.toLowerCase().includes(q) ||
      p.product_name?.toLowerCase().includes(q)
    );
  });

  const groupedByStatus = STATUSES.map(s => ({
    ...s,
    items: filteredProcesses.filter(p => p.status === s.key),
  }));

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">Produção — {viewMode === 'kanban' ? 'Kanban' : 'Lista'}</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-7 w-56"
              />
            </div>
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-7 px-2"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Kanban
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-7 px-2"
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5 mr-1" /> Lista
              </Button>
            </div>
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {groupedByStatus.map(col => (
              <div
                key={col.key}
                className="min-w-[280px] w-[280px] flex-shrink-0 flex flex-col bg-muted/50 rounded-lg"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col.key)}
              >
                <div className={`${col.color} text-white px-3 py-2 rounded-t-lg flex items-center justify-between`}>
                  <span className="font-semibold text-sm">{col.label}</span>
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">{col.items.length}</Badge>
                </div>
                <div className="p-2 space-y-2 min-h-[200px] flex-1">
                  {col.items.map(proc => (
                    <div
                      key={proc.id}
                      draggable
                      onDragStart={() => handleDragStart(proc.id)}
                      className="group relative bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => openDetail(proc)}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-foreground truncate">{proc.applicant_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{proc.client_name}</p>
                          <p className="text-xs text-muted-foreground">{proc.product_name}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {format(new Date(proc.created_at), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(proc); }}
                            title="Excluir processo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requerente</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Consulado</TableHead>
                    <TableHead>Entrevista</TableHead>
                    <TableHead>Criado em</TableHead>
                    {canDelete && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProcesses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canDelete ? 8 : 7} className="text-center text-muted-foreground py-6 text-xs">
                        Nenhum processo encontrado
                      </TableCell>
                    </TableRow>
                  ) : filteredProcesses.map(proc => {
                    const st = STATUSES.find(s => s.key === proc.status);
                    return (
                      <TableRow key={proc.id} className="cursor-pointer" onClick={() => openDetail(proc)}>
                        <TableCell className="font-medium text-xs">{proc.applicant_name}</TableCell>
                        <TableCell className="text-xs">{proc.client_name}</TableCell>
                        <TableCell className="text-xs">{proc.product_name}</TableCell>
                        <TableCell>
                          <Badge className={`${st?.color} text-white text-[10px]`}>{st?.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{proc.consulate || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {proc.interview_date
                            ? `${format(new Date(proc.interview_date), 'dd/MM/yyyy')}${proc.interview_time ? ' ' + proc.interview_time.slice(0, 5) : ''}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(proc.created_at), 'dd/MM/yyyy')}</TableCell>
                        {canDelete && (
                          <TableCell className="text-xs">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(proc); }}
                              title="Excluir processo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Manual Process Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Processo Manual</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nome do Cliente *</Label><Input value={addName} onChange={e => setAddName(e.target.value)} /></div>
            <div><Label>Nome do Requerente *</Label><Input value={addApplicant} onChange={e => setAddApplicant(e.target.value)} /></div>
            <div>
              <Label>Produto</Label>
              <Select value={addProduct} onValueChange={setAddProduct}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={async () => {
              if (!addName.trim() || !addApplicant.trim()) { toast.error('Preencha nome do cliente e requerente.'); return; }
              // Create a dummy visa_sale first, then process
              const { data: sale } = await supabase.from('visa_sales').insert({
                empresa_id: activeCompany?.id,
                client_name: addName,
                sale_date: new Date().toISOString().slice(0, 10),
                total_value: 0,
                payment_method: 'pix',
                status: 'active',
              } as any).select('id').single();
              if (!sale) { toast.error('Erro ao criar registro.'); return; }
              // Create applicant
              const { data: applicant } = await supabase.from('visa_applicants').insert({
                visa_sale_id: sale.id,
                full_name: addApplicant,
                is_main: true,
                sort_order: 0,
              }).select('id').single();
              if (!applicant) { toast.error('Erro ao criar requerente.'); return; }
              // Create process
              await supabase.from('visa_processes').insert({
                visa_sale_id: sale.id,
                applicant_id: applicant.id,
                applicant_name: addApplicant,
                client_name: addName,
                empresa_id: activeCompany?.id,
                product_id: addProduct || null,
                status: 'produzindo',
              } as any);
              toast.success('Processo criado!');
              setAddOpen(false);
              setAddName(''); setAddApplicant(''); setAddProduct('');
              fetchProcesses();
            }}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Processo — {selectedProcess?.applicant_name}</DialogTitle></DialogHeader>
          {selectedProcess && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{selectedProcess.client_name}</span></div>
                <div><span className="text-muted-foreground">Produto:</span> <span className="font-medium">{selectedProcess.product_name}</span></div>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={selectedProcess.status}
                  onValueChange={(val) => {
                    moveToStatus(selectedProcess.id, val as ProcessStatus);
                    setDetailOpen(false);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Describe your duties</Label>
                <Textarea value={duties} onChange={e => setDuties(e.target.value)} rows={4} />
              </div>

              {/* Photo */}
              <div>
                <Label>Foto do Cliente</Label>
                {selectedProcess.photo_url && (
                  <img src={selectedProcess.photo_url} alt="Foto" className="w-24 h-24 rounded-lg object-cover mb-2" />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(selectedProcess.id, f, 'photo');
                  }}
                  disabled={uploading}
                />
              </div>

              {/* Documents */}
              <div>
                <Label>Documentos</Label>
              {selectedProcess.documents?.length > 0 && (
                <div className="space-y-1 mb-2">
                  {selectedProcess.documents.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline flex-1 min-w-0">
                        <FileText className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{doc.name}</span>
                      </a>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={async (e) => {
                        e.stopPropagation();
                        const updatedDocs = selectedProcess.documents.filter((_: any, idx: number) => idx !== i);
                        await supabase.from('visa_processes').update({ documents: updatedDocs }).eq('id', selectedProcess.id);
                        toast.success('Documento removido!');
                        setDetailOpen(false);
                        fetchProcesses();
                      }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
                <Input
                  type="file"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(selectedProcess.id, f, 'document');
                  }}
                  disabled={uploading}
                />
              </div>

              {selectedProcess.consulate && (
                <Card>
                  <CardContent className="p-3 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Consulado:</span> {selectedProcess.consulate}</p>
                    <p><span className="text-muted-foreground">Data:</span> {selectedProcess.interview_date}</p>
                    <p><span className="text-muted-foreground">Horário:</span> {selectedProcess.interview_time?.slice(0, 5)}</p>
                    {selectedProcess.interview_notes && <p><span className="text-muted-foreground">Obs:</span> {selectedProcess.interview_notes}</p>}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
            <Button onClick={saveDetail}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Scheduling Dialog */}
      <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar Entrevista — {selectedProcess?.applicant_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Consulado *</Label>
              <Select value={intConsulate} onValueChange={setIntConsulate}>
                <SelectTrigger><SelectValue placeholder="Selecione o consulado" /></SelectTrigger>
                <SelectContent>
                  {CONSULATES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Data da Entrevista *</Label><Input type="date" value={intDate} onChange={e => setIntDate(e.target.value)} /></div>
            <div><Label>Horário *</Label><Input type="time" value={intTime} onChange={e => setIntTime(e.target.value)} /></div>
            <div><Label>Observações</Label><Textarea value={intNotes} onChange={e => setIntNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={saveInterview}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
