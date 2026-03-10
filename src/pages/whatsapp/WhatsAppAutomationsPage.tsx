import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Automation { id: string; trigger_keyword: string; response_message: string; is_active: boolean; }

export default function WhatsAppAutomationsPage() {
  const { activeCompany } = useCompany();
  const [items, setItems] = useState<Automation[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ trigger_keyword: '', response_message: '', is_active: true });

  const fetchData = async () => {
    let q = supabase.from('whatsapp_automations').select('*').order('trigger_keyword');
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    const { data } = await q;
    if (data) setItems(data as Automation[]);
  };

  useEffect(() => { fetchData(); }, [activeCompany?.id]);

  const handleSave = async () => {
    if (!form.trigger_keyword.trim() || !form.response_message.trim()) { toast.error('Palavra-chave e resposta são obrigatórias'); return; }
    if (editId) {
      await supabase.from('whatsapp_automations').update(form).eq('id', editId);
      toast.success('Atualizado!');
    } else {
      await supabase.from('whatsapp_automations').insert({ ...form, empresa_id: activeCompany?.id });
      toast.success('Criado!');
    }
    setDialogOpen(false); setEditId(null); setForm({ trigger_keyword: '', response_message: '', is_active: true }); fetchData();
  };

  const toggleActive = async (item: Automation) => {
    await supabase.from('whatsapp_automations').update({ is_active: !item.is_active }).eq('id', item.id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('whatsapp_automations').delete().eq('id', id);
    toast.success('Excluído!'); fetchData();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Zap className="h-6 w-6" /> Automações</h1>
          <Button onClick={() => { setEditId(null); setForm({ trigger_keyword: '', response_message: '', is_active: true }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Nova Automação
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Palavra-chave</TableHead>
                  <TableHead>Resposta automática</TableHead>
                  <TableHead className="w-20">Ativo</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma automação</TableCell></TableRow>
                ) : items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.trigger_keyword}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.response_message}</TableCell>
                    <TableCell>
                      <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditId(item.id); setForm({ trigger_keyword: item.trigger_keyword, response_message: item.response_message, is_active: item.is_active }); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
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
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nova'} Automação</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Palavra-chave (trigger)</Label>
                <Input value={form.trigger_keyword} onChange={e => setForm(p => ({ ...p, trigger_keyword: e.target.value }))} placeholder="ex: visto" />
                <p className="text-xs text-muted-foreground mt-1">Quando o cliente enviar mensagem contendo esta palavra, a resposta será enviada automaticamente.</p>
              </div>
              <div>
                <Label>Resposta automática</Label>
                <Textarea rows={6} value={form.response_message} onChange={e => setForm(p => ({ ...p, response_message: e.target.value }))} placeholder="Mensagem de resposta..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                <Label>Ativo</Label>
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
