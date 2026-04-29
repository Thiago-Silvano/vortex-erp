import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, KeyRound, Plug, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type ProviderType = 'infotravel' | 'amadeus' | 'hotelbeds' | 'sabre' | 'travelpayouts' | 'outro';

interface ApiIntegration {
  id: string;
  empresa_id: string;
  nome: string;
  provider_type: ProviderType;
  base_url: string | null;
  api_key: string | null;
  client_id: string | null;
  client_secret: string | null;
  username: string | null;
  password: string | null;
  agency_code: string | null;
  enabled_operators: string[] | null;
  supported_types: string[] | null;
  notes: string | null;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_result: any;
}

const PROVIDERS: { value: ProviderType; label: string; help: string }[] = [
  { value: 'infotravel', label: 'Infotravel / Infotera', help: 'Plataforma agregadora BR (Europlus, BWT, Trend, etc.)' },
  { value: 'amadeus', label: 'Amadeus Self-Service', help: 'Aéreos, hotéis e transfers globais' },
  { value: 'hotelbeds', label: 'HotelBeds APItude', help: '180k+ hotéis no mundo' },
  { value: 'sabre', label: 'Sabre Dev Studio', help: 'Aéreos, hotéis, carros' },
  { value: 'travelpayouts', label: 'Travelpayouts / Tequila', help: 'Aéreos com afiliação' },
  { value: 'outro', label: 'Outro', help: 'Outro fornecedor de API' },
];

const SERVICE_TYPES = ['Aéreo', 'Hospedagem', 'Carro', 'Seguro', 'Transfer', 'Passeio', 'Pacote', 'Cruzeiro', 'Ingresso'];

const emptyForm = (empresaId: string): Omit<ApiIntegration, 'id' | 'last_tested_at' | 'last_test_result'> => ({
  empresa_id: empresaId,
  nome: '',
  provider_type: 'infotravel',
  base_url: '',
  api_key: '',
  client_id: '',
  client_secret: '',
  username: '',
  password: '',
  agency_code: '',
  enabled_operators: [],
  supported_types: [],
  notes: '',
  is_active: true,
});

export default function ApiIntegrationsPage() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [items, setItems] = useState<ApiIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiIntegration | null>(null);
  const [form, setForm] = useState<any>(emptyForm(''));
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [operatorsText, setOperatorsText] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeCompany?.id) load();
  }, [activeCompany?.id]);

  const load = async () => {
    if (!activeCompany?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('api_integrations')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar integrações: ' + error.message);
    } else {
      setItems((data || []) as ApiIntegration[]);
    }
    setLoading(false);
  };

  const openNew = () => {
    if (!activeCompany?.id) return toast.error('Selecione uma empresa antes.');
    setEditing(null);
    setForm(emptyForm(activeCompany.id));
    setOperatorsText('');
    setOpen(true);
  };

  const openEdit = (it: ApiIntegration) => {
    setEditing(it);
    setForm({ ...it });
    setOperatorsText((it.enabled_operators || []).join(', '));
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome?.trim()) return toast.error('Informe o nome.');
    if (!activeCompany?.id) return toast.error('Empresa não selecionada.');

    const payload = {
      ...form,
      empresa_id: activeCompany.id,
      enabled_operators: operatorsText.split(',').map((s: string) => s.trim()).filter(Boolean),
    };
    delete (payload as any).last_tested_at;
    delete (payload as any).last_test_result;

    let error;
    if (editing) {
      ({ error } = await (supabase as any).from('api_integrations').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await (supabase as any).from('api_integrations').insert(payload));
    }
    if (error) return toast.error('Erro ao salvar: ' + error.message);
    toast.success(editing ? 'Integração atualizada.' : 'Integração criada.');
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir esta integração? Essa ação é definitiva.')) return;
    const { error } = await (supabase as any).from('api_integrations').delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir: ' + error.message);
    toast.success('Excluída.');
    load();
  };

  const testConnection = async (it: ApiIntegration) => {
    setTestingId(it.id);
    // Placeholder: integração real depende da documentação da API.
    // Por ora apenas valida que tem URL e alguma credencial e marca o teste.
    await new Promise((r) => setTimeout(r, 800));
    const ok = !!(it.base_url && (it.api_key || it.client_id || it.username));
    const result = {
      ok,
      checked_at: new Date().toISOString(),
      message: ok
        ? 'Credenciais preenchidas. (Conexão real será habilitada quando o conector da API for implementado.)'
        : 'Faltam dados: informe pelo menos URL base + uma credencial.',
    };
    await (supabase as any).from('api_integrations').update({
      last_tested_at: result.checked_at,
      last_test_result: result,
    }).eq('id', it.id);
    setTestingId(null);
    if (ok) toast.success(result.message);
    else toast.error(result.message);
    load();
  };

  const toggleSecret = (key: string) => setShowSecrets((s) => ({ ...s, [key]: !s[key] }));

  const toggleType = (type: string) => {
    const cur: string[] = form.supported_types || [];
    setForm({
      ...form,
      supported_types: cur.includes(type) ? cur.filter((t) => t !== type) : [...cur, type],
    });
  };

  const providerHelp = PROVIDERS.find((p) => p.value === form.provider_type)?.help;

  return (
    <AppLayout>
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Plug className="h-5 w-5" /> Integrações de API
              </h1>
              <p className="text-sm text-muted-foreground">
                Cadastre as credenciais das APIs dos seus fornecedores (Infotravel, Amadeus, etc.) para que o sistema busque cotações automaticamente.
              </p>
            </div>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nova Integração
          </Button>
        </div>

        <Card className="mb-4 border-amber-300 bg-amber-50/40">
          <CardContent className="pt-4 text-sm space-y-1">
            <p className="font-medium">⚠️ Como funciona</p>
            <p className="text-muted-foreground">
              Cada API de fornecedor precisa de um <b>contrato comercial</b> e fornece <b>credenciais técnicas</b> (chave, ID, segredo) — não usuário/senha de site.
              Solicite ao seu fornecedor a documentação da API e as credenciais de acesso, depois cadastre aqui. As credenciais ficam isoladas por empresa
              e só administradores conseguem ver/editar.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrações cadastradas</CardTitle>
            <CardDescription>{items.length} {items.length === 1 ? 'registro' : 'registros'}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Carregando…</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <KeyRound className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma integração cadastrada ainda.</p>
                <Button className="mt-3" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Cadastrar primeira</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => {
                  const provLabel = PROVIDERS.find((p) => p.value === it.provider_type)?.label || it.provider_type;
                  return (
                    <div key={it.id} className="border rounded-lg p-4 flex items-start justify-between gap-4 hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{it.nome}</h3>
                          <Badge variant="outline">{provLabel}</Badge>
                          {it.is_active ? (
                            <Badge className="bg-green-600">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                          {it.last_test_result?.ok && <Badge variant="outline" className="text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" /> Testado</Badge>}
                          {it.last_test_result && !it.last_test_result.ok && <Badge variant="outline" className="text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" /> Falhou</Badge>}
                        </div>
                        {it.base_url && <p className="text-xs text-muted-foreground mt-1 truncate">{it.base_url}</p>}
                        {(it.supported_types?.length || 0) > 0 && (
                          <div className="flex gap-1 flex-wrap mt-2">
                            {it.supported_types!.map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        )}
                        {(it.enabled_operators?.length || 0) > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <b>Operadoras:</b> {it.enabled_operators!.join(', ')}
                          </p>
                        )}
                        {it.last_tested_at && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Último teste: {new Date(it.last_tested_at).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => testConnection(it)} disabled={testingId === it.id}>
                          {testingId === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plug className="h-3 w-3" />}
                          <span className="ml-1">Testar</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(it)}><Pencil className="h-3 w-3 mr-1" /> Editar</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(it.id)}><Trash2 className="h-3 w-3 mr-1" /> Excluir</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Integração' : 'Nova Integração de API'}</DialogTitle>
              <DialogDescription>
                Preencha os dados que o seu fornecedor entregou. Campos podem variar conforme a API.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome / Apelido *</Label>
                  <Input value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Infotravel - Europlus" />
                </div>
                <div>
                  <Label>Tipo de Provedor *</Label>
                  <Select value={form.provider_type} onValueChange={(v) => setForm({ ...form, provider_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {providerHelp && <p className="text-[11px] text-muted-foreground mt-1">{providerHelp}</p>}
                </div>
              </div>

              <div>
                <Label>URL Base da API</Label>
                <Input value={form.base_url || ''} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.fornecedor.com/v1" />
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">🔐 Credenciais (todas opcionais — preencha as que sua API usar)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>API Key</Label>
                    <div className="relative">
                      <Input
                        type={showSecrets.api_key ? 'text' : 'password'}
                        value={form.api_key || ''}
                        onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                      />
                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => toggleSecret('api_key')}>
                        {showSecrets.api_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Código da Agência</Label>
                    <Input value={form.agency_code || ''} onChange={(e) => setForm({ ...form, agency_code: e.target.value })} placeholder="Ex: AG12345" />
                  </div>
                  <div>
                    <Label>Client ID</Label>
                    <Input value={form.client_id || ''} onChange={(e) => setForm({ ...form, client_id: e.target.value })} />
                  </div>
                  <div>
                    <Label>Client Secret</Label>
                    <div className="relative">
                      <Input
                        type={showSecrets.client_secret ? 'text' : 'password'}
                        value={form.client_secret || ''}
                        onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
                      />
                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => toggleSecret('client_secret')}>
                        {showSecrets.client_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Usuário</Label>
                    <Input value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                  </div>
                  <div>
                    <Label>Senha</Label>
                    <div className="relative">
                      <Input
                        type={showSecrets.password ? 'text' : 'password'}
                        value={form.password || ''}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => toggleSecret('password')}>
                        {showSecrets.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <Label>Operadoras habilitadas no contrato</Label>
                <Input
                  value={operatorsText}
                  onChange={(e) => setOperatorsText(e.target.value)}
                  placeholder="Ex: Europlus, BWT, RCA, Trend (separe por vírgula)"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Use vírgula para separar várias operadoras.</p>
              </div>

              <div>
                <Label>Tipos de serviço suportados</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SERVICE_TYPES.map((t) => {
                    const active = (form.supported_types || []).includes(t);
                    return (
                      <Badge
                        key={t}
                        variant={active ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleType(t)}
                      >
                        {t}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Anotações internas sobre essa integração" />
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <Label className="text-base">Integração ativa</Label>
                  <p className="text-xs text-muted-foreground">Quando inativa, não aparece no Robô de busca.</p>
                </div>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}