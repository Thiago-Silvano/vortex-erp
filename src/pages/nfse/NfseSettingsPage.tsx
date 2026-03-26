import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Building2 } from 'lucide-react';
import { maskCnpj, maskPhone } from '@/lib/masks';

function maskCnpj2(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4')
    .replace(/^(\d{2})(\d{3})(\d{3})/, '$1.$2.$3')
    .replace(/^(\d{2})(\d{3})/, '$1.$2');
}

export default function NfseSettingsPage() {
  const { activeCompany } = useCompany();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    razao_social: '', nome_fantasia: '', cnpj: '', inscricao_municipal: '',
    cnae: '', regime_tributario: 'simples_nacional', municipio: 'Criciúma',
    uf: 'SC', cep: '', logradouro: '', numero: '', complemento: '', bairro: '',
    telefone: '', email_fiscal: '', codigo_servico: '', item_lista_servico: '',
    aliquota_padrao: 0, natureza_operacao: '1', serie_nfse: '1',
    ambiente: 'homologacao', exigibilidade_iss: '1', optante_simples: true,
    retencao_iss_padrao: false, observacoes_padrao: '', codigo_tributacao: '',
    incidencia_tributaria: '',
  });
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCompany) return;
    loadSettings();
  }, [activeCompany]);

  const loadSettings = async () => {
    if (!activeCompany) return;
    const { data } = await supabase
      .from('fiscal_companies')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .single();
    if (data) {
      setExistingId(data.id);
      const { id, empresa_id, created_at, updated_at, ...rest } = data as any;
      setForm((prev: any) => ({ ...prev, ...rest }));
    }
  };

  const handleSave = async () => {
    if (!activeCompany) return;
    setSaving(true);
    try {
      if (existingId) {
        await supabase.from('fiscal_companies').update({ ...form, updated_at: new Date().toISOString() }).eq('id', existingId);
      } else {
        const { data } = await supabase.from('fiscal_companies').insert({ ...form, empresa_id: activeCompany.id }).select().single();
        if (data) setExistingId((data as any).id);
      }
      toast.success('Configurações fiscais salvas!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
    setSaving(false);
  };

  const updateField = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }));

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações Fiscais</h1>
            <p className="text-sm text-muted-foreground">Dados fiscais da empresa emissora</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        {/* Dados da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Razão Social</Label>
              <Input value={form.razao_social} onChange={e => updateField('razao_social', e.target.value)} />
            </div>
            <div>
              <Label>Nome Fantasia</Label>
              <Input value={form.nome_fantasia} onChange={e => updateField('nome_fantasia', e.target.value)} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => updateField('cnpj', maskCnpj2(e.target.value))} maxLength={18} />
            </div>
            <div>
              <Label>Inscrição Municipal</Label>
              <Input value={form.inscricao_municipal} onChange={e => updateField('inscricao_municipal', e.target.value)} />
            </div>
            <div>
              <Label>CNAE</Label>
              <Input value={form.cnae} onChange={e => updateField('cnae', e.target.value)} placeholder="Ex: 7911-2/00" />
            </div>
            <div>
              <Label>Regime Tributário</Label>
              <Select value={form.regime_tributario} onValueChange={v => updateField('regime_tributario', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                  <SelectItem value="mei">MEI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>CEP</Label>
              <Input value={form.cep} onChange={e => updateField('cep', e.target.value.replace(/\D/g,'').slice(0,8))} />
            </div>
            <div>
              <Label>Logradouro</Label>
              <Input value={form.logradouro} onChange={e => updateField('logradouro', e.target.value)} />
            </div>
            <div>
              <Label>Número</Label>
              <Input value={form.numero} onChange={e => updateField('numero', e.target.value)} />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input value={form.complemento} onChange={e => updateField('complemento', e.target.value)} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={e => updateField('bairro', e.target.value)} />
            </div>
            <div>
              <Label>Município</Label>
              <Input value={form.municipio} onChange={e => updateField('municipio', e.target.value)} />
            </div>
            <div>
              <Label>UF</Label>
              <Input value={form.uf} onChange={e => updateField('uf', e.target.value.toUpperCase().slice(0,2))} maxLength={2} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => updateField('telefone', e.target.value)} />
            </div>
            <div>
              <Label>E-mail Fiscal</Label>
              <Input value={form.email_fiscal} onChange={e => updateField('email_fiscal', e.target.value)} type="email" />
            </div>
          </CardContent>
        </Card>

        {/* Parâmetros Fiscais */}
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Fiscais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Código do Serviço</Label>
              <Input value={form.codigo_servico} onChange={e => updateField('codigo_servico', e.target.value)} placeholder="Ex: 09.01" />
            </div>
            <div>
              <Label>Item Lista de Serviço (LC 116)</Label>
              <Input value={form.item_lista_servico} onChange={e => updateField('item_lista_servico', e.target.value)} />
            </div>
            <div>
              <Label>Alíquota Padrão (%)</Label>
              <Input type="number" step="0.01" value={form.aliquota_padrao} onChange={e => updateField('aliquota_padrao', parseFloat(e.target.value) || 0)} />
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
                  <SelectItem value="5">5 - Exigibilidade suspensa por decisão judicial</SelectItem>
                  <SelectItem value="6">6 - Exigibilidade suspensa por processo administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Série NFS-e</Label>
              <Input value={form.serie_nfse} onChange={e => updateField('serie_nfse', e.target.value)} />
            </div>
            <div>
              <Label>Ambiente</Label>
              <Select value={form.ambiente} onValueChange={v => updateField('ambiente', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="homologacao">Homologação</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Exigibilidade do ISS</Label>
              <Select value={form.exigibilidade_iss} onValueChange={v => updateField('exigibilidade_iss', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Exigível</SelectItem>
                  <SelectItem value="2">2 - Não incidência</SelectItem>
                  <SelectItem value="3">3 - Isenção</SelectItem>
                  <SelectItem value="4">4 - Exportação</SelectItem>
                  <SelectItem value="5">5 - Imunidade</SelectItem>
                  <SelectItem value="6">6 - Suspensa por decisão judicial</SelectItem>
                  <SelectItem value="7">7 - Suspensa por processo administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código de Tributação</Label>
              <Input value={form.codigo_tributacao} onChange={e => updateField('codigo_tributacao', e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={form.optante_simples} onCheckedChange={v => updateField('optante_simples', v)} />
              <Label>Optante pelo Simples Nacional</Label>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={form.retencao_iss_padrao} onCheckedChange={v => updateField('retencao_iss_padrao', v)} />
              <Label>Retenção de ISS por padrão</Label>
            </div>
            <div className="col-span-full">
              <Label>Observações Padrão da Nota</Label>
              <Textarea value={form.observacoes_padrao} onChange={e => updateField('observacoes_padrao', e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
