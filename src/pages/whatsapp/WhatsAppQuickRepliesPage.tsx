import AppLayout from '@/components/AppLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface QuickReply {
  id: string;
  shortcut: string;
  message: string;
  category: string;
}

export default function WhatsAppQuickRepliesPage() {
  const { activeCompany } = useCompany();
  const empresaId = activeCompany?.id || '';
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [form, setForm] = useState({ shortcut: '', message: '', category: 'geral' });

  useEffect(() => {
    if (empresaId) loadReplies();
  }, [empresaId]);

  const loadReplies = async () => {
    const { data } = await (supabase.from('whatsapp_quick_replies').select('*').eq('empresa_id', empresaId).order('shortcut') as any);
    if (data) setReplies(data);
  };

  const handleSave = async () => {
    if (!form.shortcut.trim() || !form.message.trim()) { toast.error('Atalho e mensagem são obrigatórios'); return; }
    if (editing) {
      await (supabase.from('whatsapp_quick_replies').update(form).eq('id', editing.id) as any);
      toast.success('Resposta rápida atualizada');
    } else {
      await (supabase.from('whatsapp_quick_replies').insert({ ...form, empresa_id: empresaId }) as any);
      toast.success('Resposta rápida criada');
    }
    setShowModal(false);
    loadReplies();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta resposta rápida?')) return;
    await (supabase.from('whatsapp_quick_replies').delete().eq('id', id) as any);
    toast.success('Resposta rápida excluída');
    loadReplies();
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6" /> Respostas Rápidas</h1>
          <Button onClick={() => { setEditing(null); setForm({ shortcut: '', message: '', category: 'geral' }); setShowModal(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Resposta</Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atalho</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {replies.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">/{r.shortcut}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.message}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setForm({ shortcut: r.shortcut, message: r.message, category: r.category }); setShowModal(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {replies.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma resposta rápida criada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Atalho (ex: ola, preco)</Label><Input value={form.shortcut} onChange={e => setForm(p => ({ ...p, shortcut: e.target.value }))} placeholder="ola" /></div>
            <div><Label>Mensagem</Label><Textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={4} placeholder="Olá! Como posso ajudar?" /></div>
            <div><Label>Categoria</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="geral" /></div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
