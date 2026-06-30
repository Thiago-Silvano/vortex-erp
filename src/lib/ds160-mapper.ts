// Converte os dados do formulário DS-160 (form_data) para o JSON que o robô
// local de preenchimento automático espera. A fonte é o que o cliente
// preencheu no formulário público (ds160_forms.form_data).

function s(v: any): string {
  if (v == null) return '';
  return typeof v === 'string' ? v.trim() : String(v);
}

function onlyDigits(v: any): string {
  return s(v).replace(/\D/g, '');
}

// O formulário já guarda datas no formato dd/mm/aaaa na maioria dos casos.
// Normaliza qualquer variação (ISO, Date) para dd/mm/aaaa.
function formatarData(data: any): string {
  const raw = s(data);
  if (!raw) return '';
  // Já está em dd/mm/aaaa
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const ano = d.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
}

function mapearSexo(valor: any): string {
  const v = s(valor).toLowerCase();
  if (v.startsWith('m')) return 'M';
  if (v.startsWith('f')) return 'F';
  return s(valor);
}

function mapearEstadoCivil(valor: any): string {
  const v = s(valor).toLowerCase();
  if (v.startsWith('solteir')) return 'S';
  if (v.startsWith('casad')) return 'M';
  if (v.startsWith('divorciad')) return 'D';
  if (v.startsWith('viúv') || v.startsWith('viuv')) return 'W';
  if (v.startsWith('união') || v.startsWith('uniao')) return 'P';
  return s(valor);
}

function simNao(v: any): boolean {
  if (typeof v === 'boolean') return v;
  const t = s(v).toLowerCase();
  return t === 'sim' || t === 'true' || t === 's' || t === 'yes';
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
          supervisor: fd[`emprego_anterior_${n}_supervisor`],
          inicio: fd[`emprego_anterior_${n}_inicio`],
          termino: fd[`emprego_anterior_${n}_termino`],
          descricao_funcoes: fd[`emprego_anterior_${n}_descricao_funcoes`],
        });
      }
    }
  }
  return lista
    .filter((e: any) => e && Object.values(e).some(Boolean))
    .map((e: any) => ({
      empresa: s(e.empresa),
      endereco: s(e.endereco),
      telefone: onlyDigits(e.telefone),
      cargo: s(e.cargo),
      supervisor: s(e.supervisor),
      inicio: formatarData(e.inicio),
      termino: formatarData(e.termino),
      descricao_funcoes: s(e.descricao_funcoes),
    }));
}

/**
 * Converte o form_data do DS-160 para o payload consumido pelo robô local.
 * @param formData dados preenchidos pelo cliente (ds160_forms.form_data)
 * @param clientName nome do cliente (fallback para o nome do passaporte)
 */
export function mapearDadosDS160(
  formData: Record<string, any>,
  clientName?: string,
): Record<string, any> {
  const fd = formData || {};

  return {
    // Dados pessoais
    nome_completo: s(fd.nome_completo_passaporte) || s(clientName),
    sobrenome: s(fd.sobrenome),
    nome: s(fd.nome),
    nome_passaporte: s(fd.nome_completo_passaporte) || s(clientName),
    usou_outro_nome: simNao(fd.usou_outro_nome),
    outro_nome: s(fd.outro_nome),
    cpf: onlyDigits(fd.cpf),
    sexo: mapearSexo(fd.sexo),
    estado_civil: mapearEstadoCivil(fd.estado_civil),
    data_nascimento: formatarData(fd.data_nascimento),
    cidade_nascimento: s(fd.cidade_nascimento),
    estado_nascimento: s(fd.estado_nascimento),
    pais_nascimento: s(fd.pais_nascimento) || 'Brasil',
    nacionalidade: s(fd.nacionalidade) || 'Brasil',
    outra_nacionalidade: simNao(fd.outra_nacionalidade),

    // Passaporte
    passaporte_numero: s(fd.passaporte_numero),
    passaporte_tipo: 'P',
    passaporte_pais_emissao: s(fd.passaporte_pais_emissor) || 'Brasil',
    passaporte_cidade_emissao: s(fd.passaporte_cidade_emissao),
    passaporte_estado_emissao: s(fd.passaporte_estado_emissao),
    passaporte_data_emissao: formatarData(fd.passaporte_data_emissao),
    passaporte_data_validade: formatarData(fd.passaporte_data_expiracao),
    passaporte_perdido: simNao(fd.passaporte_perdido_roubado) || simNao(fd.passaporte_perdido),

    // Endereço / contato
    cep: onlyDigits(fd.contato_cep),
    endereco_linha1: s(fd.contato_endereco),
    endereco_linha2: s(fd.contato_numero),
    bairro: s(fd.contato_bairro),
    cidade_residencia: s(fd.contato_cidade),
    estado_residencia: s(fd.contato_estado),
    pais_residencia: s(fd.contato_pais) || 'Brasil',
    telefone: onlyDigits(fd.contato_telefone),
    telefone_residencial: onlyDigits(fd.contato_telefone_residencial),
    telefone_comercial: onlyDigits(fd.contato_telefone_comercial),
    email: s(fd.contato_email),
    redes_sociais: Array.isArray(fd.redes_sociais) ? fd.redes_sociais : [],

    // Viagem
    viagem_motivo: s(fd.motivo_viagem) || 'B1B2',
    viagem_data_chegada: formatarData(fd.data_ida),
    viagem_data_volta: formatarData(fd.data_volta),
    viagem_duracao_dias: s(fd.duracao_viagem),
    viagem_cidade_destino: s(fd.cidade_destino_eua),
    viagem_endereco_eua: s(fd.local_hospedagem),
    viagem_pago_por: s(fd.pagador_viagem),
    pagador_nome: s(fd.pagador_nome),
    pagador_telefone: onlyDigits(fd.pagador_telefone),
    pagador_email: s(fd.pagador_email),
    pagador_relacao: s(fd.pagador_parentesco),
    pagador_endereco: s(fd.pagador_endereco),
    acompanhantes: Array.isArray(fd.acompanhantes) ? fd.acompanhantes : [],

    // Contato nos EUA
    contato_eua_nome: s(fd.contato_eua_nome),
    contato_eua_organizacao: s(fd.contato_eua_organizacao),
    contato_eua_telefone: onlyDigits(fd.contato_eua_telefone),
    contato_eua_email: s(fd.contato_eua_email),
    contato_eua_endereco: s(fd.contato_eua_endereco),
    contato_eua_relacao: s(fd.contato_eua_relacao),

    // Família
    pai_nome: s(fd.pai_nome),
    pai_nascimento: formatarData(fd.pai_nascimento),
    pai_nos_eua: simNao(fd.pai_mora_eua),
    mae_nome: s(fd.mae_nome),
    mae_nascimento: formatarData(fd.mae_nascimento),
    mae_nos_eua: simNao(fd.mae_mora_eua),
    parentes_nos_eua: simNao(fd.parentes_eua),
    conjuge_nome: s(fd.conjuge_nome),
    conjuge_nascimento: formatarData(fd.conjuge_nascimento),
    conjuge_cidade_nascimento: s(fd.conjuge_cidade_nascimento),
    conjuge_pais_nascimento: s(fd.conjuge_pais_nascimento) || 'Brasil',

    // Trabalho
    status_profissional: s(fd.status_profissional),
    empresa_nome: s(fd.empresa_atual),
    empresa_endereco: s(fd.empresa_endereco),
    empresa_cep: onlyDigits(fd.empresa_cep),
    empresa_telefone: onlyDigits(fd.empresa_telefone),
    cargo: s(fd.cargo_atual),
    data_admissao: formatarData(fd.empresa_data_inicio),
    renda_mensal: s(fd.renda_mensal),
    descricao_funcoes: s(fd.descricao_funcoes),
    empregos_anteriores: mapearEmpregosAnteriores(fd),
    idiomas: Array.isArray(fd.idiomas)
      ? fd.idiomas
      : (s(fd.idiomas) ? s(fd.idiomas).split(',').map((x) => x.trim()) : ['Português']),
    paises_visitados: Array.isArray(fd.paises_visitados) ? fd.paises_visitados : [],

    // Histórico de vistos
    viagens_anteriores_eua: s(fd.historico_viagens_eua_tipo) || s(fd.historico_viagens_eua),
    ja_teve_visto: simNao(fd.ja_teve_visto),
    visto_negado: simNao(fd.visto_negado),

    // Segurança (respostas marcadas pelo cliente — default false)
    pertence_organizacao: simNao(fd.organizacoes),
    servico_militar: simNao(fd.serviu_forcas_armadas),
    doenca_contagiosa: simNao(fd.seg_doenca_contagiosa),
    problema_mental: simNao(fd.seg_transtorno_mental),
    drogas: simNao(fd.seg_dependente_drogas) || simNao(fd.seg_trafico_drogas),
    crime: simNao(fd.seg_preso_condenado),
    lavagem_dinheiro: simNao(fd.seg_lavagem_dinheiro),
    trafico_pessoas: simNao(fd.seg_trafico_pessoas),
    terrorismo: simNao(fd.seg_atividade_terrorista) || simNao(fd.seg_apoio_terrorismo),
    genocidio: simNao(fd.seg_genocidio),
    tortura: simNao(fd.seg_tortura),
    fraude: simNao(fd.seg_fraude),
    deportado: simNao(fd.seg_deportacao),
  };
}