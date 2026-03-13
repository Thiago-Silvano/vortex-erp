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
import { Checkbox } from '@/components/ui/checkbox';
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

interface PaymentInstallment {
  value: number;
  payment_date: string;
  is_received: boolean;
}

interface PaymentEntry {
  id?: string;
  payment_type: string;
  value: number;
  payment_date: string;
  is_received: boolean;
  num_installments: number;
  installments: PaymentInstallment[];
}

const PAYMENT_TYPES = [
  { value: 'pix', label: 'Pix' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
];

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
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [applicants, setApplicants] = useState<Applicant[]>([
    { full_name: '', is_main: true },
  ]);
  const [payerIsApplicant, setPayerIsApplicant] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allClients, setAllClients] = useState<{ id: string; full_name: string; phone?: string; email?: string }[]>([]);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientForApplicant, setQuickClientForApplicant] = useState<number | null>(null);

  const makeDefaultPayment = (): PaymentEntry => ({
    payment_type: 'pix', value: 0, payment_date: format(new Date(), 'yyyy-MM-dd'), is_received: false, num_installments: 1, installments: [],
  });

  // Multi-payment
  const [payments, setPayments] = useState<PaymentEntry[]>([makeDefaultPayment()]);

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
    setTotalValue(sale.total_value || 0);
    setNotes(sale.notes || '');
    setSaleDate(sale.sale_date);

    const { data: apps } = await supabase.from('visa_applicants').select('*').eq('visa_sale_id', id).order('sort_order');
    if (apps && apps.length > 0) setApplicants(apps as Applicant[]);

    // Load payments
    const { data: paymentData } = await (supabase.from('visa_sale_payments' as any) as any).select('*').eq('visa_sale_id', id).order('created_at');
    if (paymentData && paymentData.length > 0) {
      // Group by payment_type to reconstruct installments
      setPayments(paymentData.map((p: any) => ({
        id: p.id,
        payment_type: p.payment_type,
        value: Number(p.value),
        payment_date: p.payment_date || '',
        is_received: p.is_received || false,
        num_installments: 1,
        installments: [],
      })));
    }
  };

  const handleProductChange = (id: string) => {
    setProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      const newTotal = prod.price * applicants.length;
      setTotalValue(newTotal);
      autoDistributePayments(newTotal);
    }
  };

  const autoDistributePayments = (total: number) => {
    setPayments(prev => {
      if (prev.length === 0) return prev;
      const perPayment = Math.round((total / prev.length) * 100) / 100;
      const remainder = Math.round((total - perPayment * prev.length) * 100) / 100;
      return prev.map((p, i) => ({
        ...p,
        value: i === 0 ? perPayment + remainder : perPayment,
      }));
    });
  };

  const addPayment = () => {
    const newPayments = [...payments, { payment_type: 'pix', value: 0, payment_date: format(new Date(), 'yyyy-MM-dd'), is_received: false }];
    setPayments(newPayments);
    // Auto-distribute
    const perPayment = Math.round((totalValue / newPayments.length) * 100) / 100;
    const remainder = Math.round((totalValue - perPayment * newPayments.length) * 100) / 100;
    setPayments(newPayments.map((p, i) => ({
      ...p,
      value: i === 0 ? perPayment + remainder : perPayment,
    })));
  };

  const removePayment = (idx: number) => {
    if (payments.length <= 1) return;
    const updated = payments.filter((_, i) => i !== idx);
    // Re-distribute
    const perPayment = Math.round((totalValue / updated.length) * 100) / 100;
    const remainder = Math.round((totalValue - perPayment * updated.length) * 100) / 100;
    setPayments(updated.map((p, i) => ({
      ...p,
      value: i === 0 ? perPayment + remainder : perPayment,
    })));
  };

  const updatePayment = (idx: number, field: keyof PaymentEntry, value: any) => {
    setPayments(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const addApplicant = () => {
    setApplicants([...applicants, { full_name: '', is_main: false }]);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const newTotal = prod.price * (applicants.length + 1);
      setTotalValue(newTotal);
      autoDistributePayments(newTotal);
    }
  };

  const removeApplicant = (idx: number) => {
    if (applicants.length <= 1) return;
    const updated = applicants.filter((_, i) => i !== idx);
    if (!updated.some(a => a.is_main)) updated[0].is_main = true;
    setApplicants(updated);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const newTotal = prod.price * updated.length;
      setTotalValue(newTotal);
      autoDistributePayments(newTotal);
    }
  };

  const updateApplicant = (idx: number, field: keyof Applicant, value: any) => {
    const updated = [...applicants];
    (updated[idx] as any)[field] = value;
    if (field === 'is_main' && value === true) {
      updated.forEach((a, i) => { if (i !== idx) a.is_main = false; });
    }
    setApplicants(updated);
  };

  const paymentsTotal = payments.reduce((s, p) => s + p.value, 0);
  const paymentsDiff = Math.round((totalValue - paymentsTotal) * 100) / 100;

  const handleSave = async () => {
    if (!clientName.trim()) { toast.error('Informe o nome do cliente.'); return; }
    if (!productId) { toast.error('Selecione um produto.'); return; }
    if (applicants.some(a => !a.full_name.trim())) { toast.error('Preencha o nome de todos os aplicantes.'); return; }
    if (Math.abs(paymentsDiff) > 0.01) { toast.error('A soma dos pagamentos deve ser igual ao valor total.'); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Use first payment method for legacy field
    const salePayload = {
      empresa_id: activeCompany?.id,
      client_name: clientName.trim(),
      client_phone: clientPhone,
      client_email: clientEmail,
      product_id: productId,
      total_value: totalValue,
      payment_method: payments[0]?.payment_type || 'pix',
      installments: payments.length,
      notes,
      sale_date: saleDate,
      created_by: user?.email || '',
    };

    let saleId = editSaleId;

    if (editSaleId) {
      await supabase.from('visa_sales').update(salePayload).eq('id', editSaleId);
      await supabase.from('visa_processes').delete().eq('visa_sale_id', editSaleId);
      await supabase.from('visa_applicants').delete().eq('visa_sale_id', editSaleId);
      await (supabase.from('visa_sale_payments' as any) as any).delete().eq('visa_sale_id', editSaleId);
      // Delete old receivables linked to this visa sale
      await supabase.from('receivables').delete().eq('sale_id', editSaleId);
    } else {
      const { data: newSale, error } = await supabase.from('visa_sales').insert(salePayload).select('id').single();
      if (error || !newSale) { toast.error('Erro ao salvar venda.'); setSaving(false); return; }
      saleId = newSale.id;
    }

    // Insert payments
    await (supabase.from('visa_sale_payments' as any) as any).insert(
      payments.map(p => ({
        visa_sale_id: saleId,
        payment_type: p.payment_type,
        value: p.value,
        payment_date: p.payment_date || null,
        is_received: p.is_received,
      }))
    );

    // Generate receivables based on payments
    const receivablePayloads = payments.map((p, idx) => {
      const typeLabel = PAYMENT_TYPES.find(t => t.value === p.payment_type)?.label || p.payment_type;
      return {
        sale_id: saleId,
        installment_number: idx + 1,
        due_date: p.payment_date || null,
        amount: p.value,
        client_name: clientName.trim(),
        description: `Visto - ${clientName.trim()} (${typeLabel})`,
        status: p.is_received ? 'paid' : 'pending',
        payment_date: p.is_received ? p.payment_date || null : null,
        payment_method: p.payment_type,
        origin_type: 'visa_sale',
        empresa_id: activeCompany?.id || null,
      };
    });
    if (receivablePayloads.length > 0) {
      await supabase.from('receivables').insert(receivablePayloads as any);
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

      if (payerIsApplicant) {
        const payerAlreadyListed = insertedApplicants.some(
          app => app.full_name.trim().toLowerCase() === clientName.trim().toLowerCase()
        );
        if (!payerAlreadyListed) {
          const { data: payerApplicant } = await supabase.from('visa_applicants').insert({
            visa_sale_id: saleId,
            full_name: clientName.trim(),
            is_main: false,
            sort_order: insertedApplicants.length,
          }).select('id, full_name').single();

          if (payerApplicant) {
            processPayloads.push({
              empresa_id: activeCompany?.id,
              visa_sale_id: saleId,
              applicant_id: payerApplicant.id,
              product_id: productId,
              client_name: clientName.trim(),
              applicant_name: payerApplicant.full_name,
              status: 'falta_passaporte' as const,
            });
          }
        }
      }

      await supabase.from('visa_processes').insert(processPayloads);
    }

    toast.success(editSaleId ? 'Venda atualizada!' : 'Venda criada! Processos gerados.');
    setSaving(false);
    navigate('/vistos/sales');
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

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
              <div><Label>Valor Total (R$)</Label><Input value={maskCurrencyInput(totalValue)} onChange={e => { const v = parseCurrency(e.target.value); setTotalValue(v); autoDistributePayments(v); }} placeholder="R$ 0,00" /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Multi-Payment */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pagamentos</CardTitle>
              <Button variant="outline" size="sm" onClick={addPayment}><Plus className="h-4 w-4 mr-1" /> Adicionar Pagamento</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((payment, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Pagamento {idx + 1}</span>
                  {payments.length > 1 && (
                    <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removePayment(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={payment.payment_type} onValueChange={v => updatePayment(idx, 'payment_type', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input className="h-9" value={maskCurrencyInput(payment.value)} onChange={e => updatePayment(idx, 'value', parseCurrency(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs">Data de Pagamento</Label>
                    <Input className="h-9" type="date" value={payment.payment_date} onChange={e => updatePayment(idx, 'payment_date', e.target.value)} />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Checkbox id={`received-${idx}`} checked={payment.is_received} onCheckedChange={v => updatePayment(idx, 'is_received', v === true)} />
                      <Label htmlFor={`received-${idx}`} className="text-sm cursor-pointer">Recebido</Label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {totalValue > 0 && (
              <div className={`text-sm p-2 rounded ${Math.abs(paymentsDiff) > 0.01 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                Total dos pagamentos: <strong>{fmt(paymentsTotal)}</strong> / Total da venda: <strong>{fmt(totalValue)}</strong>
                {Math.abs(paymentsDiff) > 0.01 && <span className="ml-2">(Diferença: {fmt(paymentsDiff)})</span>}
              </div>
            )}
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
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
              <Checkbox id="payerIsApplicant" checked={payerIsApplicant} onCheckedChange={(v) => setPayerIsApplicant(v === true)} />
              <Label htmlFor="payerIsApplicant" className="cursor-pointer text-sm">O pagante da venda é um aplicante?</Label>
            </div>
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
        onClose={() => { setQuickClientOpen(false); setQuickClientForApplicant(null); }}
        initialName={clientName}
        onClientCreated={(client) => {
          if (quickClientForApplicant !== null) {
            updateApplicant(quickClientForApplicant, 'full_name', client.full_name);
          } else {
            setClientName(client.full_name);
            setClientPhone(client.phone || '');
            setClientEmail(client.email || '');
          }
          refreshClients();
          setQuickClientForApplicant(null);
        }}
      />
    </AppLayout>
  );
}
