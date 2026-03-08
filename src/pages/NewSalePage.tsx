import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { maskPhone, maskCpf, maskEmail } from '@/lib/masks';

interface SaleItem {
  id?: string;
  description: string;
  cost_price: number;
  rav: number;
  total_value: number;
}

interface Passenger {
  id?: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  document_type: 'cpf' | 'passaporte';
  document_number: string;
  document_expiry: string;
  email: string;
  phone: string;
  is_main: boolean;
}

interface SupplierOption { id: string; name: string; }
interface SellerOption { id: string; full_name: string; }
interface Receivable { installment_number: number; due_date: string; amount: number; }
interface CostCenter { id: string; name: string; }
interface CardRateEntry { installments: number; rate: number; }

export default function NewSalePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const quoteData = (location.state as any)?.quoteData;
  const editSaleId = (location.state as any)?.editSaleId;

  const [quoteId, setQuoteId] = useState(quoteData?.id || '');
  const [clientName, setClientName] = useState(quoteData?.clientName || '');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const [allSuppliers, setAllSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [addingSupplierId, setAddingSupplierId] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [installments, setInstallments] = useState(1);
  const [cardPaymentType, setCardPaymentType] = useState('');
  const [feeRate, setFeeRate] = useState(0);
  const [commissionRate, setCommissionRate] = useState(0);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [allSellers, setAllSellers] = useState<SellerOption[]>([]);
  const [sellerId, setSellerId] = useState<string>(quoteData?.sellerId || '');

  const [ecRates, setEcRates] = useState<CardRateEntry[]>([]);
  const [linkRates, setLinkRates] = useState<CardRateEntry[]>([]);

  useEffect(() => {
    if (editSaleId) loadSale(editSaleId);
  }, [editSaleId]);

  const loadSale = async (id: string) => {
    const { data: sale } = await supabase.from('sales').select('*').eq('id', id).single();
    if (!sale) return;
    setQuoteId(sale.quote_id || '');
    setClientName(sale.client_name);
    setSaleDate(sale.sale_date);
    setPaymentMethod(sale.payment_method || 'pix');
    setInstallments(sale.installments || 1);
    setCardPaymentType((sale as any).card_payment_type || '');
    setFeeRate(Number(sale.card_fee_rate) || 0);
    setCommissionRate(Number(sale.commission_rate) || 0);
    setSellerId((sale as any).seller_id || '');
    setNotes(sale.notes || '');

    const { data: saleItems } = await supabase.from('sale_items').select('*').eq('sale_id', id).order('sort_order');
    if (saleItems) setItems(saleItems.map(i => ({ id: i.id, description: i.description, cost_price: Number(i.cost_price), rav: Number(i.rav), total_value: Number(i.total_value) })));

    const { data: saleSups } = await supabase.from('sale_suppliers').select('supplier_id').eq('sale_id', id);
    if (saleSups) setSelectedSupplierIds(saleSups.map(s => s.supplier_id));

    const { data: recs } = await supabase.from('receivables').select('*').eq('sale_id', id).order('installment_number');
    if (recs) setReceivables(recs.map(r => ({ installment_number: r.installment_number, due_date: r.due_date || '', amount: Number(r.amount) })));

    const { data: pax } = await supabase.from('sale_passengers' as any).select('*').eq('sale_id', id).order('sort_order');
    if (pax) setPassengers((pax as any[]).map(p => ({
      id: p.id, first_name: p.first_name, last_name: p.last_name, birth_date: p.birth_date || '',
      document_type: p.document_type || 'cpf', document_number: p.document_number || '',
      document_expiry: p.document_expiry || '', email: p.email || '', phone: p.phone || '', is_main: p.is_main || false,
    })));
  };

  useEffect(() => {
    supabase.from('suppliers').select('id, name').order('name').then(({ data }) => { if (data) setAllSuppliers(data); });
    supabase.from('cost_centers').select('id, name').eq('status', 'active').order('name').then(({ data }) => { if (data) setCostCenters(data); });
    (supabase.from('card_rates').select('*').order('installments') as any).then(({ data }: any) => {
      if (data && data.length > 0) {
        setEcRates(data.filter((r: any) => r.payment_type === 'ec').map((r: any) => ({ installments: r.installments, rate: Number(r.rate) })));
        setLinkRates(data.filter((r: any) => r.payment_type === 'link').map((r: any) => ({ installments: r.installments, rate: Number(r.rate) })));
      }
    });
    if (activeCompany) {
      (supabase.from('sellers') as any).select('id, full_name').eq('empresa_id', activeCompany.id).eq('status', 'active').order('full_name').then(({ data }: any) => { if (data) setAllSellers(data); });
    }
  }, [activeCompany]);

  useEffect(() => {
    if (quoteData?.services && items.length === 0 && !editSaleId) {
      const mapped = quoteData.services.map((s: any) => ({
        description: s.title || s.description || '',
        cost_price: (s.value || 0) * (s.quantity || 1),
        rav: 0,
        total_value: (s.value || 0) * (s.quantity || 1),
      }));
      if (quoteData.rav && quoteData.rav > 0) {
        mapped.push({ description: 'RAV (Markup)', cost_price: 0, rav: quoteData.rav, total_value: quoteData.rav });
      }
      setItems(mapped);
    }
  }, [quoteData]);

  useEffect(() => {
    if (paymentMethod !== 'credito' || !cardPaymentType) return;
    const rates = cardPaymentType === 'ec' ? ecRates : linkRates;
    const found = rates.find(r => r.installments === installments);
    if (found) setFeeRate(found.rate);
  }, [cardPaymentType, installments, ecRates, linkRates, paymentMethod]);

  const totalSale = useMemo(() => items.reduce((s, i) => s + i.total_value, 0), [items]);
  const totalCost = useMemo(() => items.reduce((s, i) => s + i.cost_price, 0), [items]);
  const grossProfit = totalSale - totalCost;
  const commissionValue = grossProfit * (commissionRate / 100);
  const cardFeeValue = paymentMethod === 'credito' ? totalSale * (feeRate / 100) : 0;
  const netProfit = grossProfit - commissionValue - cardFeeValue;

  useEffect(() => {
    if (paymentMethod !== 'credito') {
      setReceivables([{ installment_number: 1, due_date: '', amount: totalSale }]);
      return;
    }
    const perInstallment = installments > 0 ? totalSale / installments : totalSale;
    const recs: Receivable[] = [];
    for (let i = 1; i <= installments; i++) {
      recs.push({ installment_number: i, due_date: '', amount: perInstallment });
    }
    setReceivables(recs);
  }, [installments, paymentMethod, totalSale]);

  const updateItem = (idx: number, field: keyof SaleItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'cost_price' || field === 'rav') updated.total_value = updated.cost_price + updated.rav;
      return updated;
    }));
  };

  const addSupplier = () => {
    if (!addingSupplierId || selectedSupplierIds.includes(addingSupplierId)) return;
    setSelectedSupplierIds(prev => [...prev, addingSupplierId]);
    setAddingSupplierId('');
  };

  const addPassenger = () => {
    setPassengers(prev => [...prev, {
      first_name: '', last_name: '', birth_date: '', document_type: 'cpf',
      document_number: '', document_expiry: '', email: '', phone: '', is_main: prev.length === 0,
    }]);
  };

  const updatePassenger = (idx: number, field: keyof Passenger, value: any) => {
    setPassengers(prev => prev.map((p, i) => {
      if (i !== idx) return field === 'is_main' && value === true ? { ...p, is_main: false } : p;
      return { ...p, [field]: value };
    }));
  };

  const removePassenger = (idx: number) => {
    setPassengers(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some(p => p.is_main)) updated[0].is_main = true;
      return updated;
    });
  };

  const handleCancel = async () => {
    // If coming from quote conversion and not editing, revert quote status back to draft
    if (quoteId && !editSaleId) {
      await supabase.from('quotes').update({ status: 'draft' }).eq('id', quoteId);
    }
    navigate('/sales');
  };

  const handleSave = async () => {
    if (!clientName.trim()) { toast.error('Nome do cliente é obrigatório'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || '';

    const salePayload: any = {
      quote_id: quoteId || null,
      client_name: clientName,
      sale_date: saleDate,
      payment_method: paymentMethod,
      installments: paymentMethod === 'credito' ? installments : 1,
      card_charge_type: '',
      card_payment_type: paymentMethod === 'credito' ? cardPaymentType : '',
      card_fee_rate: paymentMethod === 'credito' ? feeRate : 0,
      total_sale: totalSale,
      total_supplier_cost: totalCost,
      gross_profit: grossProfit,
      commission_rate: commissionRate,
      commission_value: commissionValue,
      card_fee_value: cardFeeValue,
      net_profit: netProfit,
      notes,
      status: 'active',
      created_by: userEmail,
      updated_by: userEmail,
      empresa_id: activeCompany?.id || null,
      seller_id: sellerId || null,
    };

    let saleId = editSaleId;

    if (editSaleId) {
      const { error } = await supabase.from('sales').update({ ...salePayload, updated_by: userEmail } as any).eq('id', editSaleId);
      if (error) { toast.error('Erro ao atualizar venda'); return; }
      await supabase.from('sale_items').delete().eq('sale_id', editSaleId);
      await supabase.from('sale_suppliers').delete().eq('sale_id', editSaleId);
      await supabase.from('receivables').delete().eq('sale_id', editSaleId);
      await supabase.from('accounts_payable').delete().eq('sale_id', editSaleId);
      await (supabase.from('sale_passengers' as any) as any).delete().eq('sale_id', editSaleId);
    } else {
      const { data, error } = await supabase.from('sales').insert(salePayload as any).select('id').single();
      if (error || !data) { toast.error('Erro ao criar venda'); return; }
      saleId = data.id;
    }

    if (items.length > 0) {
      await supabase.from('sale_items').insert(items.map((item, idx) => ({
        sale_id: saleId, description: item.description, cost_price: item.cost_price, rav: item.rav, total_value: item.total_value, sort_order: idx,
      })));
    }

    if (selectedSupplierIds.length > 0) {
      await supabase.from('sale_suppliers').insert(selectedSupplierIds.map(sid => ({ sale_id: saleId, supplier_id: sid })));
    }

    // Save passengers
    if (passengers.length > 0) {
      await (supabase.from('sale_passengers' as any) as any).insert(passengers.map((p, idx) => ({
        sale_id: saleId, first_name: p.first_name, last_name: p.last_name,
        birth_date: p.birth_date || null, document_type: p.document_type,
        document_number: p.document_number, document_expiry: p.document_expiry || null,
        email: p.email, phone: p.phone, is_main: p.is_main, sort_order: idx,
      })));
    }

    if (receivables.length > 0) {
      await supabase.from('receivables').insert(receivables.map(r => ({
        sale_id: saleId, installment_number: r.installment_number, due_date: r.due_date || null, amount: r.amount,
        client_name: clientName, description: `Venda - ${clientName}`, status: 'pending', origin_type: 'sale',
      } as any)));
    }

    if (totalCost > 0 && selectedSupplierIds.length > 0) {
      const costPerSupplier = totalCost / selectedSupplierIds.length;
      await supabase.from('accounts_payable').insert(selectedSupplierIds.map(sid => ({
        sale_id: saleId, supplier_id: sid, amount: costPerSupplier,
        due_date: saleDate, description: `Venda - ${clientName}`, status: 'open', origin_type: 'sale',
      })));
    }

    if (quoteId) {
      await supabase.from('quotes').update({ status: 'concluido' }).eq('id', quoteId);
    }

    // Auto-create calendar event with main passenger info
    if (passengers.length > 0 && !editSaleId) {
      const mainPassenger = passengers.find(p => p.is_main) || passengers[0];
      const eventTitle = `${mainPassenger.first_name} ${mainPassenger.last_name}`.trim() || clientName;
      const eventDate = saleDate; // departure date = sale date as default
      await supabase.from('calendar_events').insert({
        title: eventTitle,
        event_date: eventDate,
        passengers: passengers.length,
      });
    }

    // Auto-generate commission if seller is assigned
    if (sellerId && !editSaleId) {
      const { data: sellerData } = await (supabase.from('sellers') as any).select('*').eq('id', sellerId).single();
      if (sellerData && sellerData.commission_type !== 'none') {
        let commValue = 0;
        const pct = Number(sellerData.commission_percentage) || 0;
        if (sellerData.commission_type === 'sales_percentage') {
          const base = sellerData.commission_base === 'net_received' ? totalSale - cardFeeValue
            : sellerData.commission_base === 'sale_profit' ? grossProfit : totalSale;
          commValue = base * (pct / 100);
        } else if (sellerData.commission_type === 'profit_percentage') {
          commValue = grossProfit * (pct / 100);
        } else if (sellerData.commission_type === 'company_profit_percentage') {
          commValue = commissionValue * (pct / 100);
        } else {
          commValue = grossProfit * (pct / 100);
        }
        await (supabase.from('seller_commissions') as any).insert({
          empresa_id: activeCompany?.id || null,
          seller_id: sellerId,
          sale_id: saleId,
          client_name: clientName,
          sale_date: saleDate,
          sale_value: totalSale,
          cost_value: totalCost,
          profit_value: grossProfit,
          commission_percentage: pct,
          commission_value: commValue,
          commission_type: sellerData.commission_type,
          status: 'pending',
        });
      }
    }

    toast.success(editSaleId ? 'Venda atualizada!' : 'Venda criada com sucesso!');
    navigate('/sales');
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{editSaleId ? 'Editar Venda' : 'Nova Venda'}</h1>

        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informações da Venda</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quoteId && (
                <div>
                  <Label>Código da Cotação</Label>
                  <Input value={quoteId} disabled className="bg-muted" />
                </div>
              )}
              <div className={quoteId ? '' : 'md:col-span-2'}>
                <Label>Nome do Cliente *</Label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} />
              </div>
              <div>
                <Label>Data da Venda</Label>
                <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
              </div>
              <div>
                <Label>Vendedor Responsável</Label>
                <Select value={sellerId} onValueChange={setSellerId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {allSellers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passengers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Passageiros da Reserva</CardTitle>
            <Button size="sm" variant="outline" onClick={addPassenger}>
              <Plus className="h-4 w-4 mr-1" />Adicionar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {passengers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum passageiro adicionado</p>
            )}
            {passengers.map((pax, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={pax.is_main} onCheckedChange={(checked) => updatePassenger(idx, 'is_main', !!checked)} />
                    <Label className="text-sm font-medium">Passageiro principal</Label>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removePassenger(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input value={pax.first_name} onChange={e => updatePassenger(idx, 'first_name', e.target.value)} placeholder="Nome" />
                  </div>
                  <div>
                    <Label className="text-xs">Sobrenome</Label>
                    <Input value={pax.last_name} onChange={e => updatePassenger(idx, 'last_name', e.target.value)} placeholder="Sobrenome" />
                  </div>
                  <div>
                    <Label className="text-xs">Data de Nascimento</Label>
                    <Input type="date" value={pax.birth_date} onChange={e => updatePassenger(idx, 'birth_date', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo de Documento</Label>
                    <Select value={pax.document_type} onValueChange={v => updatePassenger(idx, 'document_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="passaporte">Passaporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Nº do Documento</Label>
                    <Input
                      value={pax.document_number}
                      onChange={e => {
                        const val = pax.document_type === 'cpf' ? maskCpf(e.target.value) : e.target.value;
                        updatePassenger(idx, 'document_number', val);
                      }}
                      placeholder={pax.document_type === 'cpf' ? '000.000.000-00' : 'Nº passaporte'}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Vencimento Doc.</Label>
                    <Input type="date" value={pax.document_expiry} onChange={e => updatePassenger(idx, 'document_expiry', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">E-mail</Label>
                    <Input
                      value={pax.email}
                      onChange={e => updatePassenger(idx, 'email', maskEmail(e.target.value))}
                      placeholder="email@exemplo.com"
                      type="email"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input
                      value={pax.phone}
                      onChange={e => updatePassenger(idx, 'phone', maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Suppliers */}
        <Card>
          <CardHeader><CardTitle className="text-base">Fornecedores da Venda</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={addingSupplierId} onValueChange={setAddingSupplierId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar fornecedor..." /></SelectTrigger>
                <SelectContent>
                  {allSuppliers.filter(s => !selectedSupplierIds.includes(s.id)).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addSupplier} variant="outline"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
            </div>
            {selectedSupplierIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSupplierIds.map(sid => {
                  const sup = allSuppliers.find(s => s.id === sid);
                  return (
                    <div key={sid} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm">
                      <span>{sup?.name || sid}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setSelectedSupplierIds(prev => prev.filter(s => s !== sid))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Itens da Venda</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setItems(prev => [...prev, { description: '', cost_price: 0, rav: 0, total_value: 0 }])}>
              <Plus className="h-4 w-4 mr-1" />Adicionar Item
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-36">Preço de Custo</TableHead>
                  <TableHead className="w-36">RAV</TableHead>
                  <TableHead className="w-36">Valor Total</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={item.cost_price} onChange={e => updateItem(idx, 'cost_price', parseFloat(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={item.rav} onChange={e => updateItem(idx, 'rav', parseFloat(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={item.total_value} disabled className="bg-muted" /></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader><CardTitle className="text-base">Forma de Pagamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { value: 'pix', label: 'Pix' },
                { value: 'dinheiro', label: 'Dinheiro' },
                { value: 'boleto', label: 'Boleto' },
                { value: 'credito', label: 'Cartão de Crédito' },
                { value: 'debito', label: 'Cartão de Débito' },
              ].map(opt => (
                <Button key={opt.value} variant={paymentMethod === opt.value ? 'default' : 'outline'} className="w-full" onClick={() => setPaymentMethod(opt.value)}>
                  {opt.label}
                </Button>
              ))}
            </div>

            {paymentMethod === 'credito' && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo de Pagamento</Label>
                    <Select value={cardPaymentType} onValueChange={setCardPaymentType}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ec">EC (Máquina)</SelectItem>
                        <SelectItem value="link">Link de Pagamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Parcelamento</Label>
                    <Select value={String(installments)} onValueChange={v => setInstallments(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 18 }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Taxa (%)</Label>
                    <Input type="number" step="0.01" value={feeRate} onChange={e => setFeeRate(parseFloat(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground mt-1">Preenchida automaticamente, editável manualmente</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receivables */}
        <Card>
          <CardHeader><CardTitle className="text-base">Controle de Recebíveis</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Parcela</TableHead>
                  <TableHead>Data de Recebimento</TableHead>
                  <TableHead className="w-40">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{r.installment_number}ª</TableCell>
                    <TableCell>
                      <Input type="date" value={r.due_date} onChange={e => setReceivables(prev => prev.map((rec, i) => i === idx ? { ...rec, due_date: e.target.value } : rec))} />
                    </TableCell>
                    <TableCell className="font-medium">{fmt(r.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Observação da Venda</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações internas sobre a venda..." rows={3} />
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total da Venda</p>
                <p className="text-xl font-bold">{fmt(totalSale)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Custo Fornecedor</p>
                <p className="text-xl font-bold">{fmt(totalCost)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lucro Bruto</p>
                <p className="text-xl font-bold text-primary">{fmt(grossProfit)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Comissão (%)</Label>
                <Input type="number" step="0.01" value={commissionRate} onChange={e => setCommissionRate(parseFloat(e.target.value) || 0)} className="mt-1 w-24" />
                <p className="text-sm mt-1">{fmt(commissionValue)}</p>
              </div>
              {paymentMethod === 'credito' && (
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Cartão ({feeRate}%)</p>
                  <p className="text-lg font-semibold text-destructive">{fmt(cardFeeValue)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Lucro Líquido Final</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(netProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleSave}>{editSaleId ? 'Atualizar Venda' : 'Salvar Venda'}</Button>
        </div>
      </div>
    </AppLayout>
  );
}
