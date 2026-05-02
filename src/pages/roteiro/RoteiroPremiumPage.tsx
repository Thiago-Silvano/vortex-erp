import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles,
  ArrowLeft,
  MapPin,
  Building2,
  Plane,
  UtensilsCrossed,
  Loader2,
  Send,
  FileDown,
  Globe,
  Star,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAgencyConfig } from "@/hooks/useAgencyConfig";
import type {
  FormularioRoteiro,
  RoteiroGerado,
  OpcaoHospedagem,
  OpcaoPasseio,
  OpcaoLogistica,
  DicaGastronomica,
  ServicoImportadoRoteiro,
  PayloadCotacaoRoteiro,
} from "@/types/roteiro";
import { generateItineraryPdf } from "@/lib/generateItineraryPdf";
import { AirportCombobox } from "@/components/AirportCombobox";
import { findAirport } from "@/data/airports";
import { CityCombobox } from "@/components/CityCombobox";
import QuickClientModal from "@/components/QuickClientModal";
import { UserPlus, Search, X } from "lucide-react";

const INTERESSES_LIST = [
  "Praia",
  "Cultura",
  "Gastronomia",
  "Aventura",
  "Natureza",
  "Compras",
  "Vida noturna",
  "Família",
  "Romance",
  "Bem-estar",
];

function diasEntre(a: string, b: string) {
  if (!a || !b) return 0;
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

function parsePreco(s?: string): number {
  if (!s) return 0;
  const m = s.replace(/\./g, "").match(/(\d+(?:,\d+)?)/);
  if (!m) return 0;
  return Number(m[1].replace(",", ".")) || 0;
}

export default function RoteiroPremiumPage() {
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId?: string }>();
  const { activeCompany } = useCompany();
  const { config } = useAgencyConfig();

  const [form, setForm] = useState<FormularioRoteiro>({
    destinoPrincipal: "",
    paradasSecundarias: "",
    dataInicio: "",
    dataFim: "",
    numDias: 0,
    numPassageiros: 2,
    perfilViajante: "casal",
    categoriaHotel: "4 estrelas",
    precoHotelMin: undefined,
    precoHotelMax: undefined,
    interesses: [],
    ritmoViagem: "moderado",
    observacoes: "",
    nomeCliente: "",
    nomeAgencia: "",
  });

  const [loading, setLoading] = useState(false);
  const [roteiro, setRoteiro] = useState<RoteiroGerado | null>(null);
  const [savingRoteiro, setSavingRoteiro] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(false);
  const dataFimInputRef = useRef<HTMLInputElement | null>(null);

  // Busca de clientes
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<
    Array<{ id: string; full_name: string; phone?: string; email?: string }>
  >([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientSearching, setClientSearching] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const clientSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeCompany?.id) return;
    if (clientSearchTimerRef.current) clearTimeout(clientSearchTimerRef.current);
    const term = clientSearch.trim();
    if (term.length < 2) {
      setClientResults([]);
      return;
    }
    clientSearchTimerRef.current = setTimeout(async () => {
      setClientSearching(true);
      const { data } = await supabase
        .from("clients")
        .select("id, full_name, phone, email")
        .eq("empresa_id", activeCompany.id)
        .ilike("full_name", `%${term}%`)
        .order("full_name")
        .limit(10);
      setClientResults((data as any) || []);
      setClientSearching(false);
    }, 300);
    return () => {
      if (clientSearchTimerRef.current) clearTimeout(clientSearchTimerRef.current);
    };
  }, [clientSearch, activeCompany?.id]);

  function selectClient(c: { id: string; full_name: string }) {
    setF("nomeCliente", c.full_name);
    setClientSearch("");
    setClientResults([]);
    setClientDropdownOpen(false);
  }

  // Carrega draft existente
  useEffect(() => {
    if (!draftId || initialLoadRef.current) return;
    initialLoadRef.current = true;
    (async () => {
      const { data, error } = await supabase
        .from("roteiro_premium_drafts" as any)
        .select("*")
        .eq("id", draftId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Rascunho não encontrado");
        return;
      }
      const d = data as any;
      if (d.form_data) setForm((p) => ({ ...p, ...d.form_data }));
      if (d.roteiro_data) setRoteiro(d.roteiro_data as RoteiroGerado);
      setCurrentDraftId(d.id);
    })();
  }, [draftId]);

  // Autosave (debounce 1.2s) sempre que form ou roteiro mudam
  useEffect(() => {
    if (!activeCompany?.id) return;
    if (!form.destinoPrincipal && !roteiro) return; // nada relevante ainda
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus("saving");
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setAutoSaveStatus("idle");
          return;
        }
        const payload: any = {
          empresa_id: activeCompany.id,
          user_id: user.id,
          title: roteiro?.titulo || form.destinoPrincipal || "Roteiro sem título",
          form_data: form,
          roteiro_data: roteiro,
        };
        if (currentDraftId) {
          await supabase
            .from("roteiro_premium_drafts" as any)
            .update(payload)
            .eq("id", currentDraftId);
        } else {
          const { data, error } = await supabase
            .from("roteiro_premium_drafts" as any)
            .insert(payload)
            .select()
            .single();
          if (!error && data) setCurrentDraftId((data as any).id);
        }
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 1500);
      } catch (e) {
        console.error("autosave error", e);
        setAutoSaveStatus("idle");
      }
    }, 1200);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, roteiro, activeCompany?.id]);

  function googleMapsLink(h: OpcaoHospedagem): string {
    const q = [h.nomeOficial || h.nome, h.enderecoCompleto || h.localizacao, form.destinoPrincipal]
      .filter(Boolean)
      .join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  function tripadvisorLink(h: OpcaoHospedagem): string {
    const q = `${h.nomeOficial || h.nome} ${form.destinoPrincipal}`;
    return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(q)}`;
  }

  const numNoites = useMemo(() => diasEntre(form.dataInicio, form.dataFim), [form.dataInicio, form.dataFim]);
  const totalDiasViagem = useMemo(() => (numNoites > 0 ? numNoites + 1 : 0), [numNoites]);

  // Cidades com dias (a primeira é sempre o destino principal)
  const cidadesDias =
    form.cidadesDias && form.cidadesDias.length > 0
      ? form.cidadesDias
      : [{ cidade: form.destinoPrincipal || "", dias: totalDiasViagem || 0 }];

  const totalDiasDistribuidos = useMemo(
    () => cidadesDias.reduce((s, c) => s + (Number(c.dias) || 0), 0),
    [cidadesDias],
  );
  const diferencaDias = totalDiasViagem - totalDiasDistribuidos;

  function updateCidades(next: { cidade: string; dias: number }[]) {
    // sincroniza destino principal com a primeira cidade e paradasSecundarias com as demais
    const principal = next[0]?.cidade || "";
    const paradas = next
      .slice(1)
      .map((c) => c.cidade)
      .filter(Boolean)
      .join(", ");
    setForm((p) => ({
      ...p,
      cidadesDias: next,
      destinoPrincipal: principal,
      paradasSecundarias: paradas,
    }));
  }
  function setCidadeNome(idx: number, nome: string) {
    const next = [...cidadesDias];
    next[idx] = { ...next[idx], cidade: nome };
    updateCidades(next);
  }
  function setCidadeDias(idx: number, dias: number) {
    const next = [...cidadesDias];
    next[idx] = { ...next[idx], dias: Math.max(0, dias || 0) };
    updateCidades(next);
  }
  function setCidadeStopLogistico(idx: number, checked: boolean) {
    const next = [...cidadesDias];
    next[idx] = { ...next[idx], stopLogistico: checked, dias: next[idx].dias || 1 };
    updateCidades(next);
  }
  function addCidade() {
    updateCidades([...cidadesDias, { cidade: "", dias: 1, stopLogistico: false }]);
  }
  function removeCidade(idx: number) {
    if (idx === 0) return; // não remove o destino principal
    const next = cidadesDias.filter((_, i) => i !== idx);
    updateCidades(next);
  }

  function setF<K extends keyof FormularioRoteiro>(k: K, v: FormularioRoteiro[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function toggleInteresse(i: string) {
    setForm((p) => ({
      ...p,
      interesses: p.interesses.includes(i) ? p.interesses.filter((x) => x !== i) : [...p.interesses, i],
    }));
  }

  async function gerarRoteiro() {
    if (!form.destinoPrincipal) {
      toast.error("Informe pelo menos uma cidade no roteiro");
      return;
    }
    if (!form.dataInicio || !form.dataFim) {
      toast.error("Informe as datas");
      return;
    }
    // Validação de dias por cidade vs período total
    if (totalDiasViagem > 0) {
      if (diferencaDias > 0) {
        toast.error(`Faltam ${diferencaDias} dia(s) para distribuir entre as cidades.`, {
          description: `A viagem tem ${totalDiasViagem} dias, mas as cidades somam apenas ${totalDiasDistribuidos}.`,
        });
        return;
      }
      if (diferencaDias < 0) {
        toast.error(`Há ${Math.abs(diferencaDias)} dia(s) a mais distribuído(s) entre as cidades.`, {
          description: `A viagem tem ${totalDiasViagem} dias, mas as cidades somam ${totalDiasDistribuidos}.`,
        });
        return;
      }
      const semDias = cidadesDias.find((c) => c.cidade && (!c.dias || c.dias <= 0));
      if (semDias) {
        toast.error(`Informe quantos dias em "${semDias.cidade}".`);
        return;
      }
    }
    setLoading(true);
    try {
      const aChegada = findAirport(form.aeroportoChegadaIata);
      const aSaida = findAirport(form.aeroportoSaidaIata);
      const aOrigem = findAirport(form.aeroportoOrigemIata);
      const payload = {
        ...form,
        numDias: numNoites + 1,
        cidadesDias,
        nomeAgencia: config?.nomeAgencia || activeCompany?.name || "",
        logoUrl: config?.logoUrl,
        aeroportoChegada: aChegada
          ? `${aChegada.iata} - ${aChegada.name}, ${aChegada.city}/${aChegada.country}`
          : undefined,
        aeroportoSaida: aSaida ? `${aSaida.iata} - ${aSaida.name}, ${aSaida.city}/${aSaida.country}` : undefined,
        aeroportoOrigem: aOrigem ? `${aOrigem.iata} - ${aOrigem.name}, ${aOrigem.city}/${aOrigem.country}` : undefined,
      };
      const { data, error } = await supabase.functions.invoke("gerar-roteiro", { body: payload });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setRoteiro((data as any).roteiro as RoteiroGerado);
      toast.success("Roteiro gerado com sucesso");
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao gerar roteiro", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  function toggleSelecao(secao: "hospedagens" | "passeios" | "logistica" | "gastronomia", id: string) {
    setRoteiro((p) => {
      if (!p) return p;
      const arr = (p as any)[secao].map((x: any) => (x.id === id ? { ...x, selecionado: !x.selecionado } : x));
      return { ...p, [secao]: arr } as RoteiroGerado;
    });
  }

  const totalSelecionados = useMemo(() => {
    if (!roteiro) return 0;
    return [...roteiro.hospedagens, ...roteiro.passeios, ...roteiro.logistica, ...roteiro.gastronomia].filter(
      (x) => x.selecionado,
    ).length;
  }, [roteiro]);

  function enviarParaCotacao() {
    if (!roteiro) return;
    const servicos: ServicoImportadoRoteiro[] = [];

    roteiro.hospedagens
      .filter((h) => h.selecionado)
      .forEach((h) => {
        const valorNoite = parsePreco(h.precoEstimado);
        const total = valorNoite * Math.max(numNoites, 1);
        servicos.push({
          tipoServico: "hotel",
          descricaoResumida: h.nome,
          descricaoDetalhada: `${h.descricao}\n\nDiferenciais: ${h.diferenciais.join(", ")}`,
          custo: total,
          rav: 0,
          acrescimo: 0,
          total,
          origem: "roteiro",
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
        descricaoDetalhada: (item as any).descricao || "",
        custo: valor,
        rav: 0,
        acrescimo: 0,
        total: valor,
        origem: "roteiro",
        detalhes: item,
        precisaBuscarFornecedor: true,
        termoBusca: `${(item as any).nome || ""} ${form.destinoPrincipal}`.trim(),
      });
    };

    roteiro.passeios.filter((x) => x.selecionado).forEach((x) => addItem(x, "experiencia"));
    roteiro.logistica.filter((x) => x.selecionado).forEach((x) => addItem(x, "transfer"));
    roteiro.gastronomia.filter((x) => x.selecionado).forEach((x) => addItem(x, "gastronomia"));

    if (servicos.length === 0) {
      toast.error("Selecione pelo menos um item antes de enviar");
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

    localStorage.setItem("roteiro_para_cotacao", JSON.stringify(payload));
    toast.success(`${servicos.length} item(ns) enviados para nova cotação`);
    navigate("/sales/new?origem=roteiro");
  }

  /**
   * Constrói payload completo (itinerary + destinations + days + attractions) para o módulo Roteiros.
   * Usa todas as opções selecionadas + o roteiro diário gerado pela IA.
   */
  function buildItineraryStructure() {
    if (!roteiro) return null;
    const hospedagensSel = roteiro.hospedagens.filter((h) => h.selecionado);
    const passeiosSel = roteiro.passeios.filter((p) => p.selecionado);
    const logisticaSel = roteiro.logistica.filter((l) => l.selecionado);
    const gastronomiaSel = roteiro.gastronomia.filter((g) => g.selecionado);

    const cidades = [
      form.destinoPrincipal,
      ...form.paradasSecundarias
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ];
    const destinations = cidades.map((name) => ({ name }));

    // Distribui passeios pelos dias do roteiro diário (fallback: round-robin)
    const diasIa = roteiro.roteiroDiario || [];
    const totalDias = Math.max(diasIa.length, numNoites + 1, 1);
    const days: Array<{
      day_number: number;
      title: string;
      subtitle: string;
      description: string;
      attractions: Array<{
        name: string;
        description: string;
        time?: string;
        duration?: string;
        category: string;
        city?: string;
        sort_order: number;
      }>;
    }> = [];

    for (let i = 0; i < totalDias; i++) {
      const ia = diasIa[i];
      days.push({
        day_number: i + 1,
        title: ia?.titulo || `Dia ${i + 1}`,
        subtitle: "",
        description: ia?.descricao || "",
        attractions: [],
      });
    }

    // Distribui passeios pelo dia recomendado (se houver) senão round-robin
    let rrIdx = 0;
    passeiosSel.forEach((p) => {
      const idx =
        p.diaRecomendado && p.diaRecomendado >= 1 && p.diaRecomendado <= totalDias
          ? p.diaRecomendado - 1
          : rrIdx++ % totalDias;
      days[idx].attractions.push({
        name: p.nome,
        description: p.descricao,
        time: p.periodo === "manha" ? "09:00" : p.periodo === "tarde" ? "14:00" : p.periodo === "noite" ? "19:00" : "",
        duration: p.duracao,
        category:
          p.tipo === "gastronomia"
            ? "gastronomy"
            : p.tipo === "cultura"
              ? "landmark"
              : p.tipo === "aventura"
                ? "experience"
                : "attraction",
        city: form.destinoPrincipal,
        sort_order: days[idx].attractions.length,
      });
    });

    // Gastronomia → spread em todos os dias começando no dia 1
    gastronomiaSel.forEach((g, i) => {
      const idx = i % totalDias;
      days[idx].attractions.push({
        name: g.nome,
        description: `${g.descricao}\nEspecialidade: ${g.especialidade}`,
        category: "gastronomy",
        city: form.destinoPrincipal,
        sort_order: days[idx].attractions.length,
      });
    });

    // Hospedagens → adiciona como recomendação no dia 1
    if (hospedagensSel.length > 0 && days[0]) {
      hospedagensSel.forEach((h) => {
        days[0].attractions.unshift({
          name: `Hospedagem: ${h.nome}`,
          description: `${h.descricao}\nLocalização: ${h.localizacao}\nPreço: ${h.precoEstimado}`,
          category: "recommendation",
          city: h.localizacao,
          sort_order: 0,
        });
      });
    }

    // Logística → recomendação no dia 1 (chegada) e último dia (partida)
    logisticaSel.forEach((l, i) => {
      const idx = i === 0 ? 0 : totalDias - 1;
      days[idx].attractions.push({
        name: `${l.tipo.toUpperCase()}: ${l.origem} → ${l.destino}`,
        description: l.descricao,
        category: "recommendation",
        sort_order: days[idx].attractions.length,
      });
    });

    return {
      itinerary: {
        title: roteiro.titulo,
        subtitle: roteiro.subtitulo,
        client_name: form.nomeCliente,
        travel_date: form.dataInicio && form.dataFim ? `${form.dataInicio} a ${form.dataFim}` : "",
      },
      destinations,
      days,
    };
  }

  async function persistirRoteiroNoBanco() {
    if (!activeCompany?.id) {
      toast.error("Empresa ativa não identificada");
      return null;
    }
    const struct = buildItineraryStructure();
    if (!struct) return null;

    const { data: itin, error: errIt } = await supabase
      .from("itineraries")
      .insert({ ...struct.itinerary, empresa_id: activeCompany.id, status: "draft" } as any)
      .select()
      .single();
    if (errIt || !itin) {
      toast.error("Erro ao criar roteiro", { description: errIt?.message });
      return null;
    }

    // Destinos
    const destInserts = struct.destinations.map((d, i) => ({
      itinerary_id: (itin as any).id,
      name: d.name,
      sort_order: i,
    }));
    let destRows: any[] = [];
    if (destInserts.length > 0) {
      const { data: dRows } = await supabase
        .from("itinerary_destinations")
        .insert(destInserts as any)
        .select();
      destRows = dRows || [];
    }
    const firstDestId = destRows[0]?.id;

    // Dias
    const dayInserts = struct.days.map((d, i) => ({
      itinerary_id: (itin as any).id,
      destination_id: firstDestId,
      day_number: d.day_number,
      title: d.title,
      subtitle: d.subtitle,
      description: d.description,
      sort_order: i,
    }));
    const { data: dayRows } = await supabase
      .from("itinerary_days")
      .insert(dayInserts as any)
      .select();

    // Atrações
    if (dayRows) {
      const attrInserts: any[] = [];
      struct.days.forEach((d, i) => {
        const dayId = (dayRows as any[])[i]?.id;
        if (!dayId) return;
        d.attractions.forEach((a) => attrInserts.push({ ...a, day_id: dayId }));
      });
      if (attrInserts.length > 0) {
        await supabase.from("itinerary_attractions").insert(attrInserts as any);
      }
    }

    return (itin as any).id as string;
  }

  async function criarRoteiroInterativo() {
    if (totalSelecionados === 0) {
      toast.error("Selecione pelo menos um item");
      return;
    }
    setSavingRoteiro(true);
    try {
      const id = await persistirRoteiroNoBanco();
      if (!id) return;
      toast.success("Roteiro interativo criado!");
      navigate(`/itineraries/${id}`);
    } finally {
      setSavingRoteiro(false);
    }
  }

  async function gerarPdfDireto() {
    if (totalSelecionados === 0) {
      toast.error("Selecione pelo menos um item");
      return;
    }
    setGeneratingPdf(true);
    toast.info("Gerando PDF...");
    try {
      const struct = buildItineraryStructure();
      if (!struct) return;

      // Monta objetos compatíveis com generateItineraryPdf sem persistir
      const itineraryObj: any = {
        title: struct.itinerary.title,
        subtitle: struct.itinerary.subtitle,
        client_name: struct.itinerary.client_name,
        travel_date: struct.itinerary.travel_date,
        cover_image_url: "",
        thank_you_text: "Obrigado por escolher viajar conosco!",
        thank_you_image_url: "",
      };
      const destinations = struct.destinations.map((d, i) => ({ id: `d${i}`, name: d.name, image_url: "" }));
      const days = struct.days.map((d, i) => ({
        id: `day${i}`,
        day_number: d.day_number,
        title: d.title,
        subtitle: d.subtitle,
        description: d.description,
        attractions: d.attractions.map((a, j) => ({
          id: `a${i}-${j}`,
          name: a.name,
          location: "",
          city: a.city || "",
          description: a.description,
          image_url: "",
          time: a.time || "",
          duration: a.duration || "",
          category: a.category,
          sort_order: a.sort_order,
        })),
      }));

      const pdf = await generateItineraryPdf(itineraryObj, destinations, days as any, []);
      pdf.save(`${itineraryObj.title || "roteiro-premium"}.pdf`);
      toast.success("PDF gerado!");
    } catch (e: any) {
      console.error("PDF error:", e);
      toast.error("Erro ao gerar PDF", { description: e?.message });
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
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
          <div className="flex items-center gap-2">
            {autoSaveStatus === "saving" && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
              </Badge>
            )}
            {autoSaveStatus === "saved" && (
              <Badge variant="outline" className="gap-1 text-[10px] text-emerald-600 border-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Salvo
              </Badge>
            )}
            {roteiro && (
              <>
                <Badge variant="secondary">{totalSelecionados} selecionado(s)</Badge>
                <Button onClick={enviarParaCotacao} className="gap-1.5" size="sm">
                  <Send className="h-4 w-4" /> Enviar para Cotação
                </Button>
                <Button
                  onClick={criarRoteiroInterativo}
                  disabled={savingRoteiro}
                  variant="secondary"
                  className="gap-1.5"
                  size="sm"
                >
                  {savingRoteiro ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  Roteiro Interativo
                </Button>
                <Button
                  onClick={gerarPdfDireto}
                  disabled={generatingPdf}
                  variant="outline"
                  className="gap-1.5"
                  size="sm"
                >
                  {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Gerar PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {/* FORMULÁRIO */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">1. Brief da Viagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cliente</Label>
                <div className="relative flex gap-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      className="h-8 text-xs pl-9 pr-7"
                      value={clientDropdownOpen ? clientSearch : form.nomeCliente}
                      onFocus={() => {
                        setClientDropdownOpen(true);
                        setClientSearch(form.nomeCliente || "");
                      }}
                      onChange={(e) => {
                        setClientDropdownOpen(true);
                        setClientSearch(e.target.value);
                        setF("nomeCliente", e.target.value);
                      }}
                      onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
                      placeholder="Buscar cliente cadastrado…"
                    />
                    {form.nomeCliente && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setF("nomeCliente", "");
                          setClientSearch("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {clientDropdownOpen && (clientSearch.trim().length >= 2 || clientResults.length > 0) && (
                      <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover shadow-lg">
                        {clientSearching ? (
                          <div className="p-2 text-xs text-muted-foreground flex items-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" /> Buscando…
                          </div>
                        ) : clientResults.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground">Nenhum cliente encontrado</div>
                        ) : (
                          clientResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectClient(c);
                              }}
                              className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent border-b last:border-b-0"
                            >
                              <div className="font-medium">{c.full_name}</div>
                              {(c.phone || c.email) && (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {[c.phone, c.email].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-[11px] gap-1 shrink-0"
                    onClick={() => setQuickClientOpen(true)}
                    title="Cadastrar novo cliente"
                  >
                    <UserPlus className="h-3 w-3" /> Novo
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Passageiros</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-8 text-xs"
                  value={form.numPassageiros}
                  onChange={(e) => setF("numPassageiros", Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início *</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={form.dataInicio}
                  onFocus={(e) => {
                    try { (e.currentTarget as any).showPicker?.(); } catch {}
                  }}
                  onMouseDown={(e) => {
                    try { (e.currentTarget as any).showPicker?.(); } catch {}
                  }}
                  onChange={(e) => {
                    const v = e.target.value;
                    setF("dataInicio", v);
                    if (v) {
                      // abre o picker de Fim automaticamente para escolha rápida
                      setTimeout(() => {
                        const el = dataFimInputRef.current;
                        if (!el) return;
                        try {
                          el.min = v;
                          el.focus();
                          (el as any).showPicker?.();
                        } catch {}
                      }, 50);
                    }
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Fim *</Label>
                <Input
                  ref={dataFimInputRef}
                  type="date"
                  className="h-8 text-xs"
                  min={form.dataInicio || undefined}
                  value={form.dataFim}
                  onFocus={(e) => {
                    try { (e.currentTarget as any).showPicker?.(); } catch {}
                  }}
                  onMouseDown={(e) => {
                    try { (e.currentTarget as any).showPicker?.(); } catch {}
                  }}
                  onChange={(e) => setF("dataFim", e.target.value)}
                />
              </div>
            </div>

            {/* Cidades / paradas com dias */}
            <div className="border rounded-md p-2.5 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Cidades e dias em cada uma
                </Label>
                <div className="flex items-center gap-2 text-[11px]">
                  {totalDiasViagem > 0 && (
                    <Badge variant={diferencaDias === 0 ? "default" : "destructive"} className="h-5 text-[10px]">
                      {totalDiasDistribuidos} / {totalDiasViagem} dias
                      {diferencaDias > 0 && ` (faltam ${diferencaDias})`}
                      {diferencaDias < 0 && ` (sobra ${Math.abs(diferencaDias)})`}
                    </Badge>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={addCidade}
                  >
                    <Plus className="h-3 w-3" /> Cidade
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                {cidadesDias.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <CityCombobox
                        value={c.cidade}
                        onChange={(label) => setCidadeNome(idx, label)}
                        placeholder={idx === 0 ? "Destino principal (ex: Paris)" : "Parada (ex: Lyon)"}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min={0}
                        className="h-7 text-xs"
                        value={c.dias || ""}
                        onChange={(e) => setCidadeDias(idx, Number(e.target.value))}
                        placeholder="Dias"
                      />
                    </div>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <Checkbox
                        id={`stop-${idx}`}
                        checked={!!c.stopLogistico}
                        onCheckedChange={(v) => setCidadeStopLogistico(idx, !!v)}
                      />
                      <Label htmlFor={`stop-${idx}`} className="text-[10px] cursor-pointer leading-tight">
                        Stop logístico?
                      </Label>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {idx > 0 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => removeCidade(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {totalDiasViagem > 0 && diferencaDias !== 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {diferencaDias > 0
                    ? `Faltam ${diferencaDias} dia(s) — distribua entre as cidades antes de gerar.`
                    : `Há ${Math.abs(diferencaDias)} dia(s) a mais — ajuste a distribuição.`}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Perfil</Label>
                <Select value={form.perfilViajante} onValueChange={(v) => setF("perfilViajante", v as any)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
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
                <Select value={form.categoriaHotel} onValueChange={(v) => setF("categoriaHotel", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
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
                <Select value={form.ritmoViagem} onValueChange={(v) => setF("ritmoViagem", v as any)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tranquilo">Tranquilo</SelectItem>
                    <SelectItem value="moderado">Moderado</SelectItem>
                    <SelectItem value="intenso">Intenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Preço hotel mín. (R$/noite)</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-8 text-xs"
                  value={form.precoHotelMin ?? ""}
                  onChange={(e) => setF("precoHotelMin", e.target.value === "" ? undefined : Number(e.target.value))}
                  placeholder="Ex: 400"
                />
              </div>
              <div>
                <Label className="text-xs">Preço hotel máx. (R$/noite)</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-8 text-xs"
                  value={form.precoHotelMax ?? ""}
                  onChange={(e) => setF("precoHotelMax", e.target.value === "" ? undefined : Number(e.target.value))}
                  placeholder="Ex: 1200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Aeroporto de origem (embarque)</Label>
                <AirportCombobox
                  value={form.aeroportoOrigemIata}
                  onChange={(iata, a) => {
                    setForm((p) => ({
                      ...p,
                      aeroportoOrigemIata: iata,
                      aeroportoOrigemLabel: a ? `${a.iata} · ${a.city} (${a.country})` : undefined,
                    }));
                  }}
                  placeholder="Ex: GRU, São Paulo…"
                />
              </div>
              <div>
                <Label className="text-xs">Aeroporto de chegada</Label>
                <AirportCombobox
                  value={form.aeroportoChegadaIata}
                  onChange={(iata, a) => {
                    setForm((p) => ({
                      ...p,
                      aeroportoChegadaIata: iata,
                      aeroportoChegadaLabel: a ? `${a.iata} · ${a.city} (${a.country})` : undefined,
                    }));
                  }}
                  placeholder="Ex: CDG, Paris…"
                />
              </div>
              <div>
                <Label className="text-xs">Aeroporto de saída</Label>
                <AirportCombobox
                  value={form.aeroportoSaidaIata}
                  onChange={(iata, a) => {
                    setForm((p) => ({
                      ...p,
                      aeroportoSaidaIata: iata,
                      aeroportoSaidaLabel: a ? `${a.iata} · ${a.city} (${a.country})` : undefined,
                    }));
                  }}
                  placeholder="Ex: NCE, Nice…"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Horário de chegada no destino final</Label>
                <Input
                  type="time"
                  className="h-8 text-xs"
                  value={form.horarioChegadaDestino || ""}
                  onChange={(e) => setF("horarioChegadaDestino", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Horário de saída (retorno)</Label>
                <Input
                  type="time"
                  className="h-8 text-xs"
                  value={form.horarioSaidaRetorno || ""}
                  onChange={(e) => setF("horarioSaidaRetorno", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Interesses</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {INTERESSES_LIST.map((i) => {
                  const active = form.interesses.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleInteresse(i)}
                      className={`cursor-pointer rounded-full px-3 py-1 text-[11px] transition-colors border ${
                        active
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/70"
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea
                className="text-xs min-h-[60px]"
                value={form.observacoes}
                onChange={(e) => setF("observacoes", e.target.value)}
                placeholder="Restrições, preferências, eventos..."
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {numNoites > 0 && (
                  <>
                    Duração:{" "}
                    <strong>
                      {numNoites + 1} dias / {numNoites} noites
                    </strong>
                  </>
                )}
              </span>
              <Button onClick={gerarRoteiro} disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Gerando com IA..." : "Gerar Roteiro"}
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
                  <TabsTrigger value="hospedagens" className="text-xs gap-1">
                    <Building2 className="h-3 w-3" />
                    Hotéis ({roteiro.hospedagens.length})
                  </TabsTrigger>
                  <TabsTrigger value="passeios" className="text-xs gap-1">
                    <MapPin className="h-3 w-3" />
                    Passeios ({roteiro.passeios.length})
                  </TabsTrigger>
                  <TabsTrigger value="logistica" className="text-xs gap-1">
                    <Plane className="h-3 w-3" />
                    Logística ({roteiro.logistica.length})
                  </TabsTrigger>
                  <TabsTrigger value="gastronomia" className="text-xs gap-1">
                    <UtensilsCrossed className="h-3 w-3" />
                    Gastronomia ({roteiro.gastronomia.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="hospedagens" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roteiro.hospedagens.map((h) => (
                    <Card key={h.id} className={h.selecionado ? "border-primary" : ""}>
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={h.selecionado}
                            onCheckedChange={() => toggleSelecao("hospedagens", h.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">
                              {h.nome}
                              {h.cidade ? (
                                <span className="text-muted-foreground font-normal"> ({h.cidade})</span>
                              ) : null}
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                              {h.categoria} • {h.localizacao}
                            </p>
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
                  {roteiro.passeios.map((p) => (
                    <Card key={p.id} className={p.selecionado ? "border-primary" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={p.selecionado}
                            onCheckedChange={() => toggleSelecao("passeios", p.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">
                              {p.nome}
                              {p.cidade ? (
                                <span className="text-muted-foreground font-normal"> ({p.cidade})</span>
                              ) : null}
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                              {p.tipo} • {p.duracao}
                              {p.diaRecomendado ? ` • Dia ${p.diaRecomendado}` : ""}
                            </p>
                            <p className="text-xs mt-1">{p.descricao}</p>
                            <p className="text-[10px] text-primary mt-1">{p.precoEstimado}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="logistica" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roteiro.logistica.map((l) => (
                    <Card key={l.id} className={l.selecionado ? "border-primary" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={l.selecionado}
                            onCheckedChange={() => toggleSelecao("logistica", l.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm capitalize">{l.tipo}</h4>
                            <p className="text-[10px] text-muted-foreground">
                              {l.origem} → {l.destino}
                            </p>
                            <p className="text-xs mt-1">{l.descricao}</p>
                            <p className="text-[10px] text-primary mt-1">{l.precoEstimado}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="gastronomia" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roteiro.gastronomia.map((g) => (
                    <Card key={g.id} className={g.selecionado ? "border-primary" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={g.selecionado}
                            onCheckedChange={() => toggleSelecao("gastronomia", g.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">
                              {g.nome}
                              {g.cidade ? (
                                <span className="text-muted-foreground font-normal"> ({g.cidade})</span>
                              ) : null}
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                              {g.tipo} • {g.especialidade}
                            </p>
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
                    {roteiro.roteiroDiario.map((d) => (
                      <div key={d.dia} className="border rounded p-2 text-xs">
                        <div className="font-semibold">
                          Dia {d.dia} — {d.titulo}
                        </div>
                        <p className="text-muted-foreground mt-0.5">{d.descricao}</p>
                        {d.sugestoes?.length > 0 && (
                          <ul className="list-disc list-inside mt-1 text-[11px]">
                            {d.sugestoes.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
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
                  <div>
                    <strong>Clima:</strong> {roteiro.infoPratica.clima}
                  </div>
                  <div>
                    <strong>Melhor época:</strong> {roteiro.infoPratica.melhorEpoca}
                  </div>
                  <div>
                    <strong>Moeda:</strong> {roteiro.infoPratica.moeda}
                  </div>
                  <div>
                    <strong>Idioma:</strong> {roteiro.infoPratica.idioma}
                  </div>
                  <div>
                    <strong>Documentos:</strong> {roteiro.infoPratica.documentos}
                  </div>
                  <div>
                    <strong>Fuso:</strong> {roteiro.infoPratica.fusoHorario}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <QuickClientModal
        open={quickClientOpen}
        onClose={() => setQuickClientOpen(false)}
        initialName={form.nomeCliente}
        onClientCreated={(c) => {
          setF("nomeCliente", c.full_name);
          setClientSearch("");
          setQuickClientOpen(false);
          toast.success(`Cliente "${c.full_name}" vinculado ao roteiro`);
        }}
      />
    </AppLayout>
  );
}
