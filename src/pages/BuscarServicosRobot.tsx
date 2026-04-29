import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2, Plane, Car, Shield, MapPin, Package,
  Search, Plus, ArrowLeft, Sparkles, Star,
  Wand2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { RobotServico } from '@/hooks/useRobotImport';

interface ServiceCatalogRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

interface SupplierRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
}

const TIPO_CATEGORIA: Record<string, string> = {
  hotel: 'Hospedagem',
  aereo: 'Aéreo',
  carro: 'Transporte',
  seguro: 'Seguros',
  experiencia: 'Experiências',
  outros: 'Outros',
};

const TIPO_ICON: Record<string, any> = {
  hotel: Building2,
  aereo: Plane,
  carro: Car,
  seguro: Shield,
  experiencia: MapPin,
  outros: Package,
};

const TIPO_LABEL: Record<string, string> = {
  hotel: 'Hotéis',
  aereo: 'Aéreos',
  carro: 'Carros',
  seguro: 'Seguros',
  experiencia: 'Experiências',
  outros: 'Outros',
};

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function BuscarServicosRobot() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeCompany } = useCompany();
  const empresaId = activeCompany?.id || '';

  const cotacaoDestino = searchParams.get('destino') || '';
  const cotacaoCheckIn = searchParams.get('checkin') || '';
  const cotacaoCheckOut = searchParams.get('checkout') || '';
  const cotacaoNoites = Number(searchParams.get('noites') || 0);
  const cotacaoPax = Number(searchParams.get('pax') || 1);

  const [tipo, setTipo] = useState<keyof typeof TIPO_LABEL>('hotel');
  const [search, setSearch] = useState('');
  const [services, setServices] = useState<ServiceCatalogRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);

  // selecionados: id => RobotServico ajustado
  const [selecionados, setSelecionados] = useState<Record<string, RobotServico>>({});

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    Promise.all([
      supabase.from('services_catalog')
        .select('id, name, description, category')
        .eq('empresa_id', empresaId)
        .eq('status', 'active'),
      supabase.from('suppliers')
        .select('id, name, city, state, country')
        .eq('empresa_id', empresaId)
        .order('name'),
    ]).then(([sc, sp]) => {
      setServices(sc.data || []);
      setSuppliers(sp.data || []);
    }).finally(() => setLoading(false));
  }, [empresaId]);

  const filtrados = useMemo(() => {
    const cat = TIPO_CATEGORIA[tipo];
    return services.filter(s => {
      // se categoria não bate, mas tipo é "outros", inclui
      if (tipo === 'outros') {
        if (s.category && s.category !== 'Outros') return false;
      } else if ((s.category || '').toLowerCase() !== cat.toLowerCase()) {
        return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
    });
  }, [services, tipo, search]);

  const supplierName = (id?: string) =>
    suppliers.find(s => s.id === id)?.name || '';

  const toggle = (id: string, base: Partial<RobotServico>) => {
    setSelecionados(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = buildBase(id, base);
      return next;
    });
  };

  const buildBase = (id: string, base: Partial<RobotServico>): RobotServico => {
    const tipoBase = tipo as RobotServico['tipo'];
    const sc = services.find(s => s.id === id);
    const nome = sc?.name || base.descricaoResumida || 'Serviço';

    if (tipoBase === 'hotel') {
      return {
        tipo: 'hotel',
        descricaoResumida: `${nome}${cotacaoNoites ? ` - ${cotacaoNoites} noites` : ''}`,
        nomeHotel: nome,
        checkIn: cotacaoCheckIn,
        checkOut: cotacaoCheckOut,
        numNoites: cotacaoNoites,
        horaCheckIn: '15:00',
        tipoQuarto: 'Standard',
        qtdQuartos: 1,
        qtdHospedes: cotacaoPax,
        valorNoite: 0,
        estrelas: 3,
        categoria: 'Hotel',
        cidade: cotacaoDestino,
        pais: '',
        endereco: '',
        comodidades: '',
        observacoes: sc?.description || '',
        custo: 0,
        custoTotal: 0,
        moeda: 'BRL',
      };
    }
    if (tipoBase === 'aereo') {
      return {
        tipo: 'aereo',
        descricaoResumida: nome,
        descricaoDetalhada: sc?.description || '',
        ciaPrincipal: '',
        trechos: [],
        bagagem: { itemPessoal: 1, mao: 1, despachada: 0 },
        custo: 0,
        moeda: 'BRL',
      };
    }
    if (tipoBase === 'carro') {
      return {
        tipo: 'carro',
        descricaoResumida: nome,
        locadora: '',
        categoria: 'Compacto',
        modelo: '',
        dataRetirada: cotacaoCheckIn,
        horaRetirada: '10:00',
        dataDevolucao: cotacaoCheckOut,
        horaDevolucao: '10:00',
        localRetirada: cotacaoDestino,
        localDevolucao: cotacaoDestino,
        qtdDiarias: cotacaoNoites,
        valorDiaria: 0,
        seguroIncluso: true,
        observacoes: sc?.description || '',
        custo: 0,
        moeda: 'BRL',
      };
    }
    if (tipoBase === 'seguro') {
      return {
        tipo: 'seguro',
        descricaoResumida: nome,
        seguradora: '',
        tipoPlano: 'Internacional',
        destinoCoberto: cotacaoDestino,
        dataInicio: cotacaoCheckIn,
        dataFim: cotacaoCheckOut,
        qtdBeneficiarios: cotacaoPax,
        coberturaMediaUSD: 30000,
        coberturaBagagem: true,
        assistencia24h: true,
        valorPorPessoa: 0,
        observacoes: sc?.description || '',
        custo: 0,
        moeda: 'BRL',
      };
    }
    if (tipoBase === 'experiencia') {
      return {
        tipo: 'experiencia',
        descricaoResumida: nome,
        descricaoDetalhada: sc?.description || '',
        tipoExperiencia: 'Passeio',
        data: cotacaoCheckIn,
        hora: '09:00',
        duracaoEstimada: '4 horas',
        localSaida: cotacaoDestino,
        pontoEncontro: '',
        inclui: '',
        qtdParticipantes: cotacaoPax,
        valorPorPessoa: 0,
        observacoes: '',
        custo: 0,
        moeda: 'BRL',
      };
    }
    return {
      tipo: 'outros',
      descricaoResumida: nome,
      descricaoDetalhada: sc?.description || '',
      custo: 0,
      moeda: 'BRL',
      observacoes: '',
    };
  };

  const updateField = (id: string, patch: Partial<RobotServico>) => {
    setSelecionados(prev => {
      const cur = prev[id];
      if (!cur) return prev;
      const merged = { ...cur, ...patch } as RobotServico;
      // Recalcular custo agregado conforme tipo
      if (merged.tipo === 'hotel') {
        const total = (Number(merged.valorNoite) || 0) * (Number(merged.numNoites) || 0);
        merged.custo = total;
        merged.custoTotal = total;
      } else if (merged.tipo === 'carro') {
        merged.custo = (Number(merged.valorDiaria) || 0) * (Number(merged.qtdDiarias) || 0);
      } else if (merged.tipo === 'seguro') {
        merged.custo = (Number(merged.valorPorPessoa) || 0) * (Number(merged.qtdBeneficiarios) || 0);
      } else if (merged.tipo === 'experiencia') {
        merged.custo = (Number(merged.valorPorPessoa) || 0) * (Number(merged.qtdParticipantes) || 0);
      }
      return { ...prev, [id]: merged };
    });
  };

  const inserirNaCotacao = () => {
    const lista = Object.values(selecionados);
    if (lista.length === 0) {
      toast.error('Selecione ao menos um serviço');
      return;
    }
    // Anexa nome do fornecedor a partir do id, quando houver
    const finalLista = lista.map(item => ({
      ...item,
      fornecedor: item.fornecedor || (item.fornecedorId ? supplierName(item.fornecedorId) : undefined),
    }));
    localStorage.setItem('robot_servicos_selecionados', JSON.stringify(finalLista));
    // Notifica abas/janelas
    window.dispatchEvent(new Event('robot-servicos-importar'));
    toast.success(`${finalLista.length} serviço(s) prontos`, {
      description: 'Voltando para a cotação...',
    });
    setTimeout(() => {
      // Tenta voltar à aba que abriu (se foi window.open)
      if (window.opener && !window.opener.closed) {
        window.opener.dispatchEvent(new Event('robot-servicos-importar'));
        window.close();
      } else {
        navigate(-1);
      }
    }, 600);
  };

  const totalSel = Object.values(selecionados).reduce((s, x) => s + (Number(x.custo) || 0), 0);

  // ─── Busca IA Fornecedores (search-suppliers + enrich-supplier-results) ──
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [aiSelected, setAiSelected] = useState<Record<string, boolean>>({});

  async function buscarComIA() {
    if (!empresaId) { toast.error('Empresa não identificada'); return; }
    if (!cotacaoDestino) { toast.error('Destino não informado na cotação'); return; }
    setAiLoading(true);
    setAiResults([]);
    try {
      const { data: sup, error: e1 } = await supabase.functions.invoke('search-suppliers', {
        body: {
          empresa_id: empresaId,
          destination: cotacaoDestino,
          checkIn: cotacaoCheckIn,
          checkOut: cotacaoCheckOut,
          passengers: cotacaoPax || 1,
          numNights: cotacaoNoites,
        },
      });
      if (e1) throw e1;
      const hoteis = (sup as any)?.hotels || [];
      const servicos = (sup as any)?.services || [];

      const { data: enr, error: e2 } = await supabase.functions.invoke('enrich-supplier-results', {
        body: {
          cotacao: {
            destino: cotacaoDestino,
            dataInicio: cotacaoCheckIn,
            dataFim: cotacaoCheckOut,
            numNoites: cotacaoNoites,
            numPassageiros: cotacaoPax,
          },
          hoteis, servicos,
        },
      });
      if (e2) throw e2;
      const lista = (enr as any)?.servicos || [];
      setAiResults(lista);
      if (lista.length === 0) toast.warning('Nenhum resultado retornado pela IA.');
      else toast.success(`${lista.length} sugestões geradas`);
      if ((sup as any)?.message) toast.info((sup as any).message);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro na busca IA', { description: e?.message });
    } finally {
      setAiLoading(false);
    }
  }

  function toggleAi(id: string) {
    setAiSelected(p => ({ ...p, [id]: !p[id] }));
  }

  function inserirIaNaCotacao() {
    const escolhidos = aiResults.filter(r => aiSelected[r.id]);
    if (escolhidos.length === 0) { toast.error('Selecione ao menos um item'); return; }
    const lista: RobotServico[] = escolhidos.map((r: any) => {
      if (r.tipo === 'hotel') {
        const noites = r.numNoites || cotacaoNoites || 1;
        const valorNoite = Number(r.custo) || 0;
        return {
          tipo: 'hotel',
          descricaoResumida: `${r.nome} - ${noites} noites`,
          nomeHotel: r.nome,
          checkIn: cotacaoCheckIn, checkOut: cotacaoCheckOut, numNoites: noites,
          horaCheckIn: '15:00', tipoQuarto: 'Standard', qtdQuartos: 1,
          qtdHospedes: cotacaoPax, valorNoite, estrelas: 3,
          categoria: r.categoria || 'Hotel', cidade: cotacaoDestino, pais: '',
          endereco: '', comodidades: '', observacoes: r.descricao || '',
          custo: valorNoite * noites, custoTotal: valorNoite * noites,
          moeda: r.moeda || 'BRL', fornecedor: r.fornecedor,
        } as RobotServico;
      }
      return {
        tipo: 'outros',
        descricaoResumida: r.nome,
        descricaoDetalhada: r.descricao || '',
        custo: Number(r.custo) || 0,
        moeda: r.moeda || 'BRL',
        observacoes: r.fornecedor ? `Fornecedor: ${r.fornecedor}` : '',
      } as RobotServico;
    });
    localStorage.setItem('robot_servicos_selecionados', JSON.stringify(lista));
    window.dispatchEvent(new Event('robot-servicos-importar'));
    toast.success(`${lista.length} serviço(s) prontos`, { description: 'Voltando para a cotação...' });
    setTimeout(() => {
      if (window.opener && !window.opener.closed) {
        window.opener.dispatchEvent(new Event('robot-servicos-importar'));
        window.close();
      } else navigate(-1);
    }, 600);
  }
  // ─── fim Busca IA ─────────────────────────────────────────────────────

  const handleVoltar = () => {
    // Se foi aberto em nova aba via window.open, fecha
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    // Se há histórico, volta; senão vai para nova venda
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/sales/new');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleVoltar} className="gap-1 h-8">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Robô de Cotação
              </h1>
              <p className="text-xs text-muted-foreground">
                Selecione serviços do seu catálogo de fornecedores
                {cotacaoDestino && <> — destino: <strong>{cotacaoDestino}</strong></>}
                {cotacaoNoites > 0 && <> • {cotacaoNoites} noites</>}
                {cotacaoPax > 0 && <> • {cotacaoPax} pax</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              {Object.keys(selecionados).length} selecionado(s)
            </Badge>
            <Badge variant="outline" className="gap-1">
              {fmtBRL(totalSel)}
            </Badge>
            <Button onClick={inserirNaCotacao} disabled={Object.keys(selecionados).length === 0} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Inserir na Cotação
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tipo} onValueChange={(v) => setTipo(v as any)}>
              <TabsList className="grid grid-cols-7 w-full">
                {Object.keys(TIPO_LABEL).map(k => {
                  const Icon = TIPO_ICON[k];
                  return (
                    <TabsTrigger key={k} value={k} className="text-xs gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {TIPO_LABEL[k]}
                    </TabsTrigger>
                  );
                })}
                <TabsTrigger value="ia" className="text-xs gap-1.5">
                  <Wand2 className="h-3.5 w-3.5" />
                  Busca IA
                </TabsTrigger>
              </TabsList>

              {Object.keys(TIPO_LABEL).map(k => (
                <TabsContent key={k} value={k} className="mt-4">
                  {loading ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>
                  ) : filtrados.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      Nenhum serviço cadastrado nesta categoria.
                      <p className="text-xs mt-1">
                        Cadastre serviços em <button className="underline" onClick={() => navigate('/services')}>Catálogo de Serviços</button>.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {filtrados.map(s => {
                        const isSel = !!selecionados[s.id];
                        const sel = selecionados[s.id];
                        const Icon = TIPO_ICON[tipo];
                        return (
                          <Card key={s.id} className={isSel ? 'border-primary shadow-md' : ''}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={isSel}
                                  onCheckedChange={() => toggle(s.id, {})}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Icon className="h-4 w-4 text-primary shrink-0" />
                                    <h3 className="font-semibold text-sm truncate">{s.name}</h3>
                                  </div>
                                  {s.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                      {s.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {isSel && sel && (
                                <div className="border-t pt-2 space-y-2">
                                  {/* Fornecedor */}
                                  <div>
                                    <Label className="text-[10px]">Fornecedor</Label>
                                    <select
                                      className="w-full h-7 text-xs border rounded px-1 bg-background"
                                      value={sel.fornecedorId || ''}
                                      onChange={e => updateField(s.id, { fornecedorId: e.target.value, fornecedor: supplierName(e.target.value) })}
                                    >
                                      <option value="">— selecione —</option>
                                      {suppliers.map(sp => (
                                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Campos por tipo */}
                                  {tipo === 'hotel' && (
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <Label className="text-[10px]">Noites</Label>
                                        <Input type="number" className="h-7 text-xs" value={sel.numNoites || 0}
                                          onChange={e => updateField(s.id, { numNoites: Number(e.target.value) })} />
                                      </div>
                                      <div>
                                        <Label className="text-[10px]">R$/noite</Label>
                                        <Input type="number" className="h-7 text-xs" value={sel.valorNoite || 0}
                                          onChange={e => updateField(s.id, { valorNoite: Number(e.target.value) })} />
                                      </div>
                                      <div>
                                        <Label className="text-[10px]">Estrelas</Label>
                                        <Input type="number" min={1} max={5} className="h-7 text-xs" value={sel.estrelas || 3}
                                          onChange={e => updateField(s.id, { estrelas: Number(e.target.value) })} />
                                      </div>
                                      <div className="col-span-2">
                                        <Label className="text-[10px]">Cidade</Label>
                                        <Input className="h-7 text-xs" value={sel.cidade || ''}
                                          onChange={e => updateField(s.id, { cidade: e.target.value })} />
                                      </div>
                                      <div>
                                        <Label className="text-[10px]">País</Label>
                                        <Input className="h-7 text-xs" value={sel.pais || ''}
                                          onChange={e => updateField(s.id, { pais: e.target.value })} />
                                      </div>
                                    </div>
                                  )}

                                  {tipo === 'carro' && (
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <Label className="text-[10px]">Diárias</Label>
                                        <Input type="number" className="h-7 text-xs" value={sel.qtdDiarias || 0}
                                          onChange={e => updateField(s.id, { qtdDiarias: Number(e.target.value) })} />
                                      </div>
                                      <div>
                                        <Label className="text-[10px]">R$/diária</Label>
                                        <Input type="number" className="h-7 text-xs" value={sel.valorDiaria || 0}
                                          onChange={e => updateField(s.id, { valorDiaria: Number(e.target.value) })} />
                                      </div>
                                      <div>
                                        <Label className="text-[10px]">Modelo</Label>
                                        <Input className="h-7 text-xs" value={sel.modelo || ''}
                                          onChange={e => updateField(s.id, { modelo: e.target.value })} />
                                      </div>
                                    </div>
                                  )}

                                  {tipo === 'seguro' && (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <Label className="text-[10px]">Beneficiários</Label>
                                        <Input type="number" className="h-7 text-xs" value={sel.qtdBeneficiarios || 0}
                                          onChange={e => updateField(s.id, { qtdBeneficiarios: Number(e.target.value) })} />
                                      </div>
                                      <div>
                                        <Label className="text-[10px]">R$/pessoa</Label>
                                        <Input type="number" className="h-7 text-xs" value={sel.valorPorPessoa || 0}
                                          onChange={e => updateField(s.id, { valorPorPessoa: Number(e.target.value) })} />
                                      </div>
                                    </div>
                                  )}

                                  {tipo === 'experiencia' && (
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <Label className="text-[10px]">Participantes</Label>
                                        <Input type="number" className="h-7 text-xs" value={sel.qtdParticipantes || 0}
                                          onChange={e => updateField(s.id, { qtdParticipantes: Number(e.target.value) })} />
                                      </div>
                                      <div>
                                        <Label className="text-[10px]">R$/pessoa</Label>
                                        <Input type="number" className="h-7 text-xs" value={sel.valorPorPessoa || 0}
                                          onChange={e => updateField(s.id, { valorPorPessoa: Number(e.target.value) })} />
                                      </div>
                                      <div>
                                        <Label className="text-[10px]">Duração</Label>
                                        <Input className="h-7 text-xs" value={sel.duracaoEstimada || ''}
                                          onChange={e => updateField(s.id, { duracaoEstimada: e.target.value })} />
                                      </div>
                                    </div>
                                  )}

                                  {(tipo === 'aereo' || tipo === 'outros') && (
                                    <div>
                                      <Label className="text-[10px]">Custo total (R$)</Label>
                                      <Input type="number" className="h-7 text-xs" value={sel.custo || 0}
                                        onChange={e => updateField(s.id, { custo: Number(e.target.value) })} />
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-xs pt-1 border-t">
                                    <span className="text-muted-foreground">Total:</span>
                                    <strong className="text-green-600">{fmtBRL(sel.custo || 0)}</strong>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              ))}

              {/* Aba: Busca IA Fornecedores */}
              <TabsContent value="ia" className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-md bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30">
                  <Wand2 className="h-4 w-4 text-purple-600" />
                  <span className="text-xs flex-1">
                    Consulta as APIs dos fornecedores cadastrados em <button className="underline" onClick={() => navigate('/settings/api-integrations')}>Integrações de API</button> e a IA organiza os melhores resultados.
                  </span>
                  <Button onClick={buscarComIA} disabled={aiLoading} size="sm" className="gap-1.5">
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {aiLoading ? 'Buscando...' : 'Buscar com IA'}
                  </Button>
                  {aiResults.length > 0 && (
                    <Button onClick={inserirIaNaCotacao} size="sm" variant="default" className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Inserir selecionados
                    </Button>
                  )}
                </div>

                {aiResults.length === 0 && !aiLoading && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <Wand2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    Clique em "Buscar com IA" para consultar seus fornecedores.
                  </div>
                )}

                {aiResults.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {aiResults.map((r: any) => {
                      const sel = !!aiSelected[r.id];
                      return (
                        <Card key={r.id} className={sel ? 'border-primary' : ''}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <Checkbox checked={sel} onCheckedChange={() => toggleAi(r.id)} className="mt-1" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-semibold text-sm truncate">{r.nome}</h4>
                                  <Badge variant="outline" className="text-[10px] capitalize">{r.tipo}</Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground">{r.fornecedor}</p>
                                <p className="text-xs mt-1 line-clamp-2">{r.descricao}</p>
                                <p className="text-xs mt-1 text-primary font-semibold">
                                  {fmtBRL(Number(r.custoTotal || r.custo) || 0)}
                                  {r.numNoites ? ` (${r.numNoites} noites)` : ''}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
