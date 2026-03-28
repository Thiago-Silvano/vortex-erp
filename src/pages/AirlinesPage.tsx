import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Upload, X } from 'lucide-react';

interface Airline {
  id?: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
}

const emptyAirline: Airline = { name: '', logo_url: null, is_active: true };

export default function AirlinesPage() {
  const { activeCompany } = useCompany();
  const [airlines, setAirlines] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Airline>(emptyAirline);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeCompany) loadAirlines();
  }, [activeCompany]);

  const loadAirlines = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from('airlines')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('name');
    setAirlines(data || []);
    setLoading(false);
  };

  const handleUploadLogo = async (file: File) => {
    if (!activeCompany) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${activeCompany.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('airline-logos').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('airline-logos').getPublicUrl(path);
      setEditing(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success('Logo enviado!');
    } catch (e: any) {
      toast.error('Erro ao enviar logo: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!activeCompany || !editing.name.trim()) {
      toast.error('Nome da cia aérea é obrigatório.');
      return;
    }
    try {
      if (editingId) {
        await supabase.from('airlines')
          .update({ name: editing.name, logo_url: editing.logo_url, is_active: editing.is_active, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        toast.success('Cia aérea atualizada!');
      } else {
        await supabase.from('airlines')
          .insert({ name: editing.name, logo_url: editing.logo_url, is_active: editing.is_active, empresa_id: activeCompany.id });
        toast.success('Cia aérea cadastrada!');
      }
      setShowModal(false);
      setEditing(emptyAirline);
      setEditingId(null);
      loadAirlines();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const handleEdit = (a: any) => {
    setEditingId(a.id);
    setEditing({ name: a.name, logo_url: a.logo_url, is_active: a.is_active });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta cia aérea?')) return;
    await supabase.from('airlines').delete().eq('id', id);
    toast.success('Cia aérea excluída.');
    loadAirlines();
  };

  const filtered = airlines.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-2 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-foreground">Cias Aéreas</h1>
            <p className="text-xs text-muted-foreground">Cadastro de companhias aéreas</p>
          </div>
          <Button size="sm" onClick={() => { setEditing(emptyAirline); setEditingId(null); setShowModal(true); }}>
            <Plus className="h-3 w-3 mr-1" /> Nova Cia
          </Button>
        </div>

        <div className="relative max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-7" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Logo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhuma cia aérea cadastrada</TableCell></TableRow>
                ) : filtered.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {a.logo_url ? (
                        <img src={a.logo_url} alt={a.name} className="h-5 w-8 object-contain" />
                      ) : (
                        <div className="h-5 w-8 bg-muted flex items-center justify-center text-[9px] text-muted-foreground">—</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-xs">{a.name}</TableCell>
                    <TableCell><Badge variant={a.is_active ? 'default' : 'secondary'}>{a.is_active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Edit className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Cia Aérea' : 'Nova Cia Aérea'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder="Ex: LATAM, GOL, Azul..." />
              </div>
              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-2 mt-1">
                  {editing.logo_url ? (
                    <div className="relative">
                      <img src={editing.logo_url} alt="Logo" className="h-8 w-12 object-contain border" />
                      <button onClick={() => setEditing(p => ({ ...p, logo_url: null }))} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center">
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="h-3 w-3 mr-1" />{uploading ? 'Enviando...' : 'Upload'}
                  </Button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadLogo(f);
                    e.target.value = '';
                  }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={v => setEditing(p => ({ ...p, is_active: v }))} />
                <Label>Ativa</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
