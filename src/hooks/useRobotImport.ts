import { useEffect } from 'react';
import { toast } from 'sonner';

export interface RobotServico {
  tipo: 'hotel' | 'aereo' | 'carro' | 'seguro' | 'experiencia' | 'passeio' | 'transfer' | 'ingresso' | 'outros';
  descricaoResumida: string;
  descricaoDetalhada?: string;
  custo: number;
  fornecedor?: string;
  fornecedorId?: string;
  moeda?: string;
  observacoes?: string;
  // Hotel
  nomeHotel?: string;
  checkIn?: string;
  checkOut?: string;
  numNoites?: number;
  horaCheckIn?: string;
  tipoQuarto?: string;
  qtdQuartos?: number;
  qtdHospedes?: number;
  valorNoite?: number;
  estrelas?: number;
  categoria?: string;
  cidade?: string;
  pais?: string;
  endereco?: string;
  comodidades?: string;
  custoTotal?: number;
  // Aéreo
  ciaPrincipal?: string;
  trechos?: any[];
  bagagem?: { itemPessoal?: number; mao?: number; despachada?: number };
  // Carro
  locadora?: string;
  modelo?: string;
  dataRetirada?: string;
  horaRetirada?: string;
  dataDevolucao?: string;
  horaDevolucao?: string;
  localRetirada?: string;
  localDevolucao?: string;
  qtdDiarias?: number;
  valorDiaria?: number;
  seguroIncluso?: boolean;
  // Seguro
  seguradora?: string;
  tipoPlano?: string;
  destinoCoberto?: string;
  dataInicio?: string;
  dataFim?: string;
  qtdBeneficiarios?: number;
  coberturaMediaUSD?: number;
  coberturaBagagem?: boolean;
  assistencia24h?: boolean;
  valorPorPessoa?: number;
  // Experiência
  tipoExperiencia?: string;
  data?: string;
  hora?: string;
  duracaoEstimada?: string;
  localSaida?: string;
  pontoEncontro?: string;
  inclui?: string;
  qtdParticipantes?: number;
}

const STORAGE_KEY = 'robot_servicos_selecionados';

// Mapeia tipo do robô para categoria/tipo do ERP
export function mapTipoParaERP(tipo: string): string {
  const mapa: Record<string, string> = {
    hotel: 'Hospedagem',
    aereo: 'Aéreo',
    carro: 'Transporte',
    seguro: 'Seguros',
    experiencia: 'Experiências',
    passeio: 'Experiências',
    transfer: 'Experiências',
    ingresso: 'Experiências',
    outros: 'Outros',
  };
  return mapa[tipo] || 'Outros';
}

// Converte um RobotServico no formato esperado pelo SaleItem (description + metadata)
export function robotServicoToSaleItem(servico: RobotServico) {
  const tipoERP = mapTipoParaERP(servico.tipo);
  const metadata: Record<string, any> = {
    type: servico.tipo === 'hotel' ? 'hotel'
        : servico.tipo === 'aereo' ? 'flight'
        : servico.tipo === 'carro' ? 'car'
        : servico.tipo === 'seguro' ? 'insurance'
        : (['experiencia','passeio','transfer','ingresso'].includes(servico.tipo)) ? 'experience'
        : 'other',
    tipoServico: tipoERP,
    fornecedor: servico.fornecedor,
    moeda: servico.moeda || 'BRL',
    observacoes: servico.observacoes,
    descricaoDetalhada: servico.descricaoDetalhada,
    // Hotel
    nomeHotel: servico.nomeHotel,
    checkIn: servico.checkIn,
    checkOut: servico.checkOut,
    numNoites: servico.numNoites,
    horaCheckIn: servico.horaCheckIn,
    tipoQuarto: servico.tipoQuarto,
    qtdQuartos: servico.qtdQuartos,
    qtdHospedes: servico.qtdHospedes,
    valorNoite: servico.valorNoite,
    estrelas: servico.estrelas,
    categoria: servico.categoria,
    cidade: servico.cidade,
    pais: servico.pais,
    endereco: servico.endereco,
    comodidades: servico.comodidades,
    // Aéreo
    ciaPrincipal: servico.ciaPrincipal,
    trechos: servico.trechos,
    bagagem: servico.bagagem,
    // Carro
    locadora: servico.locadora,
    modelo: servico.modelo,
    dataRetirada: servico.dataRetirada,
    horaRetirada: servico.horaRetirada,
    dataDevolucao: servico.dataDevolucao,
    horaDevolucao: servico.horaDevolucao,
    localRetirada: servico.localRetirada,
    localDevolucao: servico.localDevolucao,
    qtdDiarias: servico.qtdDiarias,
    valorDiaria: servico.valorDiaria,
    seguroIncluso: servico.seguroIncluso,
    // Seguro
    seguradora: servico.seguradora,
    tipoPlano: servico.tipoPlano,
    destinoCoberto: servico.destinoCoberto,
    dataInicio: servico.dataInicio,
    dataFim: servico.dataFim,
    qtdBeneficiarios: servico.qtdBeneficiarios,
    coberturaMediaUSD: servico.coberturaMediaUSD,
    coberturaBagagem: servico.coberturaBagagem,
    assistencia24h: servico.assistencia24h,
    valorPorPessoa: servico.valorPorPessoa,
    // Experiência
    tipoExperiencia: servico.tipoExperiencia,
    data: servico.data,
    hora: servico.hora,
    duracaoEstimada: servico.duracaoEstimada,
    localSaida: servico.localSaida,
    pontoEncontro: servico.pontoEncontro,
    inclui: servico.inclui,
    qtdParticipantes: servico.qtdParticipantes,
  };
  // limpar undefined
  Object.keys(metadata).forEach(k => metadata[k] === undefined && delete metadata[k]);

  return {
    description: servico.descricaoResumida,
    cost_price: Number(servico.custo) || 0,
    rav: 0,
    markup_percent: 0,
    total_value: Number(servico.custo) || 0,
    metadata,
  };
}

/**
 * Hook que escuta seleções enviadas da página do Robô de Cotação.
 * Funciona via localStorage (mesma janela ou outras abas).
 */
export function useRobotImport(
  onAddItems: (items: ReturnType<typeof robotServicoToSaleItem>[]) => void
) {
  useEffect(() => {
    const consume = () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const servicos: RobotServico[] = JSON.parse(raw);
        if (!Array.isArray(servicos) || servicos.length === 0) return;
        localStorage.removeItem(STORAGE_KEY);
        const mapped = servicos.map(robotServicoToSaleItem);
        onAddItems(mapped);
        toast.success(`${servicos.length} serviço(s) importado(s) do robô`, {
          description: 'Os serviços foram adicionados à cotação.',
        });
      } catch (e) {
        console.error('useRobotImport parse error', e);
      }
    };

    // 1. Consumir imediato (caso a página acabou de abrir e os dados já estavam lá)
    consume();

    // 2. Escutar storage de outras abas
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) consume();
    };
    window.addEventListener('storage', handleStorage);

    // 3. Escutar evento custom da mesma aba
    const handleCustom = () => consume();
    window.addEventListener('robot-servicos-importar', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('robot-servicos-importar', handleCustom);
    };
  }, [onAddItems]);
}
