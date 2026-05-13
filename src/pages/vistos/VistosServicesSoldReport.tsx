import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableLoadingRow } from '@/components/TableLoadingRow';

import { Badge } from '@/components/ui/badge';
import { FileDown, Filter, X, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import SalesDateFilter, { DateFilterPeriod, getDateRange } from '@/components/SalesDateFilter';
import { generateReportPdf } from '@/lib/generateReportPdf';

interface Row {
  id: string;
  visa_sale_id: string;
  product_name: string;
  product_id: string | null;
  supplier_id: string | null;
  supplier_name: string;
  cost_center_id: string | null;
  cost_center_name: string;
  is_supplier_fee: boolean;
  quantity: number;
  unit_price: number;
  total_value: number;
  client_name: string;
  sale_date: string;
  payment_method: string;
  status: string;
  created_by: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', boleto: 'Boleto',
  cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Débito', transferencia: 'Transferência',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa', draft: 'Rascunho', cancelled: 'Cancelada', completed: 'Concluída',
};

interface MultiSelectProps {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}
function MultiSelect({ options, values, onChange, placeholder = 'Todos' }: MultiSelectProps) {
  const toggle = (v: string) => {
    if (values.includes(v)) onChange(values.filter(x => x !== v));
    else onChange([...values, v]);
  };
  const label = values.length === 0
    ? placeholder
    : values.length === 1
      ? (options.find(o => o.value === values[0])?.label || values[0])
      : `${values.length} selecionados`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-1 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 max-h-72 overflow-y-auto" align="start">
        <div className="flex items-center justify-between mb-1 px-1">
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => onChange([])}>Limpar</button>
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => onChange(options.map(o => o.value))}>Todos</button>
        </div>
        <div className="space-y-1">
          {options.length === 0 && <p className="text-xs text-muted-foreground p-2">Sem opções</p>}
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer text-xs">
              <Checkbox checked={values.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function VistosServicesSoldReport() {
  const { activeCompany } = useCompany();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState<DateFilterPeriod>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [costCenterFilter, setCostCenterFilter] = useState<string[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState('all'); // all | service | supplier_fee
  const [sellerFilter, setSellerFilter] = useState<string[]>([]);
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');

  useEffect(() => { if (activeCompany?.id) load(); }, [activeCompany?.id]);

  const load = async () => {
    if (!activeCompany?.id) return;
    setTableLoading(true);
    try {
      const { data: sales } = await supabase
        .from('visa_sales')
        .select('id, client_name, sale_date, payment_method, status, created_by')
        .eq('empresa_id', activeCompany.id);
      const saleIds = (sales || []).map(s => s.id);
      if (saleIds.length === 0) { setRows([]); return; }

      const [{ data: items }, { data: suppliers }, { data: costCenters }] = await Promise.all([
        (supabase.from('visa_sale_items' as any) as any)
          .select('*')
          .in('visa_sale_id', saleIds),
        supabase.from('suppliers').select('id, name'),
        supabase.from('cost_centers').select('id, name').eq('empresa_id', activeCompany.id),
      ]);

      const salesMap = new Map((sales || []).map(s => [s.id, s]));
      const supMap = new Map((suppliers || []).map((s: any) => [s.id, s.name]));
      const ccMap = new Map((costCenters || []).map((c: any) => [c.id, c.name]));

      const result: Row[] = (items || []).map((it: any) => {
        const s: any = salesMap.get(it.visa_sale_id) || {};
        return {
          id: it.id,
          visa_sale_id: it.visa_sale_id,
          product_name: it.product_name || '',
          product_id: it.product_id,
          supplier_id: it.supplier_id,
          supplier_name: it.supplier_id ? (supMap.get(it.supplier_id) || '—') : '—',
          cost_center_id: it.cost_center_id,
          cost_center_name: it.cost_center_id ? (ccMap.get(it.cost_center_id) || '—') : '—',
          is_supplier_fee: !!it.is_supplier_fee,
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
          total_value: Number(it.total_value || 0),
          client_name: s.client_name || '',
          sale_date: s.sale_date || '',
          payment_method: s.payment_method || '',
          status: s.status || '',
          created_by: s.created_by || '',
        };
      });
      setRows(result);
    } finally {
      setTableLoading(false);
    }
  };

  const dateRange = useMemo(() => getDateRange(period, customStart, customEnd), [period, customStart, customEnd]);

  const productOptions = useMemo(() => Array.from(new Set(rows.map(r => r.product_name).filter(Boolean))).sort(), [rows]);
  const supplierOptions = useMemo(() => Array.from(new Set(rows.map(r => r.supplier_name).filter(n => n && n !== '—'))).sort(), [rows]);
  const costCenterOptions = useMemo(() => Array.from(new Set(rows.map(r => r.cost_center_name).filter(n => n && n !== '—'))).sort(), [rows]);
  const paymentOptions = useMemo(() => Array.from(new Set(rows.map(r => r.payment_method).filter(Boolean))).sort(), [rows]);
  const statusOptions = useMemo(() => Array.from(new Set(rows.map(r => r.status).filter(Boolean))).sort(), [rows]);
  const sellerOptions = useMemo(() => Array.from(new Set(rows.map(r => r.created_by).filter(Boolean))).sort(), [rows]);

  const filtered = useMemo(() => {
    const min = parseFloat(minValue) || -Infinity;
    const max = parseFloat(maxValue) || Infinity;
    const term = search.trim().toLowerCase();
    return rows.filter(r => {
      if (dateRange && r.sale_date) {
        const d = new Date(r.sale_date + 'T12:00:00');
        if (d < dateRange.start || d > dateRange.end) return false;
      }
      if (term && !r.client_name.toLowerCase().includes(term) && !r.product_name.toLowerCase().includes(term)) return false;
      if (productFilter.length > 0 && !productFilter.includes(r.product_name)) return false;
      if (supplierFilter.length > 0 && !supplierFilter.includes(r.supplier_name)) return false;
      if (costCenterFilter.length > 0 && !costCenterFilter.includes(r.cost_center_name)) return false;
      if (paymentFilter.length > 0 && !paymentFilter.includes(r.payment_method)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(r.status)) return false;
      if (sellerFilter.length > 0 && !sellerFilter.includes(r.created_by)) return false;
      if (typeFilter === 'service' && r.is_supplier_fee) return false;
      if (typeFilter === 'supplier_fee' && !r.is_supplier_fee) return false;
      if (r.total_value < min || r.total_value > max) return false;
      return true;
    }).sort((a, b) => (b.sale_date || '').localeCompare(a.sale_date || ''));
  }, [rows, dateRange, search, productFilter, supplierFilter, costCenterFilter, paymentFilter, statusFilter, sellerFilter, typeFilter, minValue, maxValue]);

  const totals = useMemo(() => {
    const totalValue = filtered.reduce((sum, r) => sum + r.total_value, 0);
    const totalQty = filtered.reduce((sum, r) => sum + r.quantity, 0);
    return { totalValue, totalQty, totalRows: filtered.length };
  }, [filtered]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const clearFilters = () => {
    setPeriod('month'); setCustomStart(''); setCustomEnd(''); setSearch('');
    setProductFilter([]); setSupplierFilter([]); setCostCenterFilter([]);
    setPaymentFilter([]); setStatusFilter([]); setTypeFilter('all'); setSellerFilter([]);
    setMinValue(''); setMaxValue('');
  };

  const exportPdf = () => {
    generateReportPdf({
      title: 'Relatório de Serviços Vendidos — Vistos',
      period: dateRange ? `${format(dateRange.start, 'dd/MM/yyyy')} a ${format(dateRange.end, 'dd/MM/yyyy')}` : 'Todos',
      headers: ['Data', 'Cliente', 'Serviço', 'Tipo', 'Fornecedor', 'C. Custo', 'Pgto', 'Qtd', 'Total'],
      rows: filtered.map(r => [
        r.sale_date ? format(new Date(r.sale_date + 'T12:00:00'), 'dd/MM/yyyy') : '—',
        r.client_name,
        r.product_name,
        r.is_supplier_fee ? 'Taxa Fornecedor' : 'Serviço',
        r.supplier_name,
        r.cost_center_name,
        PAYMENT_LABELS[r.payment_method] || r.payment_method,
        String(r.quantity),
        fmt(r.total_value),
      ]),
      totals: [
        { label: 'Total de Serviços', value: String(totals.totalRows) },
        { label: 'Quantidade Total', value: String(totals.totalQty) },
        { label: 'Valor Total', value: fmt(totals.totalValue) },
      ],
    });
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Relatório de Serviços Vendidos — Vistos</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" /> Limpar Filtros
            </Button>
            <Button onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <SalesDateFilter period={period} onPeriodChange={setPeriod} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Buscar (cliente / serviço)</Label>
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Digite..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Serviço</Label>
                <MultiSelect
                  options={productOptions.map(p => ({ value: p, label: p }))}
                  values={productFilter}
                  onChange={setProductFilter}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fornecedor</Label>
                <MultiSelect
                  options={supplierOptions.map(p => ({ value: p, label: p }))}
                  values={supplierFilter}
                  onChange={setSupplierFilter}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
                <MultiSelect
                  options={costCenterOptions.map(p => ({ value: p, label: p }))}
                  values={costCenterFilter}
                  onChange={setCostCenterFilter}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                <MultiSelect
                  options={paymentOptions.map(p => ({ value: p, label: PAYMENT_LABELS[p] || p }))}
                  values={paymentFilter}
                  onChange={setPaymentFilter}
                  placeholder="Todas"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status da Venda</Label>
                <MultiSelect
                  options={statusOptions.map(p => ({ value: p, label: STATUS_LABELS[p] || p }))}
                  values={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo de Item</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="service">Serviços</SelectItem>
                    <SelectItem value="supplier_fee">Taxa de Fornecedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vendedor</Label>
                <MultiSelect
                  options={sellerOptions.map(p => ({ value: p, label: p }))}
                  values={sellerFilter}
                  onChange={setSellerFilter}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valor mínimo (R$)</Label>
                <Input type="number" value={minValue} onChange={e => setMinValue(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valor máximo (R$)</Label>
                <Input type="number" value={maxValue} onChange={e => setMaxValue(e.target.value)} placeholder="0,00" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Itens Listados</p>
            <p className="text-2xl font-bold text-foreground">{totals.totalRows}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Quantidade Total</p>
            <p className="text-2xl font-bold text-foreground">{totals.totalQty}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold text-primary">{fmt(totals.totalValue)}</p>
          </CardContent></Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>C. Custo</TableHead>
                  <TableHead>Pgto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum serviço encontrado</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{r.sale_date ? format(new Date(r.sale_date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell>{r.product_name}</TableCell>
                    <TableCell>
                      {r.is_supplier_fee
                        ? <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">Taxa Fornecedor</Badge>
                        : <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">Serviço</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.supplier_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.cost_center_name}</TableCell>
                    <TableCell>{PAYMENT_LABELS[r.payment_method] || r.payment_method || '—'}</TableCell>
                    <TableCell>{STATUS_LABELS[r.status] || r.status}</TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                    <TableCell className="text-right font-medium text-primary">{fmt(r.total_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
