import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, ArrowLeft, MapPin, Building2, Plane, UtensilsCrossed, Loader2, Send, FileDown, Globe, Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAgencyConfig } from '@/hooks/useAgencyConfig';
import type {
  FormularioRoteiro, RoteiroGerado, OpcaoHospedagem, OpcaoPasseio,
  OpcaoLogistica, DicaGastronomica, ServicoImportadoRoteiro, PayloadCotacaoRoteiro,
} from '@/types/roteiro';
import { generateItineraryPdf } from '@/lib/generateItineraryPdf';
import { getStaticMapUrl } from '@/components/itinerary/ItineraryMapSection';

const INTERESSES_LIST = [
  'Praia', 'Cultura', 'Gastronomia', 'Aventura', 'Natureza',
  'Compras', 'Vida noturna', 'Família', 'Romance', 'Bem-estar',
];

function diasEntre(a: string, b: string) {
  if (!a || !b) return 0;
  const d1 = new Date(a); const d2 = new Date(b);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

function parsePreco(s?: string): number {
  if (!s) return 0;
  const m = s.replace(/\./g, '').match(/(\d+(?:,\d+)?)/);
  if (!m) return 0;
  return Number(m[1].replace(',', '.')) || 0;
}

export default function RoteiroPremiumPage() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { config } = useAgencyConfig();

  const [form, setForm] = useState<FormularioRoteiro>({
    destinoPrincipal: '',
    paradasSecundarias: '',
    dataInicio: '',
    dataFim: '',
    numDias: 0,
    numPassageiros: 2,
    perfilViajante: 'casal',
    categoriaHotel: '4 estrelas',
    interesses: [],
    ritmoViagem: 'moderado',
    observacoes: '',
    nomeCliente: '',
    nomeAgencia: '',
  });

  const [loading, setLoading] = useState(false);
  const [roteiro, setRoteiro] = useState<RoteiroGerado | null>(null);
  const [savingRoteiro, setSavingRoteiro] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  function googleMapsLink(h: OpcaoHospedagem): string {
    const q = [h.nomeOficial || h.nome, h.enderecoCompleto || h.localizacao, form.destinoPrincipal]
      .filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  function tripadvisorLink(h: OpcaoHospedagem): string {
    const q = `${h.nomeOficial || h.nome} ${form.destinoPrincipal}`;
    return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(q)}`;
  }

  const numNoites = useMemo(() => diasEntre(form.dataInicio, form.dataFim), [form.dataInicio, form.dataFim]);

  function setF<K extends keyof FormularioRoteiro>(k: K, v: FormularioRoteiro[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  function toggleInteresse(i: string) {
    setForm(p => ({
      ...p,
      interesses: p.interesses.includes(i)
        ? p.interesses.filter(x => x !== i)
        : [...p.interesses, i],
    }));
  }

  async function gerarRoteiro() {
    if (!form.destinoPrincipal) { toast.error('Informe o destino principal'); return; }
    if (!form.dataInicio || !form.dataFim) { toast.error('Informe as datas'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        numDias: numNoites + 1,
        nomeAgencia: config?.nomeAgencia || activeCompany?.name || '',
        logoUrl: config?.logoUrl,
      };
      const { data, error } = await supabase.functions.invoke('gerar-roteiro', { body: payload });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setRoteiro((data as any).roteiro as RoteiroGerado);
      toast.success('Roteiro gerado com sucesso');
    } catch (e: any) {
      console.error(e);
      toast.error('Falha ao gerar roteiro', { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  function toggleSelecao(secao: 'hospedagens' | 'passeios' | 'logistica' | 'gastronomia', id: string) {
    setRoteiro(p => {
      if (!p) return p;
      const arr = (p as any)[secao].map((x: any) =>
        x.id === id ? { ...x, selecionado: !x.selecionado } : x
      );
      return { ...p, [secao]: arr } as RoteiroGerado;
    });
  }

  const totalSelecionados = useMemo(() => {
    if (!roteiro) return 0;
    return [
      ...roteiro.hospedagens, ...roteiro.passeios,
      ...roteiro.logistica, ...roteiro.gastronomia,
    ].filter(x => x.selecionado).length;
  }, [roteiro]);

  function enviarParaCotacao() {
    if (!roteiro) return;
    const servicos: ServicoImportadoRoteiro[] = [];

    roteiro.hospedagens.filter(h => h.selecionado).forEach(h => {
      const valorNoite = parsePreco(h.precoEstimado);
      const total = valorNoite * Math.max(numNoites, 1);
      servicos.push({
        tipoServico: 'hotel',
        descricaoResumida: h.nome,
        descricaoDetalhada: `${h.descricao}\n\nDiferenciais: ${h.diferenciais.join(', ')}`,
        custo: total, rav: 0, acrescimo: 0, total,
        origem: 'roteiro',
        detalhes: { ...h, numNoites, valorNoite },
        precisaBuscarFornecedor: true,
        termoBusca: `${h.nome} ${h.localizacao} ${form.destinoPrincipal}`,
      });
    });

    const addItem = (item: OpcaoPasseio | OpcaoLogistica | DicaGastronomica, tipo: string) => {
      const valor = parsePreco((item as any).precoEstimado || (item as any).faixaPreco);
      servicos.push({
        tipoServico: tipo,
        descricaoResumida: (item as any).nome || (item as any).descricao,
        descricaoDetalhada: (item as any).descricao || '',
        custo: valor, rav: 0, acrescimo: 0, total: valor,
        origem: 'roteiro',
        detalhes: item,
        precisaBuscarFornecedor: true,
        termoBusca: `${(item as any).nome || ''} ${form.destinoPrincipal}`.trim(),
      });
    };

    roteiro.passeios.filter(x => x.selecionado).forEach(x => addItem(x, 'experiencia'));
    roteiro.logistica.filter(x => x.selecionado).forEach(x => addItem(x, 'transfer'));
    roteiro.gastronomia.filter(x => x.selecionado).forEach(x => addItem(x, 'gastronomia'));

    if (servicos.length === 0) {
      toast.error('Selecione pelo menos um item antes de enviar');
      return;
    }

    const payload: PayloadCotacaoRoteiro = {
      dadosCotacao: {
        nomeDestino: form.destinoPrincipal,
        inicioViagem: form.dataInicio,
        finalViagem: form.dataFim,
        numNoites,
        numPassageiros: form.numPassageiros,
        tituloCotacao: roteiro.titulo || `Roteiro ${form.destinoPrincipal}`,
        clienteNomeSugerido: form.nomeCliente,
      },
      servicos,
      origemRoteiro: true,
      tituloRoteiro: roteiro.titulo,
      totalItens: servicos.length,
    };

    localStorage.setItem('roteiro_para_cotacao', JSON.stringify(payload));
    toast.success(`${servicos.length} item(ns) enviados para nova cotação`);
    navigate('/sales/new?origem=roteiro');
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 h-8">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Roteiro Premium
              </h1>
              <p className="text-xs text-muted-foreground">
                Gere um roteiro completo com IA e envie os itens selecionados para uma nova cotação.
              </p>
            </div>
          </div>
          {roteiro && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{totalSelecionados} selecionado(s)</Badge>
              <Button onClick={enviarParaCotacao} className="gap-1.5">
                <Send className="h-4 w-4" /> Enviar para Cotação
              </Button>
            </div>
          )}
        </div>

        {/* FORMULÁRIO */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">1. Brief da Viagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Destino principal *</Label>
                <Input className="h-8 text-xs" value={form.destinoPrincipal}
                  onChange={e => setF('destinoPrincipal', e.target.value)} placeholder="Ex: Paris, França" />
              </div>
              <div>
                <Label className="text-xs">Paradas/cidades</Label>
                <Input className="h-8 text-xs" value={form.paradasSecundarias}
                  onChange={e => setF('paradasSecundarias', e.target.value)} placeholder="Ex: Lyon, Nice" />
              </div>
              <div>
                <Label className="text-xs">Cliente</Label>
                <Input className="h-8 text-xs" value={form.nomeCliente}
                  onChange={e => setF('nomeCliente', e.target.value)} placeholder="Nome do cliente" />
              </div>
              <div>
                <Label className="text-xs">Início *</Label>
                <Input type="date" className="h-8 text-xs" value={form.dataInicio}
                  onChange={e => setF('dataInicio', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Fim *</Label>
                <Input type="date" className="h-8 text-xs" value={form.dataFim}
                  onChange={e => setF('dataFim', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Passageiros</Label>
                <Input type="number" min={1} className="h-8 text-xs" value={form.numPassageiros}
                  onChange={e => setF('numPassageiros', Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Perfil</Label>
                <Select value={form.perfilViajante} onValueChange={v => setF('perfilViajante', v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casal">Casal</SelectItem>
                    <SelectItem value="familia">Família</SelectItem>
                    <SelectItem value="grupo">Grupo</SelectItem>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="lua-de-mel">Lua de Mel</SelectItem>
                    <SelectItem value="corporativo">Corporativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria do hotel</Label>
                <Select value={form.categoriaHotel} onValueChange={v => setF('categoriaHotel', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3 estrelas">3 estrelas</SelectItem>
                    <SelectItem value="4 estrelas">4 estrelas</SelectItem>
                    <SelectItem value="5 estrelas">5 estrelas</SelectItem>
                    <SelectItem value="boutique">Boutique</SelectItem>
                    <SelectItem value="resort">Resort</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ritmo</Label>
                <Select value={form.ritmoViagem} onValueChange={v => setF('ritmoViagem', v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tranquilo">Tranquilo</SelectItem>
                    <SelectItem value="moderado">Moderado</SelectItem>
                    <SelectItem value="intenso">Intenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Interesses</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {INTERESSES_LIST.map(i => (
                  <Badge key={i}
                    variant={form.interesses.includes(i) ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px]"
                    onClick={() => toggleInteresse(i)}>
                    {i}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea className="text-xs min-h-[60px]" value={form.observacoes}
                onChange={e => setF('observacoes', e.target.value)}
                placeholder="Restrições, preferências, eventos..." />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {numNoites > 0 && <>Duração: <strong>{numNoites + 1} dias / {numNoites} noites</strong></>}
              </span>
              <Button onClick={gerarRoteiro} disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Gerando com IA...' : 'Gerar Roteiro'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RESULTADO */}
        {roteiro && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">2. {roteiro.titulo}</CardTitle>
              <p className="text-xs text-muted-foreground">{roteiro.subtitulo}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs mb-3 italic">{roteiro.introducao}</p>
              <Tabs defaultValue="hospedagens">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="hospedagens" className="text-xs gap-1"><Building2 className="h-3 w-3" />Hotéis ({roteiro.hospedagens.length})</TabsTrigger>
                  <TabsTrigger value="passeios" className="text-xs gap-1"><MapPin className="h-3 w-3" />Passeios ({roteiro.passeios.length})</TabsTrigger>
                  <TabsTrigger value="logistica" className="text-xs gap-1"><Plane className="h-3 w-3" />Logística ({roteiro.logistica.length})</TabsTrigger>
                  <TabsTrigger value="gastronomia" className="text-xs gap-1"><UtensilsCrossed className="h-3 w-3" />Gastronomia ({roteiro.gastronomia.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="hospedagens" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roteiro.hospedagens.map(h => (
                    <Card key={h.id} className={h.selecionado ? 'border-primary' : ''}>
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-start gap-2">
                          <Checkbox checked={h.selecionado} onCheckedChange={() => toggleSelecao('hospedagens', h.id)} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">{h.nome}</h4>
                            <p className="text-[10px] text-muted-foreground">{h.categoria} • {h.localizacao}</p>
                            <p className="text-xs mt-1">{h.descricao}</p>
                            <p className="text-[10px] text-primary mt-1">{h.precoEstimado}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <a
                                href={googleMapsLink(h)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-medium transition"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Globe className="h-3 w-3" /> Google Maps
                              </a>
                              <a
                                href={tripadvisorLink(h)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-medium transition"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Star className="h-3 w-3" /> TripAdvisor
                              </a>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="passeios" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roteiro.passeios.map(p => (
                    <Card key={p.id} className={p.selecionado ? 'border-primary' : ''}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Checkbox checked={p.selecionado} onCheckedChange={() => toggleSelecao('passeios', p.id)} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">{p.nome}</h4>
                            <p className="text-[10px] text-muted-foreground">{p.tipo} • {p.duracao}{p.diaRecomendado ? ` • Dia ${p.diaRecomendado}` : ''}</p>
                            <p className="text-xs mt-1">{p.descricao}</p>
                            <p className="text-[10px] text-primary mt-1">{p.precoEstimado}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="logistica" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roteiro.logistica.map(l => (
                    <Card key={l.id} className={l.selecionado ? 'border-primary' : ''}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Checkbox checked={l.selecionado} onCheckedChange={() => toggleSelecao('logistica', l.id)} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm capitalize">{l.tipo}</h4>
                            <p className="text-[10px] text-muted-foreground">{l.origem} → {l.destino}</p>
                            <p className="text-xs mt-1">{l.descricao}</p>
                            <p className="text-[10px] text-primary mt-1">{l.precoEstimado}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="gastronomia" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roteiro.gastronomia.map(g => (
                    <Card key={g.id} className={g.selecionado ? 'border-primary' : ''}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Checkbox checked={g.selecionado} onCheckedChange={() => toggleSelecao('gastronomia', g.id)} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">{g.nome}</h4>
                            <p className="text-[10px] text-muted-foreground">{g.tipo} • {g.especialidade}</p>
                            <p className="text-xs mt-1">{g.descricao}</p>
                            <p className="text-[10px] text-primary mt-1">{g.faixaPreco}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>

              {/* Roteiro diário */}
              {roteiro.roteiroDiario?.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <h3 className="text-sm font-semibold mb-2">Roteiro Dia a Dia</h3>
                  <div className="space-y-2">
                    {roteiro.roteiroDiario.map(d => (
                      <div key={d.dia} className="border rounded p-2 text-xs">
                        <div className="font-semibold">Dia {d.dia} — {d.titulo}</div>
                        <p className="text-muted-foreground mt-0.5">{d.descricao}</p>
                        {d.sugestoes?.length > 0 && (
                          <ul className="list-disc list-inside mt-1 text-[11px]">
                            {d.sugestoes.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info prática */}
              {roteiro.infoPratica && (
                <div className="mt-4 border-t pt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                  <div><strong>Clima:</strong> {roteiro.infoPratica.clima}</div>
                  <div><strong>Melhor época:</strong> {roteiro.infoPratica.melhorEpoca}</div>
                  <div><strong>Moeda:</strong> {roteiro.infoPratica.moeda}</div>
                  <div><strong>Idioma:</strong> {roteiro.infoPratica.idioma}</div>
                  <div><strong>Documentos:</strong> {roteiro.infoPratica.documentos}</div>
                  <div><strong>Fuso:</strong> {roteiro.infoPratica.fusoHorario}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}