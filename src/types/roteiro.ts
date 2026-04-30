export interface FormularioRoteiro {
  destinoPrincipal: string;
  paradasSecundarias: string;
  dataInicio: string;
  dataFim: string;
  numDias: number;
  numPassageiros: number;
  perfilViajante: 'casal' | 'familia' | 'grupo' | 'solo' | 'lua-de-mel' | 'corporativo';
  idadesCriancas?: string;
  categoriaHotel: string;
  precoHotelMin?: number;
  precoHotelMax?: number;
  interesses: string[];
  ritmoViagem: 'tranquilo' | 'moderado' | 'intenso';
  observacoes?: string;
  nomeCliente: string;
  nomeAgencia: string;
  logoUrl?: string;
  corPrimaria?: string;
  slogan?: string;
  aeroportoChegadaIata?: string;
  aeroportoChegadaLabel?: string;
  aeroportoSaidaIata?: string;
  aeroportoSaidaLabel?: string;
  aeroportoOrigemIata?: string;
  aeroportoOrigemLabel?: string;
  /** Distribuição de dias por cidade (inclui o destino principal como primeira entrada). */
  cidadesDias?: { cidade: string; dias: number; stopLogistico?: boolean }[];
}

export interface OpcaoHospedagem {
  id: string;
  tipo: 'hotel' | 'pousada' | 'resort';
  nome: string;
  categoria: string;
  descricao: string;
  diferenciais: string[];
  localizacao: string;
  cidade?: string;
  enderecoCompleto?: string;
  nomeOficial?: string;
  precoEstimado: string;
  recomendadoPara: string;
  selecionado: boolean;
}

export interface OpcaoPasseio {
  id: string;
  tipo: 'passeio' | 'experiencia' | 'gastronomia' | 'cultura' | 'aventura' | 'compras';
  nome: string;
  descricao: string;
  duracao: string;
  cidade?: string;
  diaRecomendado?: number;
  periodo?: 'manha' | 'tarde' | 'noite';
  precoEstimado: string;
  nivelEsforco?: 'baixo' | 'medio' | 'alto';
  selecionado: boolean;
}

export interface OpcaoLogistica {
  id: string;
  tipo: 'transfer' | 'carro' | 'van' | 'onibus' | 'barco';
  descricao: string;
  origem: string;
  destino: string;
  precoEstimado: string;
  selecionado: boolean;
}

export interface DicaGastronomica {
  id: string;
  nome: string;
  tipo: string;
  descricao: string;
  especialidade: string;
  faixaPreco: string;
  cidade?: string;
  selecionado: boolean;
}

export interface InfoPratica {
  clima: string;
  melhorEpoca: string;
  moeda: string;
  idioma: string;
  documentos: string;
  fusoHorario: string;
  dicasGerais: string[];
}

export interface DiaDiario {
  dia: number;
  titulo: string;
  descricao: string;
  sugestoes: string[];
}

export interface RoteiroGerado {
  titulo: string;
  subtitulo: string;
  introducao: string;
  hospedagens: OpcaoHospedagem[];
  passeios: OpcaoPasseio[];
  logistica: OpcaoLogistica[];
  gastronomia: DicaGastronomica[];
  infoPratica: InfoPratica;
  roteiroDiario: DiaDiario[];
}

export interface ServicoImportadoRoteiro {
  tipoServico: string;
  descricaoResumida: string;
  descricaoDetalhada: string;
  custo: number;
  rav: number;
  acrescimo: number;
  total: number;
  origem: 'roteiro';
  detalhes: any;
  precisaBuscarFornecedor: boolean;
  termoBusca: string;
}

export interface PayloadCotacaoRoteiro {
  dadosCotacao: {
    nomeDestino: string;
    inicioViagem: string;
    finalViagem: string;
    numNoites: number;
    numPassageiros: number;
    tituloCotacao: string;
    clienteNomeSugerido: string;
  };
  servicos: ServicoImportadoRoteiro[];
  origemRoteiro: true;
  tituloRoteiro: string;
  totalItens: number;
}