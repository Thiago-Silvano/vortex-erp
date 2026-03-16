import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  average_days: number;
  status: string;
  is_supplier_fee: boolean;
  supplier_id: string | null;
  cost_center_id: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

interface CostCenter {
  id: string;
  name: string;
  description: string | null;
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
  const [isSupplierFee, setIsSupplierFee] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
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

  const fetchSuppliers = async () => {
    if (!activeCompany?.id) return;
    const { data } = await supabase.from('suppliers').select('id, name').eq('empresa_id', activeCompany.id).order('name');
    if (data) setSuppliers(data as Supplier[]);
  };

  const fetchCostCenters = async () => {
    const { data } = await supabase.from('cost_centers').select('id, name, description').eq('status', 'active').order('name');
    if (data) setCostCenters(data as CostCenter[]);
  };

  useEffect(() => { fetchProducts(); fetchSuppliers(); fetchCostCenters(); }, [activeCompany?.id]);

  const openNew = () => {
    setEditing(null);
    setName(''); setDescription(''); setPrice(0); setAverageDays(30); setIsSupplierFee(false); setSupplierId(''); setCostCenterId('');
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name); setDescription(p.description); setPrice(p.price); setAverageDays(p.average_days); setIsSupplierFee(p.is_supplier_fee);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Informe o nome do serviço.'); return; }
    setLoading(true);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      price,
      average_days: averageDays,
      is_supplier_fee: isSupplierFee,
      empresa_id: activeCompany?.id,
    };

    if (editing) {
      await supabase.from('visa_products').update(payload).eq('id', editing.id);
      toast.success('Serviço atualizado!');
    } else {
      await supabase.from('visa_products').insert(payload);
      toast.success('Serviço criado!');
    }
    setLoading(false);
    setDialogOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('visa_products').delete().eq('id', id);
    toast.success('Serviço removido.');
    fetchProducts();
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Serviço</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Prazo (dias)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum serviço cadastrado</TableCell></TableRow>
                ) : products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.is_supplier_fee ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Taxa</Badge>
                      ) : (
                        <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">Serviço</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[250px] truncate">{p.description}</TableCell>
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
            <DialogHeader><DialogTitle>{editing ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Visto Americano" /></div>
              <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Preço (R$)</Label><Input value={price ? `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''} onChange={e => { const digits = e.target.value.replace(/[^\d]/g, ''); setPrice(parseInt(digits || '0', 10) / 100); }} placeholder="R$ 0,00" /></div>
                <div><Label>Prazo Médio (dias)</Label><Input type="number" value={averageDays} onChange={e => setAverageDays(Number(e.target.value))} /></div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <Checkbox id="is_supplier_fee" checked={isSupplierFee} onCheckedChange={(v) => setIsSupplierFee(v === true)} />
                <div>
                  <Label htmlFor="is_supplier_fee" className="cursor-pointer text-sm font-medium">Taxa de fornecedor</Label>
                  <p className="text-xs text-muted-foreground">Marque se este serviço é uma taxa repassada ao fornecedor (ex: taxa consular, CASV). Será separado nos relatórios financeiros.</p>
                </div>
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
