// Validação por etapa do formulário DS-160.
// Retorna um mapa { campoKey: mensagemDeErro }. Vazio = etapa válida.

const REQUIRED = 'Este campo é obrigatório';
const SELECT_REQ = 'Selecione uma opção';

type Errors = Record<string, string>;

const onlyDigits = (s: any) => String(s ?? '').replace(/\D/g, '');
const isEmpty = (v: any) => v === undefined || v === null || String(v).trim() === '';
const validEmail = (v: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? '').trim());
const validDate = (v: any) => {
  if (isEmpty(v)) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
};
const todayStr = () => new Date().toISOString().slice(0, 10);

const hasAnyField = (obj: Record<string, any>, keys: string[]) =>
  keys.some(k => !isEmpty(obj?.[k]));

export function validateStep(step: number, data: Record<string, any>): Errors {
  const e: Errors = {};
  const req = (key: string, msg = REQUIRED) => {
    if (isEmpty(data[key])) e[key] = msg;
  };

  switch (step) {
    case 0: { // Etapa 1 — Dados Pessoais
      req('sobrenome');
      req('nome');
      req('nome_completo_passaporte');
      if (isEmpty(data.cpf)) e.cpf = REQUIRED;
      else if (onlyDigits(data.cpf).length !== 11) e.cpf = 'CPF inválido. Digite apenas os 11 números';
      req('sexo', SELECT_REQ);
      req('estado_civil', SELECT_REQ);
      if (isEmpty(data.data_nascimento)) e.data_nascimento = REQUIRED;
      else if (!validDate(data.data_nascimento)) e.data_nascimento = 'Data inválida. Use o formato DD/MM/AAAA';
      else {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (new Date(data.data_nascimento) > oneYearAgo) e.data_nascimento = 'Data de nascimento inválida';
      }
      req('cidade_nascimento');
      req('estado_nascimento');
      req('pais_nascimento');
      if (data.outra_nacionalidade === 'Sim') req('pais_outra_nacionalidade', SELECT_REQ);
      if (data.usou_outro_nome === 'Sim') req('outro_nome');
      break;
    }
    case 1: { // Etapa 2 — Passaporte
      if (isEmpty(data.passaporte_numero)) e.passaporte_numero = REQUIRED;
      else if (String(data.passaporte_numero).trim().length < 5) e.passaporte_numero = 'Passaporte deve ter ao menos 5 caracteres';
      req('passaporte_pais_emissor', SELECT_REQ);
      req('passaporte_cidade_emissao');
      if (isEmpty(data.passaporte_data_emissao)) e.passaporte_data_emissao = REQUIRED;
      else if (!validDate(data.passaporte_data_emissao)) e.passaporte_data_emissao = 'Data inválida. Use o formato DD/MM/AAAA';
      else if (data.passaporte_data_emissao > todayStr()) e.passaporte_data_emissao = 'A data não pode ser no futuro';
      if (isEmpty(data.passaporte_data_expiracao)) e.passaporte_data_expiracao = REQUIRED;
      else if (!validDate(data.passaporte_data_expiracao)) e.passaporte_data_expiracao = 'Data inválida. Use o formato DD/MM/AAAA';
      else if (!isEmpty(data.passaporte_data_emissao) && data.passaporte_data_expiracao < data.passaporte_data_emissao)
        e.passaporte_data_expiracao = 'A data de expiração não pode ser anterior à emissão';
      if (data.passaporte_perdido === 'Sim') req('passaporte_perdido_numero');
      break;
    }
    case 2: { // Etapa 3 — Contatos
      if (isEmpty(data.contato_cep)) e.contato_cep = REQUIRED;
      else if (onlyDigits(data.contato_cep).length !== 8) e.contato_cep = 'CEP inválido. Digite os 8 números';
      req('contato_endereco');
      req('contato_numero');
      req('contato_bairro');
      req('contato_cidade');
      req('contato_estado');
      req('contato_pais');
      if (isEmpty(data.contato_telefone)) e.contato_telefone = REQUIRED;
      else if (onlyDigits(data.contato_telefone).length < 10) e.contato_telefone = 'Telefone inválido. Mínimo 10 dígitos';
      if (isEmpty(data.contato_email)) e.contato_email = REQUIRED;
      else if (!validEmail(data.contato_email)) e.contato_email = 'Digite um e-mail válido (ex: nome@email.com)';
      const redes: any[] = Array.isArray(data.redes_sociais) ? data.redes_sociais : [];
      redes.forEach((r, i) => { if (isEmpty(r)) e[`redes_sociais.${i}`] = REQUIRED; });
      break;
    }
    case 3: { // Etapa 4 — Viagem
      req('motivo_viagem', SELECT_REQ);
      if (isEmpty(data.data_ida)) e.data_ida = REQUIRED;
      else if (!validDate(data.data_ida)) e.data_ida = 'Data inválida. Use o formato DD/MM/AAAA';
      else if (data.data_ida < todayStr()) e.data_ida = 'A data não pode ser no passado';
      if (isEmpty(data.data_volta)) e.data_volta = REQUIRED;
      else if (!validDate(data.data_volta)) e.data_volta = 'Data inválida. Use o formato DD/MM/AAAA';
      else if (!isEmpty(data.data_ida) && data.data_volta < data.data_ida)
        e.data_volta = 'A data de volta não pode ser anterior à data de ida';
      if (isEmpty(data.duracao_viagem)) e.duracao_viagem = REQUIRED;
      else {
        const n = Number(data.duracao_viagem);
        if (!Number.isInteger(n) || n <= 0 || n > 365) e.duracao_viagem = 'Informe um número de dias válido (1 a 365)';
      }
      req('cidade_destino_eua');
      req('pagador_viagem', SELECT_REQ);
      if (data.pagador_viagem === 'Outra pessoa' || data.pagador_viagem === 'Outro') {
        req('pagador_nome');
        req('pagador_parentesco', SELECT_REQ);
        req('pagador_telefone');
      }
      if (data.pagador_viagem === 'Empresa') {
        req('pagador_empresa_nome');
        req('pagador_empresa_telefone');
      }
      if (data.visto_negado === 'Sim') req('visto_negado_ano');
      break;
    }
    case 4: { // Etapa 5 — Contato EUA
      if (data.possui_contato_eua === 'Tenho contato') {
        req('contato_eua_nome');
        req('contato_eua_relacao');
        req('contato_eua_telefone');
      }
      break;
    }
    case 5: { // Etapa 6 — Família
      req('pai_nome');
      req('mae_nome');
      const ec = data.estado_civil;
      if (ec === 'M' || ec === 'C' || ec === 'P') {
        req('conjuge_nome');
        req('conjuge_nascimento');
        req('conjuge_casamento_inicio');
      } else if (ec === 'D' || ec === 'L') {
        req('conjuge_nome');
        req('conjuge_casamento_inicio');
        req('conjuge_casamento_fim');
      } else if (ec === 'W') {
        req('conjuge_nome');
        req('conjuge_falecimento_data');
      }

      break;
    }
    case 6: { // Etapa 7 — Profissional
      req('status_profissional', SELECT_REQ);
      const s = data.status_profissional;
      if (s === 'Empregado Atualmente' || s === 'Autônomo' || s === 'Empresário') {
        req('empresa_atual');
        req('cargo_atual');
        req('empresa_data_inicio');
        req('empresa_endereco');
      } else if (s === 'Estudante') {
        req('empresa_atual');
        req('cargo_atual');
        req('empresa_data_inicio');
      } else if (s === 'Aposentado') {
        if (isEmpty(data.renda_mensal)) e.renda_mensal = REQUIRED;
        else if (Number(onlyDigits(data.renda_mensal)) <= 0) e.renda_mensal = 'Informe um valor válido';
      }
      req('idiomas');
      const empregos: any[] = Array.isArray(data.empregos_anteriores) ? data.empregos_anteriores : [];
      empregos.forEach((emp, i) => {
        if (hasAnyField(emp, ['empresa', 'cep', 'endereco', 'telefone', 'supervisor', 'cargo', 'inicio', 'termino', 'motivo_saida'])) {
          if (isEmpty(emp.empresa)) e[`empregos_anteriores.${i}.empresa`] = REQUIRED;
          if (isEmpty(emp.cargo)) e[`empregos_anteriores.${i}.cargo`] = REQUIRED;
          if (isEmpty(emp.inicio)) e[`empregos_anteriores.${i}.inicio`] = REQUIRED;
          if (isEmpty(emp.termino)) e[`empregos_anteriores.${i}.termino`] = REQUIRED;
        }
      });
      break;
    }
    case 7: { // Etapa 8 — Acadêmico
      const formacoes: any[] = Array.isArray(data.formacoes) ? data.formacoes : [];
      formacoes.forEach((f, i) => {
        if (hasAnyField(f, ['instituicao', 'cep', 'endereco', 'telefone', 'curso', 'inicio', 'termino'])) {
          if (isEmpty(f.instituicao)) e[`formacoes.${i}.instituicao`] = REQUIRED;
          if (isEmpty(f.curso)) e[`formacoes.${i}.curso`] = REQUIRED;
        }
      });
      break;
    }
    case 8: { // Etapa 9 — Viagens e Atividades
      if (data.serviu_forcas_armadas === 'Sim') {
        req('militar_pais');
        req('militar_ramo');
        req('militar_inicio');
        req('militar_saida');
      }
      if (data.habilidades_armas === 'Sim') req('habilidades_armas_descricao');
      break;
    }
    case 9: { // Etapa 10 — Segurança
      const keys = [
        'doenca_contagiosa','transtorno_mental','dependente_drogas','preso_condenado','trafico_drogas',
        'lavagem_dinheiro','prostituicao','trafico_pessoas','auxilio_trafico_pessoas','atividade_terrorista',
        'apoio_terrorismo','membro_org_terrorista','genocidio','tortura','violencia_extrajudicial',
        'crianca_soldado','violou_liberdade_religiosa','controle_populacional','transplante_orgaos',
        'visto_cancelado','deportacao','fraude','excedeu_prazo','esta_negado',
        'renunciou_cidadania_impostos','violou_guarda_criancas','votou_ilegalmente',
      ];
      keys.forEach(k => {
        if (data[`seg_${k}`] === 'Sim' && isEmpty(data[`seg_${k}_explicacao`]))
          e[`seg_${k}_explicacao`] = REQUIRED;
      });
      break;
    }
    case 10: { // Etapa 11 — Declaração
      if (!data.declaracao_aceita) e.declaracao_aceita = 'Você precisa confirmar a declaração para enviar';
      break;
    }
  }
  return e;
}
