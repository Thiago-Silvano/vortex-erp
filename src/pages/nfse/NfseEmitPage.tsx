import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Send, Save, FileText, Loader2, CheckCircle2, AlertTriangle, User, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NfseEmitPage() {
  const { activeCompany } = useCompany();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const saleId = searchParams.get('sale_id') || (location.state as any)?.saleId || null;

  const [fiscalCompany, setFiscalCompany] = useState<any>(null);
  const [fiscalServices, setFiscalServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [step, setStep] = useState<'form' | 'preparing' | 'signing' | 'transmitting' | 'result'>('form');
  const [result, setResult] = useState<any>(null);
  const [isCommissionPayment, setIsCommissionPayment] = useState(false);

  const [form, setForm] = useState({
    tomador_cnpj_cpf: '', tomador_razao_social: '', tomador_email: '',
    tomador_telefone: '', tomador_logradouro: '', tomador_numero: '',
    tomador_complemento: '', tomador_bairro: '', tomador_municipio: '',
    tomador_uf: '', tomador_cep: '',
    codigo_servico: '', item_lista_servico: '', descricao_servico: '',
    valor_servicos: 0, valor_deducoes: 0, valor_descontos: 0,
    aliquota: 0, iss_retido: false, exigibilidade_iss: '1',
    municipio_incidencia: '', natureza_operacao: '1', observacoes: '',
    data_competencia: new Date().toISOString().split('T')[0],
    fiscal_service_id: '',
  });

  useEffect(() => {
    if (activeCompany) {
      loadFiscalData();
      loadClients();
    }
  }, [activeCompany]);

  useEffect(() => {
    if (saleId && activeCompany) loadSaleData();
  }, [saleId, activeCompany]);

  const loadClients = async () => {
    if (!activeCompany) return;
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, cpf, email, phone, address, address_number, complement, neighborhood, city, state, cep')
      .eq('empresa_id', activeCompany.id)
      .order('full_name');
    setClients(data || []);
  };

  const loadFiscalData = async () => {
    if (!activeCompany) return;
    const { data: fc } = await supabase
      .from('fiscal_companies')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .single();
    setFiscalCompany(fc);
    if (fc) {
      setForm(p => ({
        ...p,
        codigo_servico: (fc as any).codigo_servico || '',
        item_lista_servico: (fc as any).item_lista_servico || '',
        aliquota: (fc as any).aliquota_padrao || 0,
        exigibilidade_iss: (fc as any).exigibilidade_iss || '1',
        natureza_operacao: (fc as any).natureza_operacao || '1',
        municipio_incidencia: (fc as any).municipio || '',
        observacoes: (fc as any).observacoes_padrao || '',
      }));
    }

    const { data: fs } = await supabase
      .from('fiscal_service_mappings')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .eq('is_active', true)
      .order('nome_interno');
    setFiscalServices(fs || []);
  };

  const fillClientData = (client: any) => {
    setForm(p => ({
      ...p,
      tomador_cnpj_cpf: client.cpf || '',
      tomador_razao_social: client.full_name || '',
      tomador_email: client.email || '',
      tomador_telefone: client.phone || '',
      tomador_logradouro: client.address || '',
      tomador_numero: client.address_number || '',
      tomador_complemento: client.complement || '',
      tomador_bairro: client.neighborhood || '',
      tomador_municipio: client.city || '',
      tomador_uf: client.state || '',
      tomador_cep: client.cep || '',
    }));
  };

  const fillSupplierData = (supplier: any) => {
    setForm(p => ({
      ...p,
      tomador_cnpj_cpf: supplier.cnpj || '',
      tomador_razao_social: supplier.razao_social || supplier.name || '',
      tomador_email: supplier.email || '',
      tomador_telefone: supplier.phone || '',
      tomador_logradouro: supplier.address || '',
      tomador_numero: supplier.address_number || '',
      tomador_complemento: supplier.complement || '',
      tomador_bairro: supplier.neighborhood || '',
      tomador_municipio: supplier.city || '',
      tomador_uf: supplier.state || '',
      tomador_cep: supplier.cep || '',
    }));
  };

  const loadSaleData = async () => {
    if (!saleId) return;
    const { data: sale } = await supabase.from('sales').select('*').eq('id', saleId).single();
    if (!sale) return;

    const paymentMethod = (sale as any).payment_method || '';
    const isOperadora = paymentMethod === 'operadora';
    setIsCommissionPayment(isOperadora);

    if (isOperadora) {
      // Commission-only: fill with supplier data and use commission as value
      const { data: saleSuppliers } = await supabase
        .from('sale_suppliers')
        .select('supplier_id')
        .eq('sale_id', saleId);

      if (saleSuppliers && saleSuppliers.length > 0) {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', saleSuppliers[0].supplier_id)
          .single();
        if (supplier) {
          fillSupplierData(supplier);
        }
      }

      // Value = commission (gross profit)
      const commissionValue = (sale as any).commission_value || (sale as any).gross_profit || 0;
      setForm(p => ({ ...p, valor_servicos: commissionValue }));
    } else {
      // Normal: fill with client data
      const clientName = (sale as any).client_name || '';
      if (clientName) {
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('empresa_id', activeCompany!.id)
          .ilike('full_name', clientName)
          .single();
        if (client) {
          fillClientData(client);
        } else {
          setForm(p => ({ ...p, tomador_razao_social: clientName }));
        }
      }

      // Load items total
      const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', saleId);
      const total = (items || []).reduce((s: number, i: any) => s + (i.total_value || 0), 0);
      setForm(p => ({ ...p, valor_servicos: total }));
    }

    // Build description from sale items
    const { data: items } = await supabase.from('sale_items').select('description').eq('sale_id', saleId);
    if (items && items.length > 0) {
      const desc = items.map((i: any) => i.description).filter(Boolean).join('; ');
      setForm(p => ({ ...p, descricao_servico: p.descricao_servico || desc }));
    }
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      fillClientData(client);
    }
    setClientOpen(false);
  };

  const handleFiscalServiceChange = (id: string) => {
    const s = fiscalServices.find((fs: any) => fs.id === id);
    if (s) {
      setForm(p => ({
        ...p,
        fiscal_service_id: id,
        codigo_servico: s.codigo_servico || p.codigo_servico,
        item_lista_servico: s.item_lista_lc116 || p.item_lista_servico,
        descricao_servico: s.descricao_fiscal || p.descricao_servico,
        aliquota: s.aliquota || p.aliquota,
        iss_retido: s.retencao_iss ?? p.iss_retido,
        municipio_incidencia: s.municipio_incidencia || p.municipio_incidencia,
        observacoes: s.observacoes || p.observacoes,
      }));
    }
  };

  const baseCalculo = form.valor_servicos - form.valor_deducoes - form.valor_descontos;
  const valorIss = baseCalculo * (form.aliquota / 100);
  const valorLiquido = form.valor_servicos - form.valor_descontos - (form.iss_retido ? valorIss : 0);

  const updateField = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));

  const handleSaveDraft = async () => {
    if (!activeCompany) return;
    setSavingDraft(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('nfse_documents').insert({
        empresa_id: activeCompany.id,
        sale_id: saleId || null,
        status: 'rascunho',
        ambiente: fiscalCompany?.ambiente || 'homologacao',
        ...form,
        base_calculo: baseCalculo,
        valor_iss: valorIss,
        valor_liquido: valorLiquido,
        emitido_por: user.user?.email || '',
      });
      if (error) throw error;
      toast.success('Rascunho salvo!');
      navigate('/nfse/list');
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setSavingDraft(false);
  };

  const handleEmit = async () => {
    if (!activeCompany || !fiscalCompany) {
      toast.error('Configure os dados fiscais da empresa antes de emitir.');
      return;
    }
    if (!form.tomador_cnpj_cpf || !form.tomador_razao_social) {
      toast.error('Preencha os dados do tomador (CPF/CNPJ e Nome).');
      return;
    }
    if (form.valor_servicos <= 0) {
      toast.error('O valor dos serviços deve ser maior que zero.');
      return;
    }

    setEmitting(true);
    setStep('preparing');

    try {
      const { data: user } = await supabase.auth.getUser();

      const { data: doc, error: docErr } = await supabase.from('nfse_documents').insert({
        empresa_id: activeCompany.id,
        sale_id: saleId || null,
        status: 'processando',
        ambiente: fiscalCompany.ambiente || 'homologacao',
        ...form,
        fiscal_service_id: form.fiscal_service_id || null,
        base_calculo: baseCalculo,
        valor_iss: valorIss,
        valor_liquido: valorLiquido,
        emitido_por: user.user?.email || '',
      }).select().single();

      if (docErr) throw docErr;

      setStep('signing');
      await new Promise(r => setTimeout(r, 800));

      setStep('transmitting');

      const { data: emitResult, error: emitErr } = await supabase.functions.invoke('nfse-emit', {
        body: { nfse_id: (doc as any).id, empresa_id: activeCompany.id },
      });

      if (emitErr) throw emitErr;

      setStep('result');
      setResult(emitResult);

      if (emitResult?.success) {
        toast.success('NFS-e emitida com sucesso!');
        if (saleId) {
          await supabase.from('sales').update({
            fiscal_status: 'emitida',
            nfse_id: (doc as any).id,
            nfse_number: emitResult.numero_nfse || '',
          }).eq('id', saleId);
        }
      } else {
        toast.error(emitResult?.message || 'Erro na emissão da NFS-e.');
      }
    } catch (e: any) {
      setStep('result');
      setResult({ success: false, message: e.message });
      toast.error('Erro na emissão: ' + e.message);
    }
    setEmitting(false);
  };

  if (step !== 'form' && step !== 'result') {
    const steps = [
      { key: 'preparing', label: 'Preparando DPS...', icon: FileText },
      { key: 'signing', label: 'Assinando XML...', icon: FileText },
      { key: 'transmitting', label: 'Transmitindo para API Nacional...', icon: Send },
    ];
    return (
      <AppLayout>
        <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                {steps.map(s => (
                  <div key={s.key} className={`flex items-center gap-2 justify-center ${step === s.key ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {step === s.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span className="text-sm">{s.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (step === 'result') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center space-y-4">
              {result?.success ? (
                <>
                  <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
                  <h2 className="text-xl font-bold">NFS-e Emitida!</h2>
                  {result.numero_nfse && <p className="text-sm text-muted-foreground">Número: {result.numero_nfse}</p>}
                  {result.chave && <p className="text-xs text-muted-foreground break-all">Chave: {result.chave}</p>}
                </>
              ) : (
                <>
                  <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
                  <h2 className="text-xl font-bold">Erro na Emissão</h2>
                  <p className="text-sm text-muted-foreground">{result?.message || 'Erro desconhecido'}</p>
                </>
              )}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate('/nfse/list')}>Ver Listagem</Button>
                <Button onClick={() => { setStep('form'); setResult(null); }}>Nova Emissão</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Emissão de NFS-e</h1>
            <p className="text-sm text-muted-foreground">
              {fiscalCompany ? `${fiscalCompany.razao_social} • ${fiscalCompany.ambiente === 'producao' ? 'Produção' : 'Homologação'}` : 'Configure os dados fiscais'}
              {isCommissionPayment && ' • Pagamento Operadora (Comissão)'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft}>
              <Save className="h-4 w-4 mr-2" /> Salvar Rascunho
            </Button>
            <Button onClick={handleEmit} disabled={emitting}>
              <Send className="h-4 w-4 mr-2" /> Emitir NFS-e
            </Button>
          </div>
        </div>

        {!fiscalCompany && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Dados fiscais não configurados</p>
                <p className="text-xs text-muted-foreground">Configure os dados fiscais da empresa antes de emitir NFS-e.</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate('/nfse/settings')}>Configurar</Button>
            </CardContent>
          </Card>
        )}

        {/* Tomador */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Tomador do Serviço
              {isCommissionPayment && (
                <span className="text-xs font-normal text-muted-foreground ml-2">(Fornecedor — Pagamento Operadora)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Nome / Razão Social *</Label>
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientOpen}
                    className="w-full justify-between font-normal h-10"
                  >
                    {form.tomador_razao_social || 'Selecione um cliente...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clients.map(c => (
                          <CommandItem
                            key={c.id}
                            value={c.full_name}
                            onSelect={() => handleClientSelect(c.id)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.tomador_razao_social === c.full_name ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span>{c.full_name}</span>
                              {c.cpf && <span className="text-xs text-muted-foreground">{c.cpf}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>CPF/CNPJ *</Label>
              <Input value={form.tomador_cnpj_cpf} onChange={e => updateField('tomador_cnpj_cpf', e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={form.tomador_email} onChange={e => updateField('tomador_email', e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.tomador_telefone} onChange={e => updateField('tomador_telefone', e.target.value)} />
            </div>
            <div>
              <Label>CEP</Label>
              <Input value={form.tomador_cep} onChange={e => updateField('tomador_cep', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Logradouro</Label>
              <Input value={form.tomador_logradouro} onChange={e => updateField('tomador_logradouro', e.target.value)} />
            </div>
            <div>
              <Label>Número</Label>
              <Input value={form.tomador_numero} onChange={e => updateField('tomador_numero', e.target.value)} />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input value={form.tomador_complemento} onChange={e => updateField('tomador_complemento', e.target.value)} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.tomador_bairro} onChange={e => updateField('tomador_bairro', e.target.value)} />
            </div>
            <div>
              <Label>Município</Label>
              <Input value={form.tomador_municipio} onChange={e => updateField('tomador_municipio', e.target.value)} />
            </div>
            <div>
              <Label>UF</Label>
              <Input value={form.tomador_uf} onChange={e => updateField('tomador_uf', e.target.value)} maxLength={2} />
            </div>
          </CardContent>
        </Card>

        {/* Serviço */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Serviço</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fiscalServices.length > 0 && (
              <div className="md:col-span-3">
                <Label>Serviço Fiscal Pré-cadastrado</Label>
                <Select value={form.fiscal_service_id} onValueChange={handleFiscalServiceChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione um serviço..." /></SelectTrigger>
                  <SelectContent>
                    {fiscalServices.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome_interno} ({s.codigo_servico})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Código do Serviço</Label>
              <Input value={form.codigo_servico} onChange={e => updateField('codigo_servico', e.target.value)} />
            </div>
            <div>
              <Label>Item Lista de Serviço</Label>
              <Input value={form.item_lista_servico} onChange={e => updateField('item_lista_servico', e.target.value)} />
            </div>
            <div>
              <Label>Data Competência</Label>
              <Input type="date" value={form.data_competencia} onChange={e => updateField('data_competencia', e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Label>Descrição do Serviço</Label>
              <Textarea value={form.descricao_servico} onChange={e => updateField('descricao_servico', e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valores e Tributos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Valor dos Serviços (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_servicos} onChange={e => updateField('valor_servicos', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Deduções (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_deducoes} onChange={e => updateField('valor_deducoes', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Descontos (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_descontos} onChange={e => updateField('valor_descontos', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Base de Cálculo</Label>
              <Input value={`R$ ${baseCalculo.toFixed(2)}`} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Alíquota ISS (%)</Label>
              <Input type="number" step="0.01" value={form.aliquota} onChange={e => updateField('aliquota', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Valor ISS</Label>
              <Input value={`R$ ${valorIss.toFixed(2)}`} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Valor Líquido</Label>
              <Input value={`R$ ${valorLiquido.toFixed(2)}`} readOnly className="bg-muted font-bold" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={form.iss_retido} onCheckedChange={v => updateField('iss_retido', v)} />
              <Label>ISS Retido</Label>
            </div>
            <div>
              <Label>Exigibilidade ISS</Label>
              <Select value={form.exigibilidade_iss} onValueChange={v => updateField('exigibilidade_iss', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Exigível</SelectItem>
                  <SelectItem value="2">2 - Não incidência</SelectItem>
                  <SelectItem value="3">3 - Isenção</SelectItem>
                  <SelectItem value="4">4 - Exportação</SelectItem>
                  <SelectItem value="5">5 - Imunidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Município de Incidência</Label>
              <Input value={form.municipio_incidencia} onChange={e => updateField('municipio_incidencia', e.target.value)} />
            </div>
            <div>
              <Label>Natureza da Operação</Label>
              <Select value={form.natureza_operacao} onValueChange={v => updateField('natureza_operacao', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Tributação no município</SelectItem>
                  <SelectItem value="2">2 - Tributação fora do município</SelectItem>
                  <SelectItem value="3">3 - Isenção</SelectItem>
                  <SelectItem value="4">4 - Imune</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label>Observações Complementares</Label>
              <Textarea value={form.observacoes} onChange={e => updateField('observacoes', e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
