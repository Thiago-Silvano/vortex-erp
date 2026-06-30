// ds160-mapper.ts
// ---------------------------------------------------------------------------
// Monta o payload COMPLETO que o robô DS-160 espera, a partir do registro do ERP.
// Fonte da verdade: TODAS as chaves lidas pelo robot.py (preencher_ds160).
// Nenhum campo é omitido — tudo tem default, então o robô nunca recebe undefined.
//
// O lado ESQUERDO de cada linha (o nome do campo de saída) é fixo: é o que o robô
// lê e NÃO pode mudar. O lado direito — pega(form, "...") — é a origem no ERP;
// ajuste os nomes ali se o seu formulário usar outros. Os aliases extras já cobrem
// as variações mais comuns. O validarDS160() no fim mostra o que ficou vazio.
// ---------------------------------------------------------------------------

// ── Tipos aninhados ────────────────────────────────────────────────────────
export interface EmpregoAnterior {
  empresa: string;
  endereco: string;
  cargo: string;
  telefone: string;
  data_inicio: string; // DD/MM/AAAA
  data_fim: string;    // DD/MM/AAAA
  descricao: string;
  motivo_saida: string;
}

// ── Contrato de saída (exatamente o que o robô consome) ────────────────────
export interface DadosDS160 {
  // Personal 1 / 2
  sobrenome: string;
  nome: string;
  nome_completo: string;
  nome_passaporte: string;
  sexo: string;            // "M" | "F" (ou Masculino/Feminino)
  estado_civil: string;    // S | M | W | D (ou Solteiro/Casado/Viuvo/Divorciado)
  data_nascimento: string; // DD/MM/AAAA
  cidade_nascimento: string;
  estado_nascimento: string;
  cpf: string;

  // Endereço e contato
  endereco_linha1: string;
  endereco_linha2: string;
  numero: string;
  cidade_residencia: string;
  estado_residencia: string;
  cep: string;
  telefone: string;
  email: string;
  redes_sociais: string;   // ex: "Instagram @handle" | ""

  // Passaporte
  passaporte_numero: string;
  passaporte_cidade_emissao: string;
  passaporte_data_emissao: string;  // DD/MM/AAAA
  passaporte_data_validade: string; // DD/MM/AAAA
  passaporte_perdido: boolean;

  // Viagem
  viagem_cidade_destino: string;
  viagem_estado_eua: string;        // sigla, ex "FL" (evita pausa do robô)
  viagem_data_chegada: string;      // DD/MM/AAAA
  viagem_duracao_dias: string | number;
  viagem_endereco_eua: string;
  viagem_hospedagem: string;
  viagem_pago_por: string;          // S (self) | O (outro) | C (empresa)

  // Pagador (quando viagem_pago_por = O)
  pagador_nome: string;
  pagador_email: string;
  pagador_telefone: string;
  pagador_relacao: string;

  // Contato nos EUA
  contato_eua_nome: string;

  // Acompanhantes (cada item: "Nome (Relacao)")
  acompanhantes: string[];

  // Viagem / visto anterior
  viagens_anteriores_eua: boolean;
  visto_anterior: boolean;     // já teve visto americano
  ja_teve_visto_eua: boolean;  // alias aceito pelo robô
  visto_negado: boolean;
  peticao_imigrante: boolean;

  // Família
  pai_nome: string;
  pai_nascimento: string;      // DD/MM/AAAA
  pai_nos_eua: boolean;
  mae_nome: string;
  mae_nascimento: string;      // DD/MM/AAAA
  mae_nos_eua: boolean;
  parentes_nos_eua: boolean;

  // Cônjuge (quando casado)
  conjuge_nome: string;
  conjuge_nascimento: string;  // DD/MM/AAAA
  conjuge_cidade_nascimento: string;

  // Trabalho atual
  status_profissional: string;
  cargo: string;
  empresa_nome: string;
  empresa_endereco: string;
  empresa_cidade: string;
  empresa_telefone: string;
  data_admissao: string;       // DD/MM/AAAA
  renda_mensal: string | number;
  descricao_funcoes: string;

  // Empregos anteriores
  empregos_anteriores: EmpregoAnterior[];

  // Trabalho adicional
  idiomas: string[];
  servico_militar: boolean;

  // Educação (DS-160: instituições de nível secundário ou superior)
  nivel_educacao: string;
  instituicao_nome: string;
  instituicao_cidade: string;
  instituicao_pais: string;
  curso: string;
  data_inicio_estudo: string;  // DD/MM/AAAA
  data_fim_estudo: string;     // DD/MM/AAAA
  pertence_organizacao: boolean;
  data_casamento: string;      // DD/MM/AAAA

  // Segurança
  crime: boolean;
  lavagem_dinheiro: boolean;
  trafico_pessoas: boolean;
  terrorismo: boolean;
  genocidio: boolean;
  tortura: boolean;
  deportado: boolean;
}

// ── Helpers de coerção ─────────────────────────────────────────────────────

/** Booleano tolerante: aceita true, "true", "sim", "yes", "y", "1", 1. */
function bool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "sim" || s === "yes" || s === "y" || s === "1";
  }
  return false;
}

/** Texto seguro — nunca undefined/null. */
function txt(v: any): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

/** Normaliza data para DD/MM/AAAA. Aceita Date, ISO (YYYY-MM-DD) ou já DD/MM/AAAA. */
function dataBR(v: any): string {
  if (!v) return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    const d = String(v.getDate()).padStart(2, "0");
    const m = String(v.getMonth() + 1).padStart(2, "0");
    return `${d}/${m}/${v.getFullYear()}`;
  }
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);          // 1979-12-27[T...]
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);    // 27/12/1979
  if (br) return `${br[1].padStart(2, "0")}/${br[2].padStart(2, "0")}/${br[3]}`;
  return s; // formato desconhecido: deixa como veio
}

/** Primeiro valor não-vazio entre várias chaves possíveis do ERP. */
function pega(form: any, ...chaves: string[]): any {
  for (const k of chaves) {
    const val = form?.[k];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return undefined;
}

// ── Mapper principal — preenche TODOS os campos do contrato ────────────────

export function montarDadosDS160(form: any): DadosDS160 {
  form = form || {};

  // Nome: tenta cheio; senão monta de nome + sobrenome
  const sobrenome = txt(pega(form, "sobrenome", "surname", "ultimo_nome"));
  const nome = txt(pega(form, "nome", "given_name", "primeiro_nome"));
  const nomeCompleto =
    txt(pega(form, "nome_completo", "nome_passaporte")) ||
    `${nome} ${sobrenome}`.trim();

  // Acompanhantes: aceita string[] ("Nome (Relacao)") ou objeto[] {nome, relacao}
  const acompanhantes: string[] = Array.isArray(form.acompanhantes)
    ? form.acompanhantes
        .map((a: any) =>
          typeof a === "string"
            ? a
            : `${txt(a.nome ?? a.nome_completo)}${a.relacao ? ` (${txt(a.relacao)})` : ""}`
        )
        .filter((s: string) => s.trim())
    : [];

  // Empregos anteriores: normaliza cada item para o shape do robô
  const empregos_anteriores: EmpregoAnterior[] = Array.isArray(form.empregos_anteriores)
    ? form.empregos_anteriores.map((e: any) => ({
        empresa: txt(e.empresa ?? e.empresa_nome),
        endereco: txt(e.endereco ?? e.empresa_endereco),
        cargo: txt(e.cargo),
        telefone: txt(e.telefone ?? e.empresa_telefone),
        data_inicio: dataBR(e.data_inicio ?? e.data_admissao),
        data_fim: dataBR(e.data_fim ?? e.data_saida),
        descricao: txt(e.descricao ?? e.descricao_funcoes),
        motivo_saida: txt(e.motivo_saida),
      }))
    : [];

  // Idiomas: separa "Inglês e português" / "X, Y" em itens individuais
  const idiomasBrutos: string[] = Array.isArray(form.idiomas)
    ? form.idiomas.map(txt)
    : txt(form.idiomas)
    ? [txt(form.idiomas)]
    : [];
  const idiomas: string[] = idiomasBrutos
    .flatMap((s) => s.split(/\s+e\s+|[,/&]/))
    .map((s) => s.trim())
    .filter(Boolean);
  if (!idiomas.length) idiomas.push("Portugues");

  return {
    // Personal
    sobrenome,
    nome,
    nome_completo: nomeCompleto,
    nome_passaporte: txt(pega(form, "nome_passaporte", "nome_completo")) || nomeCompleto,
    sexo: txt(pega(form, "sexo", "genero")) || "M",
    estado_civil: txt(pega(form, "estado_civil")) || "S",
    data_nascimento: dataBR(pega(form, "data_nascimento", "nascimento", "dob")),
    cidade_nascimento: txt(pega(form, "cidade_nascimento", "naturalidade")),
    estado_nascimento: txt(pega(form, "estado_nascimento", "uf_nascimento")),
    cpf: txt(pega(form, "cpf", "cpf_cnpj")),

    // Endereço
    endereco_linha1: txt(pega(form, "endereco_linha1", "endereco", "logradouro")),
    endereco_linha2: txt(pega(form, "endereco_linha2", "complemento")),
    numero: txt(pega(form, "numero")),
    cidade_residencia: txt(pega(form, "cidade_residencia", "cidade")),
    estado_residencia: txt(pega(form, "estado_residencia", "uf", "estado")),
    cep: txt(pega(form, "cep")),
    telefone: txt(pega(form, "telefone", "celular", "whatsapp")),
    email: txt(pega(form, "email")),
    redes_sociais: txt(pega(form, "redes_sociais", "instagram", "social")),

    // Passaporte
    passaporte_numero: txt(pega(form, "passaporte_numero", "passaporte")),
    passaporte_cidade_emissao: txt(pega(form, "passaporte_cidade_emissao")),
    passaporte_data_emissao: dataBR(pega(form, "passaporte_data_emissao", "passaporte_emissao", "emissao")),
    passaporte_data_validade: dataBR(pega(form, "passaporte_data_validade", "passaporte_validade", "validade")),
    passaporte_perdido: bool(form.passaporte_perdido),

    // Viagem
    viagem_cidade_destino: txt(pega(form, "viagem_cidade_destino", "cidade_destino", "destino")) || "Miami",
    viagem_estado_eua: txt(pega(form, "viagem_estado_eua", "estado_destino_eua", "viagem_estado_destino")),
    viagem_data_chegada: dataBR(pega(form, "viagem_data_chegada", "data_chegada", "data_viagem")),
    viagem_duracao_dias: pega(form, "viagem_duracao_dias", "duracao_dias") ?? "10",
    viagem_endereco_eua: txt(pega(form, "viagem_endereco_eua", "endereco_eua", "hospedagem")),
    viagem_hospedagem: txt(pega(form, "viagem_hospedagem", "hotel", "viagem_endereco_eua")),
    viagem_pago_por: txt(pega(form, "viagem_pago_por", "pago_por")) || "S",

    // Pagador
    pagador_nome: txt(pega(form, "pagador_nome")),
    pagador_email: txt(pega(form, "pagador_email")),
    pagador_telefone: txt(pega(form, "pagador_telefone")),
    pagador_relacao: txt(pega(form, "pagador_relacao")),

    // Contato EUA (cai pro hotel/endereço quando vazio, p/ não ficar sem POC)
    contato_eua_nome:
      txt(pega(form, "contato_eua_nome", "contato_eua")) ||
      txt(pega(form, "viagem_hospedagem", "viagem_endereco_eua")),

    // Acompanhantes
    acompanhantes,

    // Viagem / visto anterior
    viagens_anteriores_eua: bool(pega(form, "viagens_anteriores_eua", "ja_viajou_eua")),
    visto_anterior: bool(pega(form, "visto_anterior", "ja_teve_visto_eua")),
    ja_teve_visto_eua: bool(pega(form, "ja_teve_visto_eua", "visto_anterior")),
    visto_negado: bool(pega(form, "visto_negado", "visto_recusado")),
    peticao_imigrante: bool(form.peticao_imigrante),

    // Família
    pai_nome: txt(pega(form, "pai_nome", "nome_pai")),
    pai_nascimento: dataBR(pega(form, "pai_nascimento", "nascimento_pai")),
    pai_nos_eua: bool(pega(form, "pai_nos_eua", "pai_eua")),
    mae_nome: txt(pega(form, "mae_nome", "nome_mae")),
    mae_nascimento: dataBR(pega(form, "mae_nascimento", "nascimento_mae")),
    mae_nos_eua: bool(pega(form, "mae_nos_eua", "mae_eua")),
    parentes_nos_eua: bool(pega(form, "parentes_nos_eua", "parentes_eua")),

    // Cônjuge
    conjuge_nome: txt(pega(form, "conjuge_nome", "nome_conjuge", "esposo_nome", "esposa_nome")),
    conjuge_nascimento: dataBR(pega(form, "conjuge_nascimento", "nascimento_conjuge")),
    conjuge_cidade_nascimento: txt(pega(form, "conjuge_cidade_nascimento")),

    // Trabalho
    status_profissional: txt(pega(form, "status_profissional", "ocupacao_status")),
    cargo: txt(pega(form, "cargo", "profissao", "ocupacao")),
    empresa_nome: txt(pega(form, "empresa_nome", "empresa")),
    empresa_endereco: txt(pega(form, "empresa_endereco")),
    empresa_cidade: txt(pega(form, "empresa_cidade")),
    empresa_telefone: txt(pega(form, "empresa_telefone")),
    data_admissao: dataBR(pega(form, "data_admissao", "admissao")),
    renda_mensal: pega(form, "renda_mensal", "salario", "renda") ?? "",
    descricao_funcoes: txt(pega(form, "descricao_funcoes", "funcoes")),

    // Empregos anteriores
    empregos_anteriores,

    // Trabalho adicional
    idiomas,
    servico_militar: bool(form.servico_militar),

    // Educação
    nivel_educacao: txt(pega(form, "nivel_educacao", "escolaridade")),
    instituicao_nome: txt(pega(form, "instituicao_nome", "instituicao", "faculdade")),
    instituicao_cidade: txt(pega(form, "instituicao_cidade")),
    instituicao_pais: txt(pega(form, "instituicao_pais")) || "BRA",
    curso: txt(pega(form, "curso", "formacao")),
    data_inicio_estudo: dataBR(pega(form, "data_inicio_estudo", "estudo_inicio")),
    data_fim_estudo: dataBR(pega(form, "data_fim_estudo", "estudo_fim")),
    pertence_organizacao: bool(form.pertence_organizacao),
    data_casamento: dataBR(pega(form, "data_casamento", "data_matrimonio")),

    // Segurança
    crime: bool(form.crime),
    lavagem_dinheiro: bool(form.lavagem_dinheiro),
    trafico_pessoas: bool(form.trafico_pessoas),
    terrorismo: bool(form.terrorismo),
    genocidio: bool(form.genocidio),
    tortura: bool(form.tortura),
    deportado: bool(form.deportado),
  };
}

// ── Validação ──────────────────────────────────────────────────────────────
// Campos que o ds160-server EXIGE (retorna 400 se faltar) + os que fazem o robô
// pausar. Use o retorno pra avisar o operador antes de abrir o robô.

const CRITICOS: (keyof DadosDS160)[] = [
  "nome_completo", "cpf", "data_nascimento", "sexo", "estado_civil",
  "passaporte_numero", "passaporte_data_validade",
  "endereco_linha1", "cidade_residencia", "cep", "telefone", "email",
  "viagem_data_chegada", "viagem_cidade_destino",
  "pai_nome", "mae_nome", "status_profissional",
];

export function validarDS160(dados: DadosDS160): string[] {
  return CRITICOS.filter((k) => {
    const v = dados[k];
    return v === "" || v === null || v === undefined;
  }) as string[];
}

// ── Disparo do robô (chama o ds160-server local, porta 3004) ───────────────

export async function dispararRoboDS160(opts: {
  form: any;
  processoId: string;
  nomeCliente: string;
  serverUrl?: string;
}): Promise<{ ok: boolean; faltando: string[]; resposta?: any; erro?: string }> {
  const { form, processoId, nomeCliente, serverUrl = "http://localhost:3004" } = opts;

  const dados = montarDadosDS160(form);
  const faltando = validarDS160(dados);
  if (faltando.length) {
    console.warn("[DS160] Campos críticos vazios (o robô vai pausar nesses):", faltando);
  }

  try {
    const r = await fetch(`${serverUrl}/ds160/iniciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome_cliente: nomeCliente,
        processo_id: processoId,
        dados,
      }),
    });
    const resposta = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { ok: false, faltando, erro: resposta?.erro || `HTTP ${r.status}`, resposta };
    }
    return { ok: true, faltando, resposta };
  } catch (e: any) {
    return {
      ok: false,
      faltando,
      erro: e?.message || "Falha ao conectar no ds160-server (porta 3004). O servidor está rodando?",
    };
  }
}

// ── Compat: nome legado usado pelo ERP (DS160Section) ──────────────────────
// Aceita (form_data, clientName) e delega para montarDadosDS160, mantendo o
// fallback do nome do cliente quando o formulário não traz o nome completo.
export function mapearDadosDS160(
  formData: Record<string, any>,
  clientName?: string,
): DadosDS160 {
  const dados = montarDadosDS160(formData || {});
  if (clientName && (!dados.nome_completo || !dados.nome_completo.trim())) {
    dados.nome_completo = clientName;
    dados.nome_passaporte = dados.nome_passaporte || clientName;
  }
  return dados;
}
