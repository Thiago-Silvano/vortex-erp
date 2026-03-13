import AppLayout from '@/components/AppLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface LabelItem {
  id: string;
  name: string;
  color: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export default function WhatsAppLabelsPage() {
  const { activeCompany } = useCompany();
  const empresaId = activeCompany?.id || '';
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LabelItem | null>(null);
  const [form, setForm] = useState({ name: '', color: '#3B82F6' });

  useEffect(() => {
    if (empresaId) loadLabels();
  }, [empresaId]);

  const loadLabels = async () => {
    const { data } = await (supabase.from('whatsapp_labels').select('*').eq('empresa_id', empresaId).order('name') as any);
    if (data) setLabels(data);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (editing) {
      await (supabase.from('whatsapp_labels').update(form).eq('id', editing.id) as any);
      toast.success('Etiqueta atualizada');
    } else {
      await (supabase.from('whatsapp_labels').insert({ ...form, empresa_id: empresaId }) as any);
      toast.success('Etiqueta criada');
    }
    setShowModal(false);
    loadLabels();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta etiqueta?')) return;
    await (supabase.from('whatsapp_labels').delete().eq('id', id) as any);
    toast.success('Etiqueta excluída');
    loadLabels();
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6" /> Etiquetas</h1>
          <Button onClick={() => { setEditing(null); setForm({ name: '', color: '#3B82F6' }); setShowModal(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Etiqueta</Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels.map(l => (
                <TableRow key={l.id}>
                  <TableCell><Badge style={{ backgroundColor: l.color, color: '#fff' }}>{l.name}</Badge></TableCell>
                  <TableCell><div className="w-6 h-6 rounded-full" style={{ backgroundColor: l.color }} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(l); setForm({ name: l.name, color: l.color }); setShowModal(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {labels.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhuma etiqueta criada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Etiqueta' : 'Nova Etiqueta'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(p => ({ ...p, color: c }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
