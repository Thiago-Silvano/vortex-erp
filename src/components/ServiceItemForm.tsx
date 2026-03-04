import { useState } from 'react';
import { ServiceItem, ServiceType, SERVICE_TYPE_CONFIG } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fileToBase64 } from '@/lib/storage';
import { Plus, X } from 'lucide-react';

interface Props {
  onAdd: (item: ServiceItem) => void;
  editItem?: ServiceItem;
  onCancel?: () => void;
}

const emptyItem = (): Omit<ServiceItem, 'id'> => ({
  type: 'aereo',
  title: '',
  description: '',
  supplier: '',
  startDate: '',
  endDate: '',
  location: '',
  value: 0,
  quantity: 1,
});

export default function ServiceItemForm({ onAdd, editItem, onCancel }: Props) {
  const [item, setItem] = useState<Omit<ServiceItem, 'id'>>(
    editItem ? { ...editItem } : emptyItem()
  );
  const [imagePreview, setImagePreview] = useState<string | undefined>(editItem?.imageBase64);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setImagePreview(base64);
      setItem(prev => ({ ...prev, imageBase64: base64 }));
    }
  };

  const handleSubmit = () => {
    if (!item.title) return;
    onAdd({
      ...item,
      id: editItem?.id || crypto.randomUUID(),
      imageBase64: imagePreview,
    });
    if (!editItem) {
      setItem(emptyItem());
      setImagePreview(undefined);
    }
  };

  return (
    <Card className="border-dashed border-2 border-accent/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          {editItem ? 'Editar Serviço' : 'Adicionar Serviço'}
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={item.type} onValueChange={(v) => setItem(p => ({ ...p, type: v as ServiceType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_TYPE_CONFIG).map(([key, { label, icon }]) => (
                  <SelectItem key={key} value={key}>{icon} {label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={item.title} onChange={e => setItem(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Voo São Paulo → Paris" />
          </div>
        </div>

        <div>
          <Label>Descrição</Label>
          <Textarea value={item.description} onChange={e => setItem(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes do serviço..." rows={2} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Fornecedor</Label>
            <Input value={item.supplier} onChange={e => setItem(p => ({ ...p, supplier: e.target.value }))} placeholder="Ex: Latam" />
          </div>
          <div>
            <Label>Data Início</Label>
            <Input type="date" value={item.startDate} onChange={e => setItem(p => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input type="date" value={item.endDate} onChange={e => setItem(p => ({ ...p, endDate: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Local</Label>
            <Input value={item.location} onChange={e => setItem(p => ({ ...p, location: e.target.value }))} placeholder="Ex: Paris, França" />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" min={0} step={0.01} value={item.value || ''} onChange={e => setItem(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input type="number" min={1} value={item.quantity} onChange={e => setItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
          </div>
        </div>

        <div>
          <Label>Imagem (opcional)</Label>
          <Input type="file" accept="image/*" onChange={handleImageUpload} />
          {imagePreview && (
            <div className="mt-2 relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 rounded object-cover" />
              <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5" onClick={() => { setImagePreview(undefined); setItem(p => ({ ...p, imageBase64: undefined })); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <Button onClick={handleSubmit} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          {editItem ? 'Salvar Alterações' : 'Adicionar ao Orçamento'}
        </Button>
      </CardContent>
    </Card>
  );
}
