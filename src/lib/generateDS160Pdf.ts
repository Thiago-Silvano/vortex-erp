import jsPDF from 'jspdf';
import { ESTADO_CIVIL_OPTIONS } from '@/components/ds160/types';


const sanitize = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2192/g, '->')
    .replace(/[^\x00-\xFF]/g, '');
};

const formatValue = (key: string, value: any): string => {
  if (key === 'estado_civil') {
    const opt = ESTADO_CIVIL_OPTIONS.find(o => o.code === String(value));
    return opt ? `${opt.label} (${opt.code})` : String(value);
  }
  return String(value);
};

const SECTIONS = [
  { title: '1. Dados Pessoais', fields: [
    ['Sobrenome', 'sobrenome'], ['Nome', 'nome'], ['Nome Completo (Passaporte)', 'nome_completo'],
    ['Nome no Idioma Nativo', 'nome_nativo'], ['Sexo', 'sexo'],
    ['Estado Civil', 'estado_civil'], ['Estado Civil (Outro)', 'estado_civil_outro'],
    ['Data de Nascimento', 'data_nascimento'], ['Cidade de Nascimento', 'cidade_nascimento'],
    ['Estado de Nascimento', 'estado_nascimento'], ['País de Nascimento', 'pais_nascimento'],
    ['Já usou outros nomes', 'outros_nomes'], ['Outros Nomes', 'outros_nomes_lista'],
  ]},
  { title: '2. Nacionalidade e Documentos', fields: [
    ['Nacionalidade', 'nacionalidade'], ['CPF', 'cpf'],
    ['Outra Nacionalidade', 'outra_nacionalidade'], ['País da Outra Nacionalidade', 'outra_nacionalidade_pais'],
    ['Tem Passaporte (Outra Nac.)', 'outra_nacionalidade_tem_passaporte'], ['Nº Passaporte (Outra Nac.)', 'outra_nacionalidade_passaporte'],
    ['Residente de Outro País', 'residente_outro_pais'], ['Qual País', 'residente_outro_pais_qual'],
    ['SSN (EUA)', 'ssn_eua'], ['Tax ID (EUA)', 'tax_id_eua'],
  ]},
  { title: '3. Viagem', fields: [
    ['Propósito da Viagem', 'proposito'], ['Data de Chegada', 'viagem_data_chegada'],
    ['Duração (dias)', 'viagem_duracao_dias'], ['Cidade de Destino', 'viagem_cidade_destino'],
    ['Endereço nos EUA', 'viagem_endereco_eua'], ['Estado nos EUA', 'viagem_estado_eua'],
    ['CEP (ZIP) nos EUA', 'viagem_cep_eua'], ['Hospedagem', 'viagem_hospedagem'],
    ['Voo / Itinerário', 'viagem_voo'], ['Planos Específicos', 'planos_especificos'],
    ['Pago Por', 'viagem_pago_por'], ['Nome do Pagador', 'pagador_nome'],
    ['Relação do Pagador', 'pagador_relacao'], ['Telefone do Pagador', 'pagador_telefone'],
    ['Email do Pagador', 'pagador_email'], ['Endereço do Pagador', 'pagador_endereco'],
  ]},
  { title: '4. Companheiros de Viagem', fields: [
    ['Viaja em Grupo', 'viaja_em_grupo'], ['Nome do Grupo', 'grupo_nome'],
    ['Tem Acompanhantes', 'tem_acompanhantes'],
  ]},
  { title: '5. Viagens Anteriores aos EUA', fields: [
    ['Já Esteve nos EUA', 'viagens_anteriores_eua'], ['Visitas Anteriores', 'visitas_anteriores'],
    ['Já Teve Visto Americano', 'visto_anterior'], ['Nº do Visto', 'visto_numero'],
    ['Data de Emissão do Visto', 'visto_data_emissao'], ['Mesmo Tipo de Visto', 'visto_mesmo_tipo'],
    ['Mesmo Local', 'visto_mesmo_local'], ['Forneceu 10 Digitais', 'visto_dez_digitais'],
    ['Visto Perdido/Roubado', 'visto_perdido_roubado'], ['Ano (Perdido)', 'visto_perdido_ano'],
    ['Explicação (Perdido)', 'visto_perdido_explicacao'], ['Visto Cancelado/Revogado', 'visto_cancelado'],
    ['Explicação (Cancelado)', 'visto_cancelado_explicacao'], ['Visto Negado', 'visto_negado'],
    ['Explicação (Negado)', 'visto_negado_explicacao'], ['Petição de Imigração', 'peticao_imigrante'],
    ['Explicação (Petição)', 'peticao_imigrante_explicacao'], ['Carteira de Motorista EUA', 'carteira_motorista_eua'],
    ['Nº da Carteira', 'carteira_motorista_numero'], ['Estado da Carteira', 'carteira_motorista_estado'],
  ]},
  { title: '6. Endereço, Contato e Redes Sociais', fields: [
    ['Logradouro', 'endereco_linha1'], ['Número', 'numero'], ['Complemento', 'endereco_linha2'],
    ['País', 'pais_residencia'], ['CEP', 'cep'], ['Estado', 'estado_residencia'], ['Cidade', 'cidade_residencia'],
    ['Correspondência igual à residência', 'endereco_postal_igual'],
    ['Logradouro (Correspondência)', 'endereco_postal_linha1'], ['Número (Correspondência)', 'endereco_postal_numero'],
    ['Cidade (Correspondência)', 'endereco_postal_cidade'], ['Estado (Correspondência)', 'endereco_postal_estado'],
    ['CEP (Correspondência)', 'endereco_postal_cep'], ['País (Correspondência)', 'endereco_postal_pais'],
    ['Telefone Principal', 'telefone'], ['Telefone Secundário', 'telefone_secundario'],
    ['Telefone do Trabalho', 'telefone_trabalho'], ['Email', 'email'],
    ['Emails Adicionais', 'email_adicional_lista'], ['Telefones Adicionais', 'telefone_adicional_lista'],
  ]},
  { title: '7. Passaporte', fields: [
    ['Tipo de Passaporte', 'passaporte_tipo'], ['Nº do Passaporte', 'passaporte_numero'],
    ['Nº do Livro', 'passaporte_livro_numero'], ['País Emissor', 'passaporte_pais_emissor'],
    ['Cidade de Emissão', 'passaporte_cidade_emissao'], ['Estado de Emissão', 'passaporte_estado_emissao'],
    ['País de Emissão', 'passaporte_pais_emissao'], ['Data de Emissão', 'passaporte_data_emissao'],
    ['Data de Validade', 'passaporte_data_validade'], ['Passaporte Perdido/Roubado', 'passaporte_perdido'],
    ['Nº (Perdido)', 'passaporte_perdido_numero'], ['País (Perdido)', 'passaporte_perdido_pais'],
    ['Explicação (Perdido)', 'passaporte_perdido_explicacao'],
  ]},
  { title: '8. Contato nos EUA', fields: [
    ['Tipo de Contato', 'contato_eua_tipo'], ['Nome', 'contato_eua_nome'], ['Relação', 'contato_eua_relacao'],
    ['Endereço', 'contato_eua_endereco'], ['Cidade', 'contato_eua_cidade'], ['Estado', 'contato_eua_estado'],
    ['CEP (ZIP)', 'contato_eua_cep'], ['Telefone', 'contato_eua_telefone'], ['Email', 'contato_eua_email'],
  ]},
  { title: '9. Família (Pais)', fields: [
    ['Nome do Pai', 'pai_nome'], ['Nascimento do Pai', 'pai_nascimento'],
    ['Pai mora nos EUA', 'pai_nos_eua'], ['Status do Pai (EUA)', 'pai_status_eua'],
    ['Nome da Mãe', 'mae_nome'], ['Nascimento da Mãe', 'mae_nascimento'],
    ['Mãe mora nos EUA', 'mae_nos_eua'], ['Status da Mãe (EUA)', 'mae_status_eua'],
    ['Tem Parentes nos EUA', 'parentes_nos_eua'], ['Parentes', 'parentes_lista'],
  ]},
  { title: '10. Cônjuge', fields: [
    ['Nome do Cônjuge', 'conjuge_nome'], ['Nascimento', 'conjuge_nascimento'],
    ['Nacionalidade', 'conjuge_nacionalidade'], ['Cidade de Nascimento', 'conjuge_cidade_nascimento'],
    ['País de Nascimento', 'conjuge_pais_nascimento'], ['Endereço', 'conjuge_endereco_tipo'],
    ['Início do Casamento', 'casamento_inicio'], ['Fim do Casamento', 'casamento_fim'],
    ['Como Terminou', 'casamento_como_terminou'], ['País do Término', 'casamento_pais_termino'],
    ['Nº de Ex-Cônjuges', 'num_ex_conjuges'], ['Nome do Ex-Cônjuge', 'ex_conjuge_nome'],
    ['Nascimento Ex-Cônjuge', 'ex_conjuge_nascimento'], ['Nacionalidade Ex-Cônjuge', 'ex_conjuge_nacionalidade'],
    ['Cidade Nasc. Ex-Cônjuge', 'ex_conjuge_cidade_nascimento'], ['País Nasc. Ex-Cônjuge', 'ex_conjuge_pais_nascimento'],
  ]},
  { title: '11. Trabalho Atual', fields: [
    ['Status Profissional', 'status_profissional'], ['Status (Outro)', 'status_profissional_outro'],
    ['Empresa/Instituição', 'empresa_nome'], ['Cargo/Função', 'cargo'],
    ['Descrição das Funções', 'descricao_funcoes'], ['Renda Mensal (BRL)', 'renda_mensal'],
    ['Endereço da Empresa', 'empresa_endereco'], ['Cidade da Empresa', 'empresa_cidade'],
    ['Telefone da Empresa', 'empresa_telefone'], ['Data de Admissão', 'data_admissao'],
  ]},
  { title: '12. Trabalho e Educação Anteriores', fields: [
    ['Tem Empregos Anteriores', 'tem_empregos_anteriores'],
    ['Nível de Educação', 'nivel_educacao'], ['Educação Adicional', 'educacao_adicional'],
  ]},
  { title: '13. Informações Adicionais', fields: [
    ['Idiomas', 'idiomas'], ['Pertence a Organização', 'pertence_organizacao'], ['Organizações', 'organizacoes'],
    ['Visitou Outros Países', 'tem_paises_visitados'],
    ['Prestou Serviço Militar', 'servico_militar'], ['País (Militar)', 'militar_pais'],
    ['Ramo (Militar)', 'militar_ramo'], ['Posto (Militar)', 'militar_posto'],
    ['Especialidade (Militar)', 'militar_especialidade'], ['Início (Militar)', 'militar_data_inicio'],
    ['Fim (Militar)', 'militar_data_fim'], ['Paramilitar/Guerrilha', 'paramilitar'],
    ['Explicação (Paramilitar)', 'paramilitar_explicacao'], ['Pertence a Clã/Tribo', 'clan_tribo'],
    ['Nome do Clã/Tribo', 'clan_tribo_nome'], ['Habilidades Especiais', 'habilidades_especiais'],
    ['Explicação (Habilidades)', 'habilidades_especiais_explicacao'],
  ]},
  { title: '14. Antecedentes / Declarações', fields: [
    ['Preso/Condenado por Crime', 'crime'], ['Lavagem de Dinheiro', 'lavagem_dinheiro'],
    ['Tráfico de Pessoas', 'trafico_pessoas'], ['Atividade Terrorista', 'terrorismo'],
    ['Genocídio', 'genocidio'], ['Tortura', 'tortura'], ['Deportado', 'deportado'],
  ]},
  { title: '15. Revisão e Envio', fields: [
    ['Declaração Aceita', 'declaracao_aceita'],
  ]},
];

export function generateDS160Pdf(formData: Record<string, any>, clientName: string) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('VORTEX VISTOS', 15, 15);
  doc.setFontSize(11);
  doc.text('Formulario DS-160', 15, 22);
  doc.setFontSize(9);
  doc.text(sanitize(`Cliente: ${clientName}`), 15, 29);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageW - 60, 29);

  y = 45;
  doc.setTextColor(0, 0, 0);

  for (const section of SECTIONS) {
    checkPage(20);
    // Section title
    doc.setFillColor(240, 245, 255);
    doc.rect(10, y - 4, pageW - 20, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitize(section.title), 15, y + 1);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const [label, key] of section.fields) {
      // Sub-section separators (key starts with __sep)
      if (typeof key === 'string' && key.startsWith('__sep')) {
        checkPage(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 90, 140);
        doc.text(sanitize(label), 15, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        y += 6;
        continue;
      }

      let value = formData[key];
      if (value === undefined || value === null || value === '') continue;
      if (typeof value === 'boolean') value = value ? 'Sim' : 'Nao';
      if (Array.isArray(value)) {
        value = value.map((it: any) =>
          it && typeof it === 'object'
            ? Object.values(it).filter(Boolean).join(' - ')
            : String(it)
        ).join('; ');
      }

      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitize(label) + ':', 15, y);
      doc.setFont('helvetica', 'normal');

      const valStr = sanitize(formatValue(String(key), value));
      const lines = doc.splitTextToSize(valStr, pageW - 80);
      doc.text(lines, 70, y);
      y += Math.max(lines.length * 4, 6);
    }

    // Special: companions in section 4
    if (section.title.includes('4.') && Array.isArray(formData.acompanhantes) && formData.acompanhantes.length) {
      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Acompanhantes:', 15, y);
      doc.setFont('helvetica', 'normal');
      const list = formData.acompanhantes
        .map((a: any) => `${a.nome || ''}${a.parentesco ? ` (${a.parentesco})` : ''}`)
        .join('; ');
      const lines = doc.splitTextToSize(sanitize(list), pageW - 80);
      doc.text(lines, 70, y);
      y += Math.max(lines.length * 4, 6);
    }

    // Special: visitas aos EUA in section 4
    if (section.title.includes('4.') && Array.isArray(formData.visitas_eua) && formData.visitas_eua.length) {
      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Visitas aos EUA:', 15, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
      for (const v of formData.visitas_eua) {
        if (!v || (!v.data_chegada && !v.duracao)) continue;
        checkPage(6);
        const txt = `${v.data_chegada || 'Nao informado'} - ${v.duracao || 'Nao informado'}`;
        doc.text(sanitize(txt), 20, y);
        y += 5;
      }
    }

    // Special: empregos anteriores in section 7
    if (section.title.includes('7.')) {
      let empregos: any[] = Array.isArray(formData.empregos_anteriores) ? formData.empregos_anteriores : [];
      if (!empregos.length) {
        for (const n of [1, 2]) {
          if (formData[`emprego_anterior_${n}_empresa`] || formData[`emprego_anterior_${n}_endereco`]) {
            empregos.push({
              empresa: formData[`emprego_anterior_${n}_empresa`], cep: formData[`emprego_anterior_${n}_cep`],
              endereco: formData[`emprego_anterior_${n}_endereco`], telefone: formData[`emprego_anterior_${n}_telefone`],
              supervisor: formData[`emprego_anterior_${n}_supervisor`], cargo: formData[`emprego_anterior_${n}_cargo`],
              inicio: formData[`emprego_anterior_${n}_inicio`], termino: formData[`emprego_anterior_${n}_termino`],
            });
          }
        }
      }
      empregos = empregos.filter((e: any) => e && Object.values(e).some(Boolean));
      empregos.forEach((e: any, i: number) => {
        checkPage(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 90, 140);
        doc.text(sanitize(`- Emprego Anterior #${i + 1} -`), 15, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        y += 5;
        const parts = [
          ['Empresa', e.empresa], ['CEP', e.cep], ['Endereco', e.endereco], ['Telefone', e.telefone],
          ['Supervisor', e.supervisor], ['Cargo', e.cargo], ['Inicio', e.inicio], ['Termino', e.termino],
          ['Motivo de Saida', e.motivo_saida], ['Descricao das Funcoes', e.descricao_funcoes],
        ];
        for (const [lbl, val] of parts) {
          if (!val) continue;
          checkPage(6);
          doc.setFont('helvetica', 'bold');
          doc.text(sanitize(String(lbl)) + ':', 20, y);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(sanitize(String(val)), pageW - 85);
          doc.text(lines, 75, y);
          y += Math.max(lines.length * 4, 5);
        }
      });
    }

    // Special: formacoes in section 8
    if (section.title.includes('8.')) {
      let formacoes: any[] = Array.isArray(formData.formacoes) ? formData.formacoes : [];
      if (!formacoes.length) {
        for (const n of [1, 2, 3]) {
          if (formData[`formacao_${n}_instituicao`] || formData[`formacao_${n}_curso`]) {
            formacoes.push({
              instituicao: formData[`formacao_${n}_instituicao`], cep: formData[`formacao_${n}_cep`],
              endereco: formData[`formacao_${n}_endereco`], telefone: formData[`formacao_${n}_telefone`],
              curso: formData[`formacao_${n}_curso`], pais: 'Brasil',
              inicio: formData[`formacao_${n}_inicio`], termino: formData[`formacao_${n}_termino`],
            });
          }
        }
      }
      formacoes = formacoes.filter((f: any) => f && Object.values(f).some(Boolean));
      formacoes.forEach((f: any, i: number) => {
        checkPage(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 90, 140);
        doc.text(sanitize(`- Formacao #${i + 1} -`), 15, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        y += 5;
        const parts = [
          ['Instituicao', f.instituicao], ['Pais', f.pais], ['CEP', f.cep], ['Endereco', f.endereco],
          ['Telefone', f.telefone], ['Curso', f.curso], ['Inicio', f.inicio], ['Termino', f.termino],
        ];
        for (const [lbl, val] of parts) {
          if (!val) continue;
          checkPage(6);
          doc.setFont('helvetica', 'bold');
          doc.text(sanitize(String(lbl)) + ':', 20, y);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(sanitize(String(val)), pageW - 85);
          doc.text(lines, 75, y);
          y += Math.max(lines.length * 4, 5);
        }
      });
    }

    // Special: countries visited in section 9
    if (section.title.includes('9.') && formData.paises_visitados?.length) {
      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Paises visitados:', 15, y);
      doc.setFont('helvetica', 'normal');
      const countries = sanitize(formData.paises_visitados.join(', '));
      const lines = doc.splitTextToSize(countries, pageW - 80);
      doc.text(lines, 70, y);
      y += Math.max(lines.length * 4, 6);
    }

    // Special: social media in section 3
    if (section.title.includes('3.') && formData.redes_sociais?.length) {
      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Redes Sociais:', 15, y);
      doc.setFont('helvetica', 'normal');
      const socials = sanitize(
        formData.redes_sociais
          .map((s: any) => (typeof s === 'string' ? s : `${s.plataforma}: ${s.usuario}`))
          .join(', '),
      );
      const lines = doc.splitTextToSize(socials, pageW - 80);
      doc.text(lines, 70, y);
      y += Math.max(lines.length * 4, 6);
    }

    y += 5;
  }

  doc.save(`DS160_${sanitize(clientName).replace(/\s+/g, '_')}.pdf`);
}
