// Validação por etapa do formulário DS-160 (15 etapas).
// Retorna um mapa { campoKey: mensagemDeErro }. Vazio = etapa válida.

import { OCUPACAO_SEM_EMPREGADOR } from './types';

const REQUIRED = 'Este campo é obrigatório';
const SELECT_REQ = 'Selecione uma opção';
const LIST_EMPTY = 'Adicione ao menos um item';
const LIST_INCOMPLETE = 'Preencha todos os campos de cada item adicionado';

type Errors = Record<string, string>;

const isEmpty = (v: any) => v === undefined || v === null || String(v).trim() === '';
const onlyDigits = (s: any) => String(s ?? '').replace(/\D/g, '');
const validEmail = (v: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? '').trim());
const validDate = (v: any) => {
  if (isEmpty(v)) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
};

export function validateStep(step: number, data: Record<string, any>): Errors {
  const e: Errors = {};
  const d = data || {};
  const req = (key: string, msg = REQUIRED) => { if (isEmpty(d[key])) e[key] = msg; };
  // Lista de objetos: exige ao menos 1 item e todos os campos obrigatórios preenchidos.
  const listReq = (key: string, fields: string[], emptyMsg = LIST_EMPTY) => {
    const arr = Array.isArray(d[key]) ? d[key] : [];
    if (arr.length === 0) { e[key] = emptyMsg; return; }
    if (arr.some((it: any) => fields.some(f => isEmpty(it?.[f])))) e[key] = LIST_INCOMPLETE;
  };
  // Lista de strings simples (idiomas, e-mails, telefones, países).
  const strListReq = (key: string, emptyMsg = LIST_EMPTY, validate?: (v: string) => boolean) => {
    const arr = (Array.isArray(d[key]) ? d[key] : []).map((x: any) => String(x ?? '').trim()).filter(Boolean);
    if (arr.length === 0) { e[key] = emptyMsg; return; }
    if (validate && !arr.every(validate)) e[key] = 'Verifique os valores informados';
  };

  switch (step) {
    case 0: { // Dados Pessoais
      req('sobrenome');
      req('nome');
      req('nome_completo');
      req('sexo', SELECT_REQ);
      req('estado_civil', SELECT_REQ);
      if (d.estado_civil === 'O') req('estado_civil_outro');
      if (isEmpty(d.data_nascimento)) e.data_nascimento = REQUIRED;
      else if (!validDate(d.data_nascimento)) e.data_nascimento = 'Data inválida';
      req('cidade_nascimento');
      if (!d.estado_nascimento_na) req('estado_nascimento');
      req('pais_nascimento', SELECT_REQ);
      if (d.outros_nomes) listReq('outros_nomes_lista', ['sobrenome', 'nome']);
      if (!d.nome_nativo_na) req('nome_nativo');
      break;
    }
    case 1: { // Nacionalidade e documentos
      req('nacionalidade', SELECT_REQ);
      if (!d.cpf_na) {
        if (isEmpty(d.cpf)) e.cpf = REQUIRED;
        else if (onlyDigits(d.cpf).length !== 11) e.cpf = 'CPF inválido. Digite os 11 números';
      }
      if (d.outra_nacionalidade) {
        req('outra_nacionalidade_pais', SELECT_REQ);
        if (d.outra_nacionalidade_tem_passaporte) req('outra_nacionalidade_passaporte');
      }
      if (d.residente_outro_pais) req('residente_outro_pais_qual', SELECT_REQ);
      if (!d.ssn_eua_na) req('ssn_eua');
      if (!d.tax_id_eua_na) req('tax_id_eua');
      break;
    }
    case 2: { // Viagem
      req('proposito', SELECT_REQ);
      if (isEmpty(d.viagem_data_chegada)) e.viagem_data_chegada = REQUIRED;
      else if (!validDate(d.viagem_data_chegada)) e.viagem_data_chegada = 'Data inválida';
      if (!d.planos_especificos) req('viagem_duracao_dias');
      req('viagem_endereco_eua');
      req('viagem_cidade_destino');
      req('viagem_estado_eua', SELECT_REQ);
      req('viagem_pago_por', SELECT_REQ);
      if (d.viagem_pago_por === 'O' || d.viagem_pago_por === 'C') {
        req('pagador_nome');
        req('pagador_telefone');
        req('pagador_relacao');
        req('pagador_endereco');
      }
      break;
    }
    case 3: { // Acompanhantes
      if (d.tem_acompanhantes) {
        if (d.viaja_em_grupo) req('grupo_nome');
        else listReq('acompanhantes_lista', ['sobrenome', 'nome', 'relacao']);
      }
      break;
    }
    case 4: { // Viagens anteriores
      if (d.viagens_anteriores_eua) {
        listReq('visitas_anteriores', ['data_chegada']);
        if (d.carteira_motorista_eua) {
          req('carteira_motorista_numero');
          req('carteira_motorista_estado');
        }
      }
      if (d.visto_anterior) {
        req('visto_data_emissao');
        req('visto_numero');
        if (d.visto_perdido_roubado) req('visto_perdido_ano');
      }
      if (d.visto_perdido_roubado) req('visto_perdido_explicacao');
      if (d.visto_cancelado) req('visto_cancelado_explicacao');
      if (d.visto_negado) req('visto_negado_explicacao');
      if (d.peticao_imigrante) req('peticao_imigrante_explicacao');
      break;
    }
    case 5: { // Endereço e contato
      req('endereco_linha1');
      req('numero');
      req('cidade_residencia');
      req('estado_residencia');
      if (isEmpty(d.cep)) e.cep = REQUIRED;
      req('pais_residencia', SELECT_REQ);
      if (isEmpty(d.telefone)) e.telefone = REQUIRED;
      else if (onlyDigits(d.telefone).length < 10) e.telefone = 'Telefone inválido. Mínimo 10 dígitos';
      if (isEmpty(d.email)) e.email = REQUIRED;
      else if (!validEmail(d.email)) e.email = 'Digite um e-mail válido';
      if (d.endereco_postal_igual === false) {
        req('endereco_postal_linha1');
        req('endereco_postal_numero');
        req('endereco_postal_cidade');
        req('endereco_postal_estado');
        req('endereco_postal_cep');
        req('endereco_postal_pais', SELECT_REQ);
      }
      if (d.email_adicional) strListReq('email_adicional_lista', 'Adicione ao menos um e-mail', validEmail);
      if (d.telefone_adicional) strListReq('telefone_adicional_lista', 'Adicione ao menos um telefone', v => onlyDigits(v).length >= 10);
      if (!d.sem_redes_sociais) listReq('redes_sociais', ['plataforma', 'usuario']);
      break;
    }
    case 6: { // Passaporte
      req('passaporte_tipo', SELECT_REQ);
      req('passaporte_numero');
      req('passaporte_pais_emissor', SELECT_REQ);
      if (isEmpty(d.passaporte_data_emissao)) e.passaporte_data_emissao = REQUIRED;
      else if (!validDate(d.passaporte_data_emissao)) e.passaporte_data_emissao = 'Data inválida';
      if (isEmpty(d.passaporte_data_validade)) e.passaporte_data_validade = REQUIRED;
      else if (!validDate(d.passaporte_data_validade)) e.passaporte_data_validade = 'Data inválida';
      if (d.passaporte_perdido) {
        req('passaporte_perdido_numero');
        req('passaporte_perdido_pais', SELECT_REQ);
        req('passaporte_perdido_explicacao');
      }
      break;
    }
    case 7: { // Contato nos EUA
      req('contato_eua_nome');
      break;
    }
    case 8: { // Família (pais)
      if (!d.pai_nome_na) req('pai_nome');
      if (!d.mae_nome_na) req('mae_nome');
      if (d.pai_nos_eua) req('pai_status_eua', SELECT_REQ);
      if (d.mae_nos_eua) req('mae_status_eua', SELECT_REQ);
      if (d.parentes_nos_eua) listReq('parentes_lista', ['sobrenome', 'nome', 'relacao', 'status']);
      break;
    }
    case 9: { // Cônjuge
      const ec = d.estado_civil;
      if (ec === 'M' || ec === 'C' || ec === 'P' || ec === 'W') req('conjuge_nome');
      else if (ec === 'D') req('ex_conjuge_nome');
      break;
    }
    case 10: { // Trabalho atual
      req('status_profissional', SELECT_REQ);
      if (d.status_profissional === 'O') req('status_profissional_outro');
      {
        const occ = d.status_profissional;
        const isEstudante = occ === 'S';
        const isOutro = occ === 'O';
        const semEmpregador = OCUPACAO_SEM_EMPREGADOR.includes(occ);
        const mostraEmpregador = occ && !isEstudante && !isOutro && !semEmpregador;
        if (mostraEmpregador) {
          req('cargo');
          req('empresa_nome');
        } else if (isEstudante) {
          req('empresa_nome');
        }
      }
      break;
    }
    case 11: { // Trabalho/Educação anteriores
      if (d.tem_empregos_anteriores) listReq('empregos_anteriores', ['empresa', 'cargo', 'data_inicio']);
      if (d.educacao_adicional) {
        req('nivel_educacao');
        listReq('instituicoes', ['nome', 'curso']);
      }
      break;
    }
    case 12: { // Informações adicionais
      const idiomas: any[] = Array.isArray(d.idiomas) ? d.idiomas.filter((x: any) => !isEmpty(x)) : [];
      if (idiomas.length === 0) e['idiomas'] = 'Informe ao menos um idioma';
      if (d.clan_tribo) req('clan_tribo_nome');
      if (d.tem_paises_visitados) strListReq('paises_visitados', 'Adicione ao menos um país');
      if (d.pertence_organizacao) strListReq('organizacoes', 'Adicione ao menos uma organização');
      if (d.habilidades_especiais) req('habilidades_especiais_explicacao');
      if (d.servico_militar) {
        req('militar_pais', SELECT_REQ);
        req('militar_ramo');
        req('militar_data_inicio');
      }
      if (d.paramilitar) req('paramilitar_explicacao');
      break;
    }
    case 13: { // Antecedentes — opcional
      break;
    }
    case 14: { // Revisão e envio
      if (!d.declaracao_aceita) e.declaracao_aceita = 'Você precisa confirmar a declaração para enviar';
      break;
    }
  }
  return e;
}
