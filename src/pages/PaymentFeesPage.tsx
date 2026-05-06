import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Fee {
  id: string;
  name: string;
  method: string;
  installments: number;
  fee_percent: number;
  status: string;
}

export default function PaymentFeesPage() {
  const { activeCompany } = useCompany();
  const [items, setItems] = useState<Fee[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [method, setMethod] = useState('maquininha');
  const [installments, setInstallments] = useState(1);
  const [feePercent, setFeePercent] = useState('');
  const [status, setStatus] = useState('active');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    let q = supabase.from('payment_fees').select('*').order('method').order('installments');
    if (activeCompany?.id) q = q.or(`empresa_id.eq.${activeCompany.id},empresa_id.is.null`);
    const { data } = await q;
    if (data) setItems(data as Fee[]);
  };
  useEffect(() => { load(); }, [activeCompany?.id]);

  const reset = () => {
    setEditingId(null); setName(''); setMethod('maquininha');
    setInstallments(1); setFeePercent(''); setStatus('active');
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nome é obrigatório'); return; }
    const payload: any = {
      name, method, installments,
      fee_percent: parseFloat(String(feePercent).replace(',', '.')) || 0,
      status,
    };
    if (editingId) {
      await supabase.from('payment_fees').update(payload).eq('id', editingId);
      toast.success('Taxa atualizada!');
    } else {
      payload.empresa_id = activeCompany?.id || null;
      await supabase.from('payment_fees').insert(payload);
      toast.success('Taxa cadastrada!');
    }
    setOpen(false); reset(); load();
  };

  const handleEdit = (f: Fee) => {
    setEditingId(f.id); setName(f.name); setMethod(f.method);
    setInstallments(f.installments); setFeePercent(String(f.fee_percent));
    setStatus(f.status); setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('payment_fees').delete().eq('id', deleteId);
    setDeleteId(null); toast.success('Taxa excluída'); load();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Taxas de Pagamento</h1>
          <Button onClick={() => { reset(); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Nova Taxa
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Taxa (%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma taxa cadastrada</TableCell></TableRow>
                ) : items.map(f => (
                  <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(f)}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell><Badge variant="outline">{f.method === 'link' ? 'Link' : 'Maquininha'}</Badge></TableCell>
                    <TableCell>{f.installments}x</TableCell>
                    <TableCell>{Number(f.fee_percent).toFixed(2).replace('.', ',')}%</TableCell>
                    <TableCell><Badge variant={f.status === 'active' ? 'default' : 'secondary'}>{f.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(f)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingId ? 'Editar Taxa' : 'Nova Taxa'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Cielo Crédito 1x" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Método</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maquininha">Maquininha</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Parcelas</Label>
                  <Input type="number" min={1} max={24} value={installments}
                    onChange={e => setInstallments(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
              </div>
              <div>
                <Label>Taxa do banco (%)</Label>
                <Input value={feePercent} onChange={e => setFeePercent(e.target.value)} placeholder="Ex: 5,79" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir taxa?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}