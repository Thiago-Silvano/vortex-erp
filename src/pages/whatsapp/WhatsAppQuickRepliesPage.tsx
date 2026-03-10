import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuickReply { id: string; shortcut: string; title: string; content: string; }

export default function WhatsAppQuickRepliesPage() {
  const { activeCompany } = useCompany();
  const [items, setItems] = useState<QuickReply[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ shortcut: '', title: '', content: '' });

  const fetch = async () => {
    let q = supabase.from('whatsapp_quick_replies').select('*').order('shortcut');
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    const { data } = await q;
    if (data) setItems(data as QuickReply[]);
  };

  useEffect(() => { fetch(); }, [activeCompany?.id]);

  const handleSave = async () => {
    if (!form.shortcut.trim() || !form.content.trim()) { toast.error('Atalho e conteúdo são obrigatórios'); return; }
    if (editId) {
      await supabase.from('whatsapp_quick_replies').update(form).eq('id', editId);
      toast.success('Atualizado!');
    } else {
      await supabase.from('whatsapp_quick_replies').insert({ ...form, empresa_id: activeCompany?.id });
      toast.success('Criado!');
    }
    setDialogOpen(false); setEditId(null); setForm({ shortcut: '', title: '', content: '' }); fetch();
  };

  const handleEdit = (item: QuickReply) => {
    setEditId(item.id); setForm({ shortcut: item.shortcut, title: item.title, content: item.content }); setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('whatsapp_quick_replies').delete().eq('id', id);
    toast.success('Excluído!'); fetch();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mensagens Rápidas</h1>
          <Button onClick={() => { setEditId(null); setForm({ shortcut: '', title: '', content: '' }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Nova Mensagem
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atalho</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Conteúdo</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma mensagem rápida</TableCell></TableRow>
                ) : items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-primary">/{item.shortcut}</TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.content}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nova'} Mensagem Rápida</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Atalho (sem /)</Label>
                  <Input value={form.shortcut} onChange={e => setForm(p => ({ ...p, shortcut: e.target.value.replace(/\s/g, '').toLowerCase() }))} placeholder="ex: visto" />
                </div>
                <div>
                  <Label>Título</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="ex: Boas-vindas Visto" />
                </div>
              </div>
              <div>
                <Label>Conteúdo da mensagem</Label>
                <Textarea rows={6} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Digite a mensagem completa..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{editId ? 'Atualizar' : 'Criar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
