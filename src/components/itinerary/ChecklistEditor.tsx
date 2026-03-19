import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  sort_order: number;
}

interface Props {
  checklist: ChecklistItem[];
  setChecklist: (items: ChecklistItem[]) => void;
  itineraryId: string;
}

const DEFAULT_CHECKLIST: { category: string; items: string[] }[] = [
  { category: 'Documentos', items: ['Passaporte', 'Visto (se necessário)', 'Seguro viagem', 'Carteira de vacinação', 'Cópia dos documentos', 'Passagens aéreas impressas'] },
  { category: 'Roupas', items: ['Roupas leves', 'Roupas de frio', 'Pijama', 'Roupas de banho', 'Calçado confortável', 'Chinelo'] },
  { category: 'Eletrônicos', items: ['Celular + carregador', 'Adaptador de tomada', 'Fone de ouvido', 'Power bank', 'Câmera fotográfica'] },
  { category: 'Higiene Pessoal', items: ['Escova de dentes', 'Shampoo e condicionador', 'Protetor solar', 'Desodorante', 'Medicamentos pessoais'] },
  { category: 'Itens de Viagem', items: ['Mochila de passeio', 'Garrafa de água', 'Necessaire', 'Travesseiro de pescoço', 'Máscara de dormir'] },
];

export default function ChecklistEditor({ checklist, setChecklist, itineraryId }: Props) {
  const [newCategory, setNewCategory] = useState('');

  const loadDefaults = async () => {
    // Remove existing
    if (checklist.length > 0) {
      await supabase.from('itinerary_checklist').delete().eq('itinerary_id', itineraryId);
    }

    const items: any[] = [];
    let order = 0;
    for (const cat of DEFAULT_CHECKLIST) {
      for (const item of cat.items) {
        items.push({
          itinerary_id: itineraryId,
          category: cat.category,
          item,
          sort_order: order++,
        });
      }
    }

    const { data } = await supabase.from('itinerary_checklist').insert(items).select();
    if (data) setChecklist(data as any[]);
    toast.success('Checklist padrão carregado!');
  };

  const addItem = async (category: string) => {
    const { data } = await supabase.from('itinerary_checklist').insert({
      itinerary_id: itineraryId,
      category,
      item: '',
      sort_order: checklist.length,
    } as any).select().single();
    if (data) setChecklist([...checklist, data as any]);
  };

  const updateItem = (idx: number, value: string) => {
    const updated = [...checklist];
    updated[idx].item = value;
    setChecklist(updated);
  };

  const saveItem = async (item: ChecklistItem) => {
    await supabase.from('itinerary_checklist').update({ item: item.item } as any).eq('id', item.id);
  };

  const removeItem = async (itemId: string) => {
    await supabase.from('itinerary_checklist').delete().eq('id', itemId);
    setChecklist(checklist.filter(c => c.id !== itemId));
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await addItem(newCategory.trim());
    setNewCategory('');
  };

  // Group by category
  const categories = Array.from(new Set(checklist.map(c => c.category)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Checklist de Viagem</h3>
        <Button size="sm" variant="outline" onClick={loadDefaults} className="gap-1.5 h-8 text-xs">
          <RotateCcw className="h-3 w-3" /> Padrão
        </Button>
      </div>

      {categories.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">Nenhum item no checklist</p>
          <Button size="sm" onClick={loadDefaults} className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Carregar Checklist Padrão
          </Button>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</Label>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => addItem(cat)}>
              <Plus className="h-3 w-3" /> Item
            </Button>
          </div>
          {checklist.filter(c => c.category === cat).map((item, idx) => {
            const globalIdx = checklist.findIndex(c => c.id === item.id);
            return (
              <div key={item.id} className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border border-muted-foreground/30 shrink-0" />
                <Input
                  value={item.item}
                  onChange={e => updateItem(globalIdx, e.target.value)}
                  onBlur={() => saveItem(item)}
                  className="h-7 text-xs"
                  placeholder="Item do checklist"
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      ))}

      <div className="pt-2 border-t">
        <Label className="text-xs">Nova Categoria</Label>
        <div className="flex gap-2 mt-1">
          <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} className="h-8 text-xs" placeholder="Ex: Medicamentos" />
          <Button size="sm" variant="outline" className="h-8" onClick={addCategory}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
