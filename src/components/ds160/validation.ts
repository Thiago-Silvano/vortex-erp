// Validação por etapa do formulário DS-160 (15 etapas).
// Retorna um mapa { campoKey: mensagemDeErro }. Vazio = etapa válida.

const REQUIRED = 'Este campo é obrigatório';
const SELECT_REQ = 'Selecione uma opção';

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
      break;
    }
    case 1: { // Nacionalidade e documentos
      req('nacionalidade', SELECT_REQ);
      if (!d.cpf_na) {
        if (isEmpty(d.cpf)) e.cpf = REQUIRED;
        else if (onlyDigits(d.cpf).length !== 11) e.cpf = 'CPF inválido. Digite os 11 números';
      }
      if (d.outra_nacionalidade) req('outra_nacionalidade_pais', SELECT_REQ);
      if (d.residente_outro_pais) req('residente_outro_pais_qual', SELECT_REQ);
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
      if (d.viagem_pago_por === 'O' || d.viagem_pago_por === 'C') req('pagador_nome');
      break;
    }
    case 3: { // Acompanhantes
      if (d.tem_acompanhantes) {
        if (d.viaja_em_grupo) req('grupo_nome');
      }
      break;
    }
    case 4: { // Viagens anteriores
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
      break;
    }
    case 7: { // Contato nos EUA
      req('contato_eua_nome');
      break;
    }
    case 8: { // Família (pais)
      if (!d.pai_nome_na) req('pai_nome');
      if (!d.mae_nome_na) req('mae_nome');
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
      break;
    }
    case 11: { // Trabalho/Educação anteriores — sem obrigatórios fixos
      break;
    }
    case 12: { // Informações adicionais
      const idiomas: any[] = Array.isArray(d.idiomas) ? d.idiomas.filter((x: any) => !isEmpty(x)) : [];
      if (idiomas.length === 0) e['idiomas'] = 'Informe ao menos um idioma';
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
