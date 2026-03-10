import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, FileText, Copy } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'pos_viagem', label: 'Pós-viagem' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'geral', label: 'Geral' },
];

const VARIABLES_HELP = [
  '{{cliente_nome}}', '{{destino}}', '{{data_viagem}}',
  '{{valor_total}}', '{{empresa_nome}}', '{{vendedor_nome}}',
];

export default function EmailTemplatesPage() {
  const { activeCompany } = useCompany();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [category, setCategory] = useState('geral');

  const fetchTemplates = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('created_at', { ascending: false });
    setTemplates((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, [activeCompany]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setSubject('');
    setBodyHtml('');
    setCategory('geral');
    setModalOpen(true);
  };

  const openEdit = (tpl: any) => {
    setEditing(tpl);
    setName(tpl.name);
    setSubject(tpl.subject);
    setBodyHtml(tpl.body_html);
    setCategory(tpl.category || 'geral');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !activeCompany) return;
    const record = { name, subject, body_html: bodyHtml, category, empresa_id: activeCompany.id };

    if (editing) {
      await supabase.from('email_templates').update(record as any).eq('id', editing.id);
      toast.success('Template atualizado');
    } else {
      await supabase.from('email_templates').insert(record as any);
      toast.success('Template criado');
    }
    setModalOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('email_templates').delete().eq('id', id);
    toast.success('Template excluído');
    fetchTemplates();
  };

  const getCategoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || cat;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Templates de Email</h1>
            <p className="text-muted-foreground text-sm">Modelos pré-formatados para envio rápido</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Template
          </Button>
        </div>

        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Variáveis disponíveis:</p>
          <div className="flex flex-wrap gap-2">
            {VARIABLES_HELP.map(v => (
              <Badge key={v} variant="outline" className="text-xs font-mono cursor-pointer"
                onClick={() => { navigator.clipboard.writeText(v); toast.success('Copiado!'); }}>
                {v} <Copy className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Carregando...</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>Nenhum template criado</p>
            <Button onClick={openNew} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Criar primeiro template
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map(tpl => (
              <Card key={tpl.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{tpl.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">{getCategoryLabel(tpl.category)}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tpl)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(tpl.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground"><strong>Assunto:</strong> {tpl.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {tpl.body_html?.replace(/<[^>]+>/g, '').substring(0, 120)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do template</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Envio de orçamento" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assunto</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Assunto do email" />
            </div>
            <div>
              <Label>Corpo do email</Label>
              <Textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} placeholder="Conteúdo do email..." className="min-h-[200px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
