import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Label {
  id: string;
  name: string;
  color: string;
}

const COLORS = ['#4CAF50', '#C8A951', '#9C27B0', '#795548', '#FF9800', '#E91E63', '#3B82F6', '#06B6D4'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  empresaId: string;
}

export default function LabelPickerModal({ open, onOpenChange, conversationId, empresaId }: Props) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialIds, setInitialIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [form, setForm] = useState({ name: '', color: COLORS[0] });

  useEffect(() => {
    if (open && empresaId && conversationId) {
      loadLabels();
      loadSelected();
    }
  }, [open, empresaId, conversationId]);

  const loadLabels = async () => {
    const { data } = await (supabase.from('whatsapp_labels').select('*').eq('empresa_id', empresaId).order('name') as any);
    if (data) setLabels(data);
  };

  const loadSelected = async () => {
    const { data } = await (supabase.from('whatsapp_conversation_labels').select('label_id').eq('conversation_id', conversationId) as any);
    const ids = new Set<string>((data || []).map((r: any) => r.label_id));
    setSelectedIds(ids);
    setInitialIds(new Set(ids));
  };

  const toggleLabel = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    const toAdd = [...selectedIds].filter(id => !initialIds.has(id));
    const toRemove = [...initialIds].filter(id => !selectedIds.has(id));

    for (const labelId of toAdd) {
      await (supabase.from('whatsapp_conversation_labels').insert({ conversation_id: conversationId, label_id: labelId, empresa_id: empresaId }) as any);
    }
    for (const labelId of toRemove) {
      await (supabase.from('whatsapp_conversation_labels').delete().eq('conversation_id', conversationId).eq('label_id', labelId) as any);
    }

    toast.success('Etiquetas atualizadas');
    onOpenChange(false);
  };

  const handleCreateOrEdit = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (editingLabel) {
      await (supabase.from('whatsapp_labels').update({ name: form.name, color: form.color }).eq('id', editingLabel.id) as any);
      toast.success('Etiqueta atualizada');
    } else {
      await (supabase.from('whatsapp_labels').insert({ name: form.name, color: form.color, empresa_id: empresaId }) as any);
      toast.success('Etiqueta criada');
    }
    setShowCreate(false);
    setEditingLabel(null);
    setForm({ name: '', color: COLORS[0] });
    loadLabels();
  };

  const handleDeleteLabel = async (id: string) => {
    if (!confirm('Excluir esta etiqueta?')) return;
    await (supabase.from('whatsapp_labels').delete().eq('id', id) as any);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    toast.success('Etiqueta excluída');
    loadLabels();
  };

  const startEdit = (label: Label) => {
    setEditingLabel(label);
    setForm({ name: label.name, color: label.color });
    setShowCreate(true);
  };

  const hasChanges = (() => {
    if (selectedIds.size !== initialIds.size) return true;
    for (const id of selectedIds) if (!initialIds.has(id)) return true;
    return false;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] p-0 gap-0">
        <DialogHeader className="flex flex-row items-center gap-3 px-4 py-3 border-b">
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-accent rounded-md">
            <X className="h-5 w-5" />
          </button>
          <DialogTitle className="text-base font-medium">Etiquetar itens</DialogTitle>
        </DialogHeader>

        {!showCreate ? (
          <div className="flex flex-col">
            {/* Nova etiqueta */}
            <button
              onClick={() => { setEditingLabel(null); setForm({ name: '', color: COLORS[0] }); setShowCreate(true); }}
              className="flex items-center gap-4 px-5 py-4 hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">Nova etiqueta</span>
            </button>

            {/* Label list */}
            <div className="max-h-[400px] overflow-y-auto">
              {labels.map(label => (
                <div key={label.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent transition-colors group">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: label.color + '33' }}>
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: label.color }} />
                  </div>
                  <span className="text-sm flex-1">{label.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(label)} className="p-1 hover:bg-accent rounded">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDeleteLabel(label.id)} className="p-1 hover:bg-accent rounded">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                  <Checkbox
                    checked={selectedIds.has(label.id)}
                    onCheckedChange={() => toggleLabel(label.id)}
                  />
                </div>
              ))}
              {labels.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma etiqueta criada</div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!hasChanges}>Salvar</Button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <Input
              placeholder="Nome da etiqueta"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              autoFocus
            />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Cor</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(p => ({ ...p, color: c }))}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => { setShowCreate(false); setEditingLabel(null); }}>Cancelar</Button>
              <Button className="flex-1" onClick={handleCreateOrEdit}>{editingLabel ? 'Atualizar' : 'Criar'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
