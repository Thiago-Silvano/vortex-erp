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
import { Badge } from '@/components/ui/badge';
import QuickClientModal from '@/components/QuickClientModal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { maskPhone, validateEmail, maskCurrencyInput, parseCurrency } from '@/lib/masks';

interface Product { id: string; name: string; price: number; is_supplier_fee: boolean; }

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  is_supplier_fee: boolean;
  supplier_id: string;
  cost_center_id: string;
  payment_due_date: string;
}

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
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [allCostCenters, setAllCostCenters] = useState<{ id: string; name: string }[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [applicants, setApplicants] = useState<Applicant[]>([
    { full_name: '', is_main: true },
  ]);
  const [payerIsApplicant, setPayerIsApplicant] = useState(true);
  const [cardFeeValue, setCardFeeValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [allClients, setAllClients] = useState<{ id: string; full_name: string; phone?: string; email?: string }[]>([]);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientForApplicant, setQuickClientForApplicant] = useState<number | null>(null);

  const makeDefaultPayment = (): PaymentEntry => ({
    payment_type: 'pix', value: 0, payment_date: format(new Date(), 'yyyy-MM-dd'), is_received: false, num_installments: 1, installments: [],
  });

  const [payments, setPayments] = useState<PaymentEntry[]>([makeDefaultPayment()]);

  const totalValue = saleItems.reduce((s, item) => s + item.total_value, 0);
  const totalServices = saleItems.filter(i => !i.is_supplier_fee).reduce((s, i) => s + i.total_value, 0);
  const totalFees = saleItems.filter(i => i.is_supplier_fee).reduce((s, i) => s + i.total_value, 0);

  const refreshClients = () => {
    if (!activeCompany?.id) return;
    supabase.from('clients').select('id, full_name, phone, email').eq('empresa_id', activeCompany.id).order('full_name')
      .then(({ data }) => { if (data) setAllClients(data); });
  };

  useEffect(() => {
    if (!activeCompany?.id) return;
    supabase.from('visa_products').select('id, name, price, is_supplier_fee').eq('empresa_id', activeCompany.id).order('name')
      .then(({ data }) => { if (data) setProducts(data as Product[]); });
    supabase.from('clients').select('id, full_name, phone, email').eq('empresa_id', activeCompany.id).order('full_name')
      .then(({ data }) => { if (data) setAllClients(data); });
    supabase.from('suppliers').select('id, name').order('name')
      .then(({ data }) => { if (data) setAllSuppliers(data); });
    supabase.from('cost_centers').select('id, name').eq('status', 'active').order('name')
      .then(({ data }) => { if (data) setAllCostCenters(data); });
  }, [activeCompany?.id]);

  useEffect(() => {
    if (editSaleId) loadSale(editSaleId);
  }, [editSaleId]);

  const loadSale = async (id: string) => {
    const { data: sale } = await supabase.from('visa_sales').select('*').eq('id', id).single();
    if (!sale) return;
    setClientName(sale.client_name); setClientPhone(sale.client_phone || '');
    setClientEmail(sale.client_email || '');
    setNotes(sale.notes || '');
    setSaleDate(sale.sale_date);
    setCardFeeValue(Number(sale.card_fee_value) || 0);

    // Load sale items
    const { data: items } = await (supabase.from('visa_sale_items' as any) as any).select('*').eq('visa_sale_id', id).order('sort_order');
    if (items && items.length > 0) {
      setSaleItems(items.map((item: any) => ({
        product_id: item.product_id || '',
        product_name: item.product_name || '',
        quantity: item.quantity || 1,
        unit_price: Number(item.unit_price) || 0,
        total_value: Number(item.total_value) || 0,
        is_supplier_fee: item.is_supplier_fee || false,
        supplier_id: item.supplier_id || '',
        cost_center_id: item.cost_center_id || '',
        payment_due_date: item.payment_due_date || '',
      })));
    } else if (sale.product_id) {
      // Legacy: single product_id on sale
      const prod = products.find(p => p.id === sale.product_id);
      if (prod) {
        setSaleItems([{
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: Number(sale.total_value) || prod.price,
          total_value: Number(sale.total_value) || prod.price,
          is_supplier_fee: prod.is_supplier_fee,
          supplier_id: '',
          cost_center_id: '',
          payment_due_date: '',
        }]);
      }
    }

    const { data: apps } = await supabase.from('visa_applicants').select('*').eq('visa_sale_id', id).order('sort_order');
    if (apps && apps.length > 0) setApplicants(apps as Applicant[]);

    const { data: paymentData } = await supabase.from('visa_sale_payments').select('*').eq('visa_sale_id', id).order('created_at');
    if (paymentData && paymentData.length > 0) {
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

  // --- Sale Items management ---
  const addSaleItem = () => {
    setSaleItems(prev => [...prev, { product_id: '', product_name: '', quantity: 1, unit_price: 0, total_value: 0, is_supplier_fee: false, supplier_id: '', cost_center_id: '', payment_due_date: '' }]);
  };

  const updateSaleItem = (idx: number, field: keyof SaleItem, value: any) => {
    setSaleItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          updated.product_name = prod.name;
          updated.unit_price = prod.price;
          updated.is_supplier_fee = prod.is_supplier_fee;
          updated.total_value = prod.price * updated.quantity;
        }
      }
      if (field === 'quantity') {
        updated.total_value = updated.unit_price * (Number(value) || 1);
      }
      if (field === 'unit_price') {
        updated.total_value = (Number(value) || 0) * updated.quantity;
      }
      return updated;
    }));
  };

  const removeSaleItem = (idx: number) => {
    setSaleItems(prev => prev.filter((_, i) => i !== idx));
  };

  // --- Auto distribute payments when total changes ---
  useEffect(() => {
    if (totalValue > 0 && payments.length > 0) {
      autoDistributePayments(totalValue);
    }
  }, [totalValue]);

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
    const newPayments: PaymentEntry[] = [...payments, makeDefaultPayment()];
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
    const perPayment = Math.round((totalValue / updated.length) * 100) / 100;
    const remainder = Math.round((totalValue - perPayment * updated.length) * 100) / 100;
    setPayments(updated.map((p, i) => ({
      ...p,
      value: i === 0 ? perPayment + remainder : perPayment,
    })));
  };

  const isInstallmentType = (type: string) => type === 'cartao_credito' || type === 'boleto';

  const updatePayment = (idx: number, field: keyof PaymentEntry, value: any) => {
    setPayments(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, [field]: value };
      if (field === 'payment_type') {
        if (!isInstallmentType(value as string)) {
          updated.num_installments = 1;
          updated.installments = [];
        } else if (updated.num_installments > 1) {
          updated.installments = generateInstallments(updated.value, updated.num_installments, updated.payment_date);
        }
      }
      if (field === 'num_installments') {
        const num = Math.max(1, Number(value) || 1);
        updated.num_installments = num;
        if (num > 1 && isInstallmentType(updated.payment_type)) {
          updated.installments = generateInstallments(updated.value, num, updated.payment_date);
        } else {
          updated.installments = [];
        }
      }
      if (field === 'value' && updated.num_installments > 1 && isInstallmentType(updated.payment_type)) {
        updated.installments = generateInstallments(value as number, updated.num_installments, updated.payment_date);
      }
      return updated;
    }));
  };

  const generateInstallments = (total: number, count: number, startDate: string): PaymentInstallment[] => {
    const perInst = Math.round((total / count) * 100) / 100;
    const remainder = Math.round((total - perInst * count) * 100) / 100;
    const base = startDate ? new Date(startDate + 'T12:00:00') : new Date();
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + 30 * (i + 1));
      return {
        value: i === 0 ? perInst + remainder : perInst,
        payment_date: format(d, 'yyyy-MM-dd'),
        is_received: false,
      };
    });
  };

  const updateInstallment = (payIdx: number, instIdx: number, field: keyof PaymentInstallment, value: any) => {
    setPayments(prev => prev.map((p, i) => {
      if (i !== payIdx) return p;
      const insts = [...p.installments];
      insts[instIdx] = { ...insts[instIdx], [field]: value };
      return { ...p, installments: insts };
    }));
  };

  const addApplicant = () => {
    setApplicants([...applicants, { full_name: '', is_main: false }]);
  };

  const removeApplicant = (idx: number) => {
    if (applicants.length <= 1) return;
    const updated = applicants.filter((_, i) => i !== idx);
    if (!updated.some(a => a.is_main)) updated[0].is_main = true;
    setApplicants(updated);
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
    if (saleItems.length === 0) { toast.error('Adicione pelo menos um serviço.'); return; }
    if (saleItems.some(item => !item.product_id)) { toast.error('Selecione o serviço em todos os itens.'); return; }
    if (applicants.some(a => !a.full_name.trim())) { toast.error('Preencha o nome de todos os aplicantes.'); return; }
    if (Math.abs(paymentsDiff) > 0.01) { toast.error('A soma dos pagamentos deve ser igual ao valor total.'); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Use first non-fee product for legacy product_id
    const mainItem = saleItems.find(i => !i.is_supplier_fee) || saleItems[0];

    const salePayload = {
      empresa_id: activeCompany?.id,
      client_name: clientName.trim(),
      client_phone: clientPhone,
      client_email: clientEmail,
      product_id: mainItem?.product_id || null,
      total_value: totalValue,
      card_fee_value: cardFeeValue,
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
      await supabase.from('visa_sale_payments').delete().eq('visa_sale_id', editSaleId);
      await (supabase.from('visa_sale_items' as any) as any).delete().eq('visa_sale_id', editSaleId);
      // Receivables and AP will be handled with smart upsert below
    } else {
      const { data: newSale, error } = await supabase.from('visa_sales').insert(salePayload).select('id').single();
      if (error || !newSale) { toast.error('Erro ao salvar venda.'); setSaving(false); return; }
      saleId = newSale.id;
    }

    // Insert sale items
    const itemPayloads = saleItems.map((item, i) => ({
      visa_sale_id: saleId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_value: item.total_value,
      is_supplier_fee: item.is_supplier_fee,
      supplier_id: item.supplier_id || null,
      cost_center_id: item.cost_center_id || null,
      payment_due_date: item.payment_due_date || null,
      sort_order: i,
    }));
    await (supabase.from('visa_sale_items' as any) as any).insert(itemPayloads);

    // Insert payments
    const paymentRows: any[] = [];
    payments.forEach(p => {
      if (p.installments.length > 1) {
        p.installments.forEach(inst => {
          paymentRows.push({
            visa_sale_id: saleId,
            payment_type: p.payment_type,
            value: inst.value,
            payment_date: inst.payment_date || null,
            is_received: inst.is_received,
          });
        });
      } else {
        paymentRows.push({
          visa_sale_id: saleId,
          payment_type: p.payment_type,
          value: p.value,
          payment_date: p.payment_date || null,
          is_received: p.is_received,
        });
      }
    });
    await supabase.from('visa_sale_payments').insert(paymentRows);

    // Generate receivables
    const receivablePayloads: any[] = [];
    let recIdx = 0;
    payments.forEach(p => {
      const typeLabel = PAYMENT_TYPES.find(t => t.value === p.payment_type)?.label || p.payment_type;
      if (p.installments.length > 1) {
        p.installments.forEach((inst, i) => {
          recIdx++;
          receivablePayloads.push({
            visa_sale_id: saleId,
            installment_number: recIdx,
            due_date: inst.payment_date || null,
            amount: inst.value,
            client_name: clientName.trim(),
            description: `Visto - ${clientName.trim()} (${typeLabel} ${i + 1}/${p.installments.length})`,
            status: inst.is_received ? 'paid' : 'pending',
            payment_date: inst.is_received ? inst.payment_date || null : null,
            payment_method: p.payment_type,
            origin_type: 'visa_sale',
            empresa_id: activeCompany?.id || null,
          });
        });
      } else {
        recIdx++;
        receivablePayloads.push({
          visa_sale_id: saleId,
          installment_number: recIdx,
          due_date: p.payment_date || null,
          amount: p.value,
          client_name: clientName.trim(),
          description: `Visto - ${clientName.trim()} (${typeLabel})`,
          status: p.is_received ? 'paid' : 'pending',
          payment_date: p.is_received ? p.payment_date || null : null,
          payment_method: p.payment_type,
          origin_type: 'visa_sale',
          empresa_id: activeCompany?.id || null,
        });
      }
    });
    if (receivablePayloads.length > 0) {
      await supabase.from('receivables').insert(receivablePayloads as any);
    }

    // Generate accounts payable for fee items (taxa de fornecedor)
    const feeItems = saleItems.filter(i => i.is_supplier_fee && i.total_value > 0);
    if (feeItems.length > 0) {
      const apPayloads = feeItems.map(item => ({
        sale_id: saleId,
        description: `Taxa - ${item.product_name} - ${clientName.trim()}`,
        amount: item.total_value,
        supplier_id: item.supplier_id || null,
        cost_center_id: item.cost_center_id || null,
        due_date: item.payment_due_date || null,
        status: 'open',
        origin_type: 'visa_sale',
        empresa_id: activeCompany?.id || null,
      }));
      await supabase.from('accounts_payable').insert(apPayloads as any);
    }

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
      // Create processes only for non-fee products
      const serviceProducts = saleItems.filter(item => !item.is_supplier_fee && item.product_id);
      const processPayloads: any[] = [];

      insertedApplicants.forEach(app => {
        serviceProducts.forEach(item => {
          processPayloads.push({
            empresa_id: activeCompany?.id,
            visa_sale_id: saleId,
            applicant_id: app.id,
            product_id: item.product_id,
            client_name: clientName.trim(),
            applicant_name: app.full_name,
            status: 'falta_passaporte',
          });
        });
      });

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
            serviceProducts.forEach(item => {
              processPayloads.push({
                empresa_id: activeCompany?.id,
                visa_sale_id: saleId,
                applicant_id: payerApplicant.id,
                product_id: item.product_id,
                client_name: clientName.trim(),
                applicant_name: payerApplicant.full_name,
                status: 'falta_passaporte',
              });
            });
          }
        }
      }

      if (processPayloads.length > 0) {
        await supabase.from('visa_processes').insert(processPayloads);
      }
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
              <div><Label>Data da Venda</Label><Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Serviços da Venda */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Serviços da Venda</CardTitle>
              <Button variant="outline" size="sm" onClick={addSaleItem}><Plus className="h-4 w-4 mr-1" /> Adicionar Serviço</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {saleItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum serviço adicionado. Clique em "Adicionar Serviço" para começar.</p>
            )}
            {saleItems.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Serviço {idx + 1}</span>
                    {item.is_supplier_fee && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Taxa</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeSaleItem(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-xs">Serviço *</Label>
                    <Select value={item.product_id} onValueChange={v => updateSaleItem(idx, 'product_id', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {p.is_supplier_fee ? ' (Taxa)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Qtd</Label>
                    <Input className="h-9" type="number" min={1} value={item.quantity} onChange={e => updateSaleItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <Label className="text-xs">Valor Unit. (R$)</Label>
                    <Input className="h-9" value={maskCurrencyInput(item.unit_price)} onChange={e => updateSaleItem(idx, 'unit_price', parseCurrency(e.target.value))} />
                  </div>
                </div>
                {item.is_supplier_fee && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-dashed">
                    <div>
                      <Label className="text-xs">Fornecedor</Label>
                      <Select value={item.supplier_id} onValueChange={v => updateSaleItem(idx, 'supplier_id', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                        <SelectContent>
                          {allSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Centro de Custo</Label>
                      <Select value={item.cost_center_id} onValueChange={v => updateSaleItem(idx, 'cost_center_id', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {allCostCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Data de Pagamento</Label>
                      <Input className="h-9" type="date" value={item.payment_due_date} onChange={e => updateSaleItem(idx, 'payment_due_date', e.target.value)} />
                    </div>
                  </div>
                )}
                <div className="text-sm text-right text-muted-foreground">
                  Subtotal: <strong className="text-foreground">{fmt(item.total_value)}</strong>
                </div>
              </div>
            ))}

            {saleItems.length > 0 && (
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serviços:</span>
                  <span className="font-medium">{fmt(totalServices)}</span>
                </div>
                {totalFees > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxas de fornecedor:</span>
                    <span className="font-medium text-amber-600">{fmt(totalFees)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-1 border-t">
                  <span>Total da Venda:</span>
                  <span>{fmt(totalValue)}</span>
                </div>
              </div>
            )}
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                  {isInstallmentType(payment.payment_type) && (
                    <div>
                      <Label className="text-xs">Parcelas</Label>
                      <Input className="h-9" type="number" min={1} max={24} value={payment.num_installments} onChange={e => updatePayment(idx, 'num_installments', parseInt(e.target.value) || 1)} />
                    </div>
                  )}
                  {(payment.num_installments <= 1 || !isInstallmentType(payment.payment_type)) && (
                    <>
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
                    </>
                  )}
                </div>
                {payment.installments.length > 1 && (
                  <div className="mt-3 space-y-2 pl-4 border-l-2 border-primary/20">
                    <span className="text-xs font-medium text-muted-foreground">Parcelas individuais:</span>
                    {payment.installments.map((inst, iIdx) => (
                      <div key={iIdx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                        <span className="text-xs font-semibold text-foreground self-center">Parcela {iIdx + 1}/{payment.installments.length}</span>
                        <div>
                          <Label className="text-xs">Valor (R$)</Label>
                          <Input className="h-8 text-sm" value={maskCurrencyInput(inst.value)} onChange={e => updateInstallment(idx, iIdx, 'value', parseCurrency(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-xs">Data</Label>
                          <Input className="h-8 text-sm" type="date" value={inst.payment_date} onChange={e => updateInstallment(idx, iIdx, 'payment_date', e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 pb-1">
                          <Checkbox id={`inst-received-${idx}-${iIdx}`} checked={inst.is_received} onCheckedChange={v => updateInstallment(idx, iIdx, 'is_received', v === true)} />
                          <Label htmlFor={`inst-received-${idx}-${iIdx}`} className="text-xs cursor-pointer">Recebido</Label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {/* Taxa da Máquina */}
            <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
              <Label className="text-sm font-semibold">Taxa da Máquina (R$)</Label>
              <Input
                className="h-9 max-w-xs"
                value={maskCurrencyInput(cardFeeValue)}
                onChange={e => setCardFeeValue(parseCurrency(e.target.value))}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">Valor cobrado pela maquininha de cartão. Será deduzido do lucro da venda.</p>
            </div>

            {totalValue > 0 && (
              <div className={`text-sm p-2 rounded ${Math.abs(paymentsDiff) > 0.01 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                Total dos pagamentos: <strong>{fmt(paymentsTotal)}</strong> / Total da venda: <strong>{fmt(totalValue)}</strong>
                {Math.abs(paymentsDiff) > 0.01 && <span className="ml-2">(Diferença: {fmt(paymentsDiff)})</span>}
              </div>
            )}

            {cardFeeValue > 0 && (
              <div className="text-sm p-2 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                Lucro estimado: <strong>{fmt(totalServices - cardFeeValue)}</strong> (Serviços {fmt(totalServices)} − Taxa máquina {fmt(cardFeeValue)})
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
