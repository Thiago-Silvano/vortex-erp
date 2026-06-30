// Converte os dados do formulário DS-160 (form_data) para o JSON COMPLETO que o
// robô local de preenchimento automático espera. A fonte é exclusivamente o que
// o cliente preencheu no formulário público (ds160_forms.form_data) — sem PDF.
//
// O objeto retornado espelha campo a campo o contrato `DS160Dados` esperado pelo
// robô (ver prompt "Contrato JSON Completo DS-160").

function s(v: any): string {
  if (v == null) return '';
  return typeof v === 'string' ? v.trim() : String(v);
}

function onlyDigits(v: any): string {
  return s(v).replace(/\D/g, '');
}

function bool(v: any): boolean {
  if (typeof v === 'boolean') return v;
  const t = s(v).toLowerCase();
  return t === 'sim' || t === 'true' || t === 's' || t === 'yes' || t === 'já fui' || t === 'ja fui';
}

// Normaliza qualquer data (ISO, yyyy-mm-dd, dd/mm/aaaa, Date) para dd/mm/aaaa.
function formatarData(data: any): string {
  const raw = s(data);
  if (!raw) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  // yyyy-mm-dd (input type=date) — evita problemas de fuso usando split direto.
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const ano = d.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
}

function mapearSexo(valor: any): 'M' | 'F' | '' {
  const v = s(valor).toLowerCase();
  if (v.startsWith('m')) return 'M';
  if (v.startsWith('f')) return 'F';
  return '';
}

function mapearEstadoCivil(valor: any): string {
  const v = s(valor).toLowerCase();
  if (v.startsWith('solteir')) return 'S';
  if (v.startsWith('casad')) return 'M';
  if (v.startsWith('divorciad')) return 'D';
  if (v.startsWith('viúv') || v.startsWith('viuv')) return 'W';
  if (v.startsWith('união') || v.startsWith('uniao')) return 'O';
  if (!v) return '';
  return 'O';
}

function mapearStatusProfissional(valor: any): string {
  const v = s(valor).toLowerCase();
  if (v.startsWith('empregad')) return 'E';
  if (v.startsWith('estudante')) return 'ST';
  if (v.startsWith('autônom') || v.startsWith('autonom') || v.startsWith('freelan')) return 'SE';
  if (v.startsWith('empresár') || v.startsWith('empresar')) return 'SE';
  if (v.startsWith('desempregad')) return 'U';
  if (v.startsWith('aposentad')) return 'R';
  if (v.startsWith('do lar')) return 'H';
  if (!v) return '';
  return 'O';
}

function mapearPagoPor(valor: any): 'S' | 'O' | 'C' {
  const v = s(valor).toLowerCase();
  if (v.startsWith('eu')) return 'S';
  if (v.startsWith('empresa')) return 'C';
  return 'O'; // "Outra pessoa" / "Outro"
}

// País sempre em código de 3 letras quando for Brasil.
function paisCode(valor: any): string {
  const v = s(valor).toLowerCase();
  if (!v || v.startsWith('bra')) return 'BRA';
  return s(valor);
}

// Remove caracteres especiais problemáticos para o robô (barra, etc.).
function limparEndereco(valor: any): string {
  return s(valor).replace(/[\/\\|]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function montarEndereco(endereco: any, numero: any): string {
  const e = limparEndereco(endereco);
  const n = s(numero);
  if (!e) return '';
  return n ? `${e}, ${n}` : e;
}

function mapearAcompanhantes(lista: any): string[] {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((a) => {
      if (!a) return '';
      if (typeof a === 'string') return a.trim();
      const nome = s(a.nome);
      const rel = s(a.parentesco || a.relacao);
      if (!nome) return '';
      return rel ? `${nome} (${rel})` : nome;
    })
    .filter(Boolean);
}

function mapearRedesSociais(valor: any): string {
  if (Array.isArray(valor)) return valor.map((x) => s(x)).filter(Boolean).join('; ');
  return s(valor);
}

function mapearIdiomas(valor: any): string[] {
  if (Array.isArray(valor)) {
    const arr = valor.map((x) => s(x)).filter(Boolean);
    return arr.length ? arr : ['Português'];
  }
  const str = s(valor);
  if (!str) return ['Português'];
  return str.split(/[,;/]+/).map((x) => x.trim()).filter(Boolean);
}

// Normaliza empregos anteriores tanto no formato de array quanto nos
// campos achatados (emprego_anterior_1_*).
function mapearEmpregosAnteriores(fd: Record<string, any>): any[] {
  let lista: any[] = Array.isArray(fd.empregos_anteriores) ? fd.empregos_anteriores : [];
  if (!lista.length) {
    for (const n of [1, 2]) {
      if (fd[`emprego_anterior_${n}_empresa`] || fd[`emprego_anterior_${n}_endereco`]) {
        lista.push({
          empresa: fd[`emprego_anterior_${n}_empresa`],
          endereco: fd[`emprego_anterior_${n}_endereco`],
          telefone: fd[`emprego_anterior_${n}_telefone`],
          cargo: fd[`emprego_anterior_${n}_cargo`],
          inicio: fd[`emprego_anterior_${n}_inicio`],
          termino: fd[`emprego_anterior_${n}_termino`],
        });
      }
    }
  }
  return lista
    .filter((e: any) => e && Object.values(e).some(Boolean))
    .map((e: any) => ({
      empresa: s(e.empresa),
      endereco: limparEndereco(e.endereco),
      telefone: onlyDigits(e.telefone),
      cargo: s(e.cargo),
      data_inicio: formatarData(e.inicio || e.data_inicio),
      data_fim: formatarData(e.termino || e.data_fim),
      motivo_saida: s(e.motivo_saida) || 'Nova oportunidade profissional',
    }));
}

// Pega a primeira formação acadêmica preenchida (array `formacoes` ou legado).
function primeiraFormacao(fd: Record<string, any>): Record<string, any> {
  let lista: any[] = Array.isArray(fd.formacoes) ? fd.formacoes : [];
  if (!lista.length) {
    for (const n of [1, 2, 3]) {
      if (fd[`formacao_${n}_instituicao`] || fd[`formacao_${n}_curso`]) {
        lista.push({
          instituicao: fd[`formacao_${n}_instituicao`],
          endereco: fd[`formacao_${n}_endereco`],
          curso: fd[`formacao_${n}_curso`],
          pais: 'Brasil',
          inicio: fd[`formacao_${n}_inicio`],
          termino: fd[`formacao_${n}_termino`],
        });
      }
    }
  }
  return lista.find((f) => f && Object.values(f).some(Boolean)) || {};
}

/**
 * Converte o form_data do DS-160 para o payload COMPLETO consumido pelo robô.
 * @param formData dados preenchidos pelo cliente (ds160_forms.form_data)
 * @param clientName nome do cliente (fallback para o nome do passaporte)
 */
export function mapearDadosDS160(
  formData: Record<string, any>,
  clientName?: string,
): Record<string, any> {
  const fd = formData || {};
  const formacao = primeiraFormacao(fd);
  const visitas: any[] = Array.isArray(fd.visitas_eua) ? fd.visitas_eua : [];
  const ultimaVisita = visitas.find((v) => v && (v.data_chegada || v.duracao)) || {};

  return {
    // ── Dados Pessoais ──
    nome_completo: s(fd.nome_completo_passaporte) || s(clientName),
    sobrenome: s(fd.sobrenome),
    nome: s(fd.nome),
    nome_passaporte: s(fd.nome_completo_passaporte) || s(clientName),
    cpf: onlyDigits(fd.cpf),
    sexo: mapearSexo(fd.sexo),
    estado_civil: mapearEstadoCivil(fd.estado_civil),
    data_nascimento: formatarData(fd.data_nascimento),
    cidade_nascimento: s(fd.cidade_nascimento),
    estado_nascimento: s(fd.estado_nascimento),
    pais_nascimento: 'BRA',
    nacionalidade: 'BRA',

    // ── Passaporte ──
    passaporte_numero: s(fd.passaporte_numero),
    passaporte_tipo: 'P',
    passaporte_pais_emissao: 'BRA',
    passaporte_cidade_emissao: s(fd.passaporte_cidade_emissao) || s(fd.cidade_nascimento),
    passaporte_data_emissao: formatarData(fd.passaporte_data_emissao),
    passaporte_data_validade: formatarData(fd.passaporte_data_expiracao),
    passaporte_perdido: bool(fd.passaporte_perdido) || bool(fd.passaporte_perdido_roubado),

    // ── Endereço e Contato ──
    endereco_linha1: montarEndereco(fd.contato_endereco, fd.contato_numero),
    endereco_linha2: s(fd.contato_bairro),
    cidade_residencia: s(fd.contato_cidade),
    estado_residencia: s(fd.contato_estado),
    cep: onlyDigits(fd.contato_cep),
    pais_residencia: 'BRA',
    telefone: onlyDigits(fd.contato_telefone),
    email: s(fd.contato_email),
    redes_sociais: mapearRedesSociais(fd.redes_sociais),

    // ── Viagem ──
    viagem_motivo: 'B1B2',
    viagem_data_chegada: formatarData(fd.data_ida),
    viagem_duracao_dias: s(fd.duracao_viagem),
    viagem_cidade_destino: s(fd.cidade_destino_eua),
    viagem_endereco_eua: s(fd.local_hospedagem),
    viagem_pago_por: mapearPagoPor(fd.pagador_viagem),
    pagador_nome: s(fd.pagador_nome) || s(fd.pagador_empresa_nome),
    pagador_endereco: limparEndereco(fd.pagador_endereco) || limparEndereco(fd.pagador_empresa_endereco),
    pagador_telefone: onlyDigits(fd.pagador_telefone || fd.pagador_empresa_telefone),
    pagador_email: s(fd.pagador_email) || s(fd.pagador_empresa_email),
    pagador_relacao: s(fd.pagador_parentesco),
    acompanhantes: mapearAcompanhantes(fd.acompanhantes),

    // ── Contato nos EUA ──
    contato_eua_nome: s(fd.contato_eua_nome) || s(fd.contato_eua_organizacao),
    contato_eua_endereco: limparEndereco(fd.contato_eua_endereco),
    contato_eua_telefone: onlyDigits(fd.contato_eua_telefone),
    contato_eua_relacao: s(fd.contato_eua_relacao),

    // ── Família ──
    pai_nome: s(fd.pai_nome),
    pai_nascimento: formatarData(fd.pai_nascimento),
    pai_nos_eua: bool(fd.pai_mora_eua),
    mae_nome: s(fd.mae_nome),
    mae_nascimento: formatarData(fd.mae_nascimento),
    mae_nos_eua: bool(fd.mae_mora_eua),
    parentes_nos_eua: !!s(fd.parentes_eua),
    conjuge_nome: s(fd.conjuge_nome),
    conjuge_nascimento: formatarData(fd.conjuge_nascimento),
    conjuge_cidade_nascimento: s(fd.conjuge_cidade_nascimento),
    conjuge_pais_nascimento: paisCode(fd.conjuge_pais_nascimento),
    data_casamento: formatarData(fd.conjuge_casamento_inicio),

    // ── Profissional ──
    status_profissional: mapearStatusProfissional(fd.status_profissional),
    empresa_nome: s(fd.empresa_atual),
    empresa_endereco: limparEndereco(fd.empresa_endereco),
    empresa_telefone: onlyDigits(fd.empresa_telefone),
    cargo: s(fd.cargo_atual),
    data_admissao: formatarData(fd.empresa_data_inicio),
    renda_mensal: onlyDigits(fd.renda_mensal),
    descricao_funcoes: s(fd.descricao_funcoes) || `Atividades de ${s(fd.cargo_atual) || 'rotina administrativa'}`,
    empregos_anteriores: mapearEmpregosAnteriores(fd),

    // ── Educação ──
    nivel_educacao: s(fd.nivel_educacao) || 'U',
    instituicao_nome: s(formacao.instituicao),
    instituicao_cidade: s(formacao.cidade) || s(fd.contato_cidade),
    instituicao_pais: paisCode(formacao.pais),
    curso: s(formacao.curso),
    data_inicio_estudo: formatarData(formacao.inicio),
    data_fim_estudo: formatarData(formacao.termino),
    idiomas: mapearIdiomas(fd.idiomas),

    // ── Histórico de Viagens aos EUA ──
    viagens_anteriores_eua: bool(fd.historico_viagens_eua_tipo),
    ultima_viagem_data: formatarData(ultimaVisita.data_chegada),
    ultima_viagem_duracao: s(ultimaVisita.duracao),
    visto_negado: bool(fd.visto_negado),
    visto_negado_ano: s(fd.visto_negado_ano),
    visto_negado_tipo: s(fd.visto_negado_tipo) || 'B1/B2',
    deportado: bool(fd.seg_deportacao),
    overstay: bool(fd.seg_excedeu_prazo),

    // ── Segurança (respostas marcadas pelo cliente — default false) ──
    pertence_organizacao: !!s(fd.organizacoes),
    servico_militar: bool(fd.serviu_forcas_armadas),
    crime: bool(fd.seg_preso_condenado),
    drogas: bool(fd.seg_dependente_drogas) || bool(fd.seg_trafico_drogas),
    doenca_contagiosa: bool(fd.seg_doenca_contagiosa),
    problema_mental: bool(fd.seg_transtorno_mental),
    trafico_pessoas: bool(fd.seg_trafico_pessoas) || bool(fd.seg_auxilio_trafico_pessoas),
    terrorismo: bool(fd.seg_atividade_terrorista) || bool(fd.seg_apoio_terrorismo) || bool(fd.seg_membro_org_terrorista),
    genocidio: bool(fd.seg_genocidio),
    tortura: bool(fd.seg_tortura),
    assassinato: bool(fd.seg_violencia_extrajudicial),
    lavagem_dinheiro: bool(fd.seg_lavagem_dinheiro),
  };
}
