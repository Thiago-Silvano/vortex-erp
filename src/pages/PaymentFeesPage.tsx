import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const MAX_INSTALLMENTS = 12;

interface Fee {
  id: string;
  institution: string | null;
  method: string;
  status: string;
  fees_by_installment: Record<string, number>;
}

export default function PaymentFeesPage() {
  const { activeCompany } = useCompany();
  const [items, setItems] = useState<Fee[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [institution, setInstitution] = useState('');
  const [method, setMethod] = useState('maquininha');
  const [status, setStatus] = useState('active');
  const [fees, setFees] = useState<string[]>(Array(MAX_INSTALLMENTS).fill(''));
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    let q = supabase.from('payment_fees').select('*').order('institution');
    if (activeCompany?.id) q = q.or(`empresa_id.eq.${activeCompany.id},empresa_id.is.null`);
    const { data } = await q;
    if (data) setItems(data as any as Fee[]);
  };
  useEffect(() => { load(); }, [activeCompany?.id]);

  const reset = () => {
    setEditingId(null); setInstitution(''); setMethod('maquininha');
    setStatus('active'); setFees(Array(MAX_INSTALLMENTS).fill(''));
  };

  const handleSave = async () => {
    if (!institution.trim()) { toast.error('Instituição é obrigatória'); return; }
    const map: Record<string, number> = {};
    fees.forEach((v, i) => {
      const n = parseFloat(String(v).replace(',', '.'));
      if (!isNaN(n) && n > 0) map[String(i + 1)] = n;
    });
    const payload: any = {
      institution: institution.trim(),
      name: `${institution.trim()} - ${method === 'link' ? 'Link' : 'Maquininha'}`,
      method,
      status,
      fees_by_installment: map,
    };
    if (editingId) {
      await supabase.from('payment_fees').update(payload).eq('id', editingId);
      toast.success('Taxas atualizadas!');
    } else {
      payload.empresa_id = activeCompany?.id || null;
      await supabase.from('payment_fees').insert(payload);
      toast.success('Taxas cadastradas!');
    }
    setOpen(false); reset(); load();
  };

  const handleEdit = (f: Fee) => {
    setEditingId(f.id);
    setInstitution(f.institution || '');
    setMethod(f.method);
    setStatus(f.status);
    const arr = Array(MAX_INSTALLMENTS).fill('');
    Object.entries(f.fees_by_installment || {}).forEach(([k, v]) => {
      const idx = parseInt(k) - 1;
      if (idx >= 0 && idx < MAX_INSTALLMENTS) arr[idx] = String(v).replace('.', ',');
    });
    setFees(arr);
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('payment_fees').delete().eq('id', deleteId);
    setDeleteId(null); toast.success('Cadastro excluído'); load();
  };

  const updateFee = (idx: number, val: string) => {
    setFees(prev => prev.map((v, i) => (i === idx ? val : v)));
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Taxas de Pagamento</h1>
          <Button onClick={() => { reset(); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Nova Tabela de Taxas
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instituição</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Faixa de Taxas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma tabela cadastrada</TableCell></TableRow>
                ) : items.map(f => {
                  const vals = Object.values(f.fees_by_installment || {}).map(Number).filter(n => n > 0);
                  const min = vals.length ? Math.min(...vals) : 0;
                  const max = vals.length ? Math.max(...vals) : 0;
                  return (
                    <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(f)}>
                      <TableCell className="font-medium">{f.institution || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{f.method === 'link' ? 'Link' : 'Maquininha'}</Badge></TableCell>
                      <TableCell>{vals.length ? `${min.toFixed(2).replace('.', ',')}% – ${max.toFixed(2).replace('.', ',')}% (${vals.length} parcelas)` : '—'}</TableCell>
                      <TableCell><Badge variant={f.status === 'active' ? 'default' : 'secondary'}>{f.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(f)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteId(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editingId ? 'Editar Tabela de Taxas' : 'Nova Tabela de Taxas'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label>Instituição Financeira *</Label>
                  <Input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Ex: Cielo, Stone, PagSeguro..." />
                </div>
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
              </div>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Taxas por número de parcelas (%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {fees.map((v, idx) => (
                      <div key={idx}>
                        <Label className="text-xs">{idx + 1}x</Label>
                        <Input
                          inputMode="decimal"
                          placeholder="0,00"
                          value={v}
                          onChange={e => updateFee(idx, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Deixe em branco as parcelas não oferecidas por esta instituição/método.
                  </p>
                </CardContent>
              </Card>

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
              <AlertDialogTitle>Excluir tabela de taxas?</AlertDialogTitle>
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