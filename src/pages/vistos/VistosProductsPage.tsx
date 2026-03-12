import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  average_days: number;
  status: string;
}

export default function VistosProductsPage() {
  const { activeCompany } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [averageDays, setAverageDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    if (!activeCompany?.id) return;
    const { data } = await supabase
      .from('visa_products')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('name');
    if (data) setProducts(data as Product[]);
  };

  useEffect(() => { fetchProducts(); }, [activeCompany?.id]);

  const openNew = () => {
    setEditing(null);
    setName(''); setDescription(''); setPrice(0); setAverageDays(30);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name); setDescription(p.description); setPrice(p.price); setAverageDays(p.average_days);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Informe o nome do produto.'); return; }
    setLoading(true);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      price,
      average_days: averageDays,
      empresa_id: activeCompany?.id,
    };

    if (editing) {
      await supabase.from('visa_products').update(payload).eq('id', editing.id);
      toast.success('Produto atualizado!');
    } else {
      await supabase.from('visa_products').insert(payload);
      toast.success('Produto criado!');
    }
    setLoading(false);
    setDialogOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('visa_products').delete().eq('id', id);
    toast.success('Produto removido.');
    fetchProducts();
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Produto</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Prazo (dias)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum produto cadastrado</TableCell></TableRow>
                ) : products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">{p.description}</TableCell>
                    <TableCell className="text-right">R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{p.average_days}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogHeader><DialogTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Visto Americano" /></div>
              <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Preço (R$)</Label><Input value={price ? `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''} onChange={e => { const digits = e.target.value.replace(/[^\d]/g, ''); setPrice(parseInt(digits || '0', 10) / 100); }} placeholder="R$ 0,00" /></div>
                <div><Label>Prazo Médio (dias)</Label><Input type="number" value={averageDays} onChange={e => setAverageDays(Number(e.target.value))} /></div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
