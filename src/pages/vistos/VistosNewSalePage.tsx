import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, ChevronsUpDown } from 'lucide-react';
import QuickClientModal from '@/components/QuickClientModal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { maskPhone, validateEmail, maskCurrencyInput, parseCurrency } from '@/lib/masks';

interface Product { id: string; name: string; price: number; }
interface Applicant {
  id?: string;
  full_name: string;
  is_main: boolean;
}

export default function VistosNewSalePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeCompany } = useCompany();
  const editSaleId = (location.state as any)?.editSaleId;

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [applicants, setApplicants] = useState<Applicant[]>([
    { full_name: '', is_main: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [allClients, setAllClients] = useState<{ id: string; full_name: string; phone?: string; email?: string }[]>([]);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientForApplicant, setQuickClientForApplicant] = useState<number | null>(null);

  const refreshClients = () => {
    if (!activeCompany?.id) return;
    supabase.from('clients').select('id, full_name, phone, email').eq('empresa_id', activeCompany.id).order('full_name')
      .then(({ data }) => { if (data) setAllClients(data); });
  };

  useEffect(() => {
    if (!activeCompany?.id) return;
    supabase.from('visa_products').select('id, name, price').eq('empresa_id', activeCompany.id).order('name')
      .then(({ data }) => { if (data) setProducts(data as Product[]); });
    supabase.from('clients').select('id, full_name, phone, email').eq('empresa_id', activeCompany.id).order('full_name')
      .then(({ data }) => { if (data) setAllClients(data); });
  }, [activeCompany?.id]);

  useEffect(() => {
    if (editSaleId) loadSale(editSaleId);
  }, [editSaleId]);

  const loadSale = async (id: string) => {
    const { data: sale } = await supabase.from('visa_sales').select('*').eq('id', id).single();
    if (!sale) return;
    setClientName(sale.client_name); setClientPhone(sale.client_phone || '');
    setClientEmail(sale.client_email || ''); setProductId(sale.product_id || '');
    setTotalValue(sale.total_value || 0); setPaymentMethod(sale.payment_method || 'pix');
    setInstallments(sale.installments || 1); setNotes(sale.notes || '');
    setSaleDate(sale.sale_date);

    const { data: apps } = await supabase.from('visa_applicants').select('*').eq('visa_sale_id', id).order('sort_order');
    if (apps && apps.length > 0) setApplicants(apps as Applicant[]);
  };

  const handleProductChange = (id: string) => {
    setProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) setTotalValue(prod.price * applicants.length);
  };

  const addApplicant = () => {
    setApplicants([...applicants, { full_name: '', is_main: false }]);
    const prod = products.find(p => p.id === productId);
    if (prod) setTotalValue(prod.price * (applicants.length + 1));
  };

  const removeApplicant = (idx: number) => {
    if (applicants.length <= 1) return;
    const updated = applicants.filter((_, i) => i !== idx);
    if (!updated.some(a => a.is_main)) updated[0].is_main = true;
    setApplicants(updated);
    const prod = products.find(p => p.id === productId);
    if (prod) setTotalValue(prod.price * updated.length);
  };

  const updateApplicant = (idx: number, field: keyof Applicant, value: any) => {
    const updated = [...applicants];
    (updated[idx] as any)[field] = value;
    if (field === 'is_main' && value === true) {
      updated.forEach((a, i) => { if (i !== idx) a.is_main = false; });
    }
    setApplicants(updated);
  };

  const handleSave = async () => {
    if (!clientName.trim()) { toast.error('Informe o nome do cliente.'); return; }
    if (!productId) { toast.error('Selecione um produto.'); return; }
    if (applicants.some(a => !a.full_name.trim())) { toast.error('Preencha o nome de todos os aplicantes.'); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const salePayload = {
      empresa_id: activeCompany?.id,
      client_name: clientName.trim(),
      client_phone: clientPhone,
      client_email: clientEmail,
      product_id: productId,
      total_value: totalValue,
      payment_method: paymentMethod,
      installments,
      notes,
      sale_date: saleDate,
      created_by: user?.email || '',
    };

    let saleId = editSaleId;

    if (editSaleId) {
      await supabase.from('visa_sales').update(salePayload).eq('id', editSaleId);
      // Remove old applicants & processes
      await supabase.from('visa_processes').delete().eq('visa_sale_id', editSaleId);
      await supabase.from('visa_applicants').delete().eq('visa_sale_id', editSaleId);
    } else {
      const { data: newSale, error } = await supabase.from('visa_sales').insert(salePayload).select('id').single();
      if (error || !newSale) { toast.error('Erro ao salvar venda.'); setSaving(false); return; }
      saleId = newSale.id;
    }

    // Insert applicants
    const appPayloads = applicants.map((a, i) => ({
      visa_sale_id: saleId,
      full_name: a.full_name.trim(),
      birth_date: null,
      phone: '',
      email: '',
      passport_number: '',
      is_main: a.is_main,
      sort_order: i,
    }));

    const { data: insertedApplicants } = await supabase.from('visa_applicants').insert(appPayloads).select('id, full_name');

    // Create processes for each applicant
    if (insertedApplicants) {
      const processPayloads = insertedApplicants.map(app => ({
        empresa_id: activeCompany?.id,
        visa_sale_id: saleId,
        applicant_id: app.id,
        product_id: productId,
        client_name: clientName.trim(),
        applicant_name: app.full_name,
        status: 'falta_passaporte' as const,
      }));
      await supabase.from('visa_processes').insert(processPayloads);
    }

    toast.success(editSaleId ? 'Venda atualizada!' : 'Venda criada! Processos gerados.');
    setSaving(false);
    navigate('/vistos/sales');
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{editSaleId ? 'Editar Venda' : 'Nova Venda'}</h1>

        <Card>
          <CardHeader><CardTitle>Dados da Venda</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={clientPopoverOpen} className="w-full justify-between font-normal">
                        {clientName || 'Selecione o cliente...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                          <CommandGroup>
                          {allClients.map(c => (
                              <CommandItem key={c.id} value={c.full_name} onSelect={() => {
                                setClientName(c.full_name);
                                setClientPhone(c.phone || '');
                                setClientEmail(c.email || '');
                                setClientPopoverOpen(false);
                              }}>
                                {c.full_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button type="button" size="icon" variant="outline" onClick={() => setQuickClientOpen(true)} title="Cadastrar novo cliente">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div><Label>Telefone</Label><Input value={clientPhone} onChange={e => setClientPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" /></div>
              <div>
                <Label>Email</Label>
                <Input value={clientEmail} onChange={e => setClientEmail(e.target.value.toLowerCase())} placeholder="exemplo@email.com" />
                {clientEmail && !validateEmail(clientEmail) && <p className="text-xs text-destructive mt-1">Email inválido</p>}
              </div>
              <div>
                <Label>Produto *</Label>
                <Select value={productId} onValueChange={handleProductChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data da Venda</Label><Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} /></div>
              <div><Label>Valor Total (R$)</Label><Input value={maskCurrencyInput(totalValue)} onChange={e => setTotalValue(parseCurrency(e.target.value))} placeholder="R$ 0,00" /></div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentMethod === 'cartao' && (
                <div><Label>Parcelas</Label><Input type="number" min={1} max={12} value={installments} onChange={e => setInstallments(Number(e.target.value))} /></div>
              )}
            </div>
            <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Aplicantes</CardTitle>
              <Button variant="outline" size="sm" onClick={addApplicant}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {applicants.map((app, idx) => (
              <div key={idx} className="flex items-center gap-3 border rounded-lg p-3">
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                  {app.is_main ? '⭐' : `${idx + 1}.`}
                </span>
                <div className="flex-1 flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                        {app.full_name || 'Selecione o aplicante...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                          <CommandGroup>
                            {allClients.map(c => (
                              <CommandItem key={c.id} value={c.full_name} onSelect={() => updateApplicant(idx, 'full_name', c.full_name)}>
                                {c.full_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button type="button" size="icon" variant="outline" onClick={() => { setQuickClientForApplicant(idx); setQuickClientOpen(true); }} title="Cadastrar novo cliente">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  {!app.is_main && (
                    <Button variant="ghost" size="sm" onClick={() => updateApplicant(idx, 'is_main', true)}>
                      Tornar principal
                    </Button>
                  )}
                  {applicants.length > 1 && (
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeApplicant(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/vistos/sales')}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Venda'}</Button>
        </div>
      </div>
      <QuickClientModal
        open={quickClientOpen}
        onClose={() => setQuickClientOpen(false)}
        initialName={clientName}
        onClientCreated={(client) => { setClientName(client.full_name); refreshClients(); }}
      />
    </AppLayout>
  );
}
