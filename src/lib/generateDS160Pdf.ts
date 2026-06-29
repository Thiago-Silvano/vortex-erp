import jsPDF from 'jspdf';

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

const SECTIONS = [
  { title: '1. Dados Pessoais', fields: [
    ['Sobrenome', 'sobrenome'], ['Nome', 'nome'], ['Nome Completo (Passaporte)', 'nome_completo_passaporte'],
    ['Usou Outro Nome', 'usou_outro_nome'], ['Outro Nome', 'outro_nome'],
    ['CPF', 'cpf'], ['Sexo', 'sexo'], ['Estado Civil', 'estado_civil'], ['Data de Nascimento', 'data_nascimento'],
    ['Cidade de Nascimento', 'cidade_nascimento'], ['Estado de Nascimento', 'estado_nascimento'],
    ['País de Nascimento', 'pais_nascimento'], ['Nacionalidade', 'nacionalidade'],
    ['Outra Nacionalidade', 'outra_nacionalidade'],
    ['País da Outra Nacionalidade', 'pais_outra_nacionalidade'], ['ID Outra Nacionalidade', 'id_outra_nacionalidade'],
  ]},
  { title: '2. Informações de Passaporte', fields: [
    ['Nº Passaporte', 'passaporte_numero'], ['País Emissor', 'passaporte_pais_emissor'],
    ['Cidade de Emissão', 'passaporte_cidade_emissao'], ['Data de Emissão', 'passaporte_data_emissao'],
    ['Estado/Província de Emissão', 'passaporte_estado_emissao'],
    ['Data de Expiração', 'passaporte_data_expiracao'], ['Passaporte Perdido/Roubado', 'passaporte_perdido_roubado'],
    ['Passaporte Perdido/Roubado', 'passaporte_perdido'],
    ['Nº do Passaporte Perdido', 'passaporte_perdido_numero'], ['País Emissor (Perdido)', 'passaporte_perdido_pais'],
  ]},
  { title: '3. Contatos', fields: [
    ['CEP', 'contato_cep'], ['Endereço', 'contato_endereco'], ['Número/Complemento', 'contato_numero'],
    ['Bairro', 'contato_bairro'], ['Cidade', 'contato_cidade'], ['Estado', 'contato_estado'],
    ['País', 'contato_pais'], ['Telefone', 'contato_telefone'], ['Email', 'contato_email'],
    ['Telefone Residencial', 'contato_telefone_residencial'], ['Telefone Comercial', 'contato_telefone_comercial'],
  ]},
  { title: '4. Detalhes da Viagem', fields: [
    ['Motivo da Viagem', 'motivo_viagem'], ['Data de Ida', 'data_ida'], ['Data de Volta', 'data_volta'],
    ['Duração (dias)', 'duracao_viagem'], ['Cidade Destino EUA', 'cidade_destino_eua'],
    ['Hospedagem', 'local_hospedagem'], ['Pagador', 'pagador_viagem'],
    ['Nome do Pagador', 'pagador_nome'], ['Parentesco do Pagador', 'pagador_parentesco'],
    ['Endereço do Pagador', 'pagador_endereco'],
    ['Email do Pagador', 'pagador_email'], ['Telefone do Pagador', 'pagador_telefone'],
    ['Empresa Pagadora', 'pagador_empresa_nome'], ['Endereço da Empresa Pagadora', 'pagador_empresa_endereco'],
    ['Email da Empresa Pagadora', 'pagador_empresa_email'], ['Telefone da Empresa Pagadora', 'pagador_empresa_telefone'],
    ['Histórico Viagens EUA', 'historico_viagens_eua_tipo'],
    ['Histórico Viagens EUA (legado)', 'historico_viagens_eua'], ['Já teve visto americano', 'ja_teve_visto'],
    ['Nº Visto Anterior', 'visto_anterior_numero'], ['Consulado Emissor', 'visto_anterior_consulado'],
    ['Visto Anterior - Emissão', 'visto_anterior_emissao'], ['Visto Anterior - Validade', 'visto_anterior_validade'],
    ['Visto Anterior - Ainda Válido', 'visto_anterior_valido'], ['Visto Anterior - Cancelado/Revogado', 'visto_anterior_cancelado'],
    ['Explicação do Cancelamento', 'visto_anterior_cancelado_explicacao'],
    ['Visto Negado', 'visto_negado'], ['Ano da Negativa', 'visto_negado_ano'],
    ['Tipo de Visto Solicitado', 'visto_negado_tipo'], ['Motivo do Consulado', 'visto_negado_motivo'],
    ['Explicação da Negativa', 'visto_negado_explicacao'],
    ['Petição de Imigração Negada', 'peticao_imigracao_negada'], ['Explicação (Petição)', 'peticao_imigracao_negada_explicacao'],
  ]},
  { title: '5. Contato nos EUA', fields: [
    ['Possui Contato nos EUA', 'possui_contato_eua'],
    ['Nome', 'contato_eua_nome'], ['Organização/Empresa/Hotel', 'contato_eua_organizacao'], ['Relação', 'contato_eua_relacao'],
    ['Telefone', 'contato_eua_telefone'], ['Email', 'contato_eua_email'], ['Endereço', 'contato_eua_endereco'],
  ]},
  { title: '6. Informações de Família', fields: [
    ['Nome do Pai', 'pai_nome'], ['Nascimento do Pai', 'pai_nascimento'],
    ['Pai mora nos EUA', 'pai_mora_eua'],
    ['Nome da Mãe', 'mae_nome'], ['Nascimento da Mãe', 'mae_nascimento'],
    ['Mãe mora nos EUA', 'mae_mora_eua'],
    ['Parentes nos EUA', 'parentes_eua'],
    ['Nome do Cônjuge', 'conjuge_nome'], ['Nascimento Cônjuge', 'conjuge_nascimento'],
    ['Cidade Nascimento Cônjuge', 'conjuge_cidade_nascimento'],
    ['País Nascimento Cônjuge', 'conjuge_pais_nascimento'],
    ['Início do Casamento', 'conjuge_casamento_inicio'], ['Fim do Casamento/Divórcio', 'conjuge_casamento_fim'],
    ['Detalhes do Divórcio', 'conjuge_divorcio'],
    ['Detalhes do Falecimento', 'conjuge_falecimento'], ['Data Falecimento Cônjuge', 'conjuge_falecimento_data'],
  ]},
  { title: '7. Histórico Profissional', fields: [
    ['Status Profissional', 'status_profissional'], ['Empresa/Instituição Atual', 'empresa_atual'],
    ['Cargo/Função/Curso', 'cargo_atual'], ['Renda Mensal (BRL)', 'renda_mensal'],
    ['CEP da Empresa', 'empresa_cep'], ['Endereço da Empresa', 'empresa_endereco'],
    ['Telefone da Empresa', 'empresa_telefone'],
    ['Data de Início', 'empresa_data_inicio'], ['Idiomas', 'idiomas'],
    ['Descrição das Funções', 'descricao_funcoes'],
  ]},
  { title: '8. Histórico Acadêmico', fields: [] },
  { title: '9. Viagens e Atividades', fields: [
    ['Organizações', 'organizacoes'],
    ['Serviu nas Forças Armadas', 'serviu_forcas_armadas'],
    ['País das Forças Armadas', 'militar_pais'], ['Ramo', 'militar_ramo'],
    ['Posto/Graduação', 'militar_posto'], ['Especialidade/Função', 'militar_especialidade'],
    ['Início (Militar)', 'militar_inicio'], ['Saída (Militar)', 'militar_saida'],
    ['Serviu em Paramilitar/Guerrilha', 'serviu_paramilitar'], ['Explicação (Paramilitar)', 'serviu_paramilitar_explicacao'],
    ['Habilidades com Armas/Explosivos', 'habilidades_armas'], ['Descrição (Habilidades)', 'habilidades_armas_descricao'],
  ]},
  { title: '10. Segurança e Antecedentes', fields: [
    ['Doença Contagiosa', 'seg_doenca_contagiosa'], ['Explicação Doença', 'seg_doenca_contagiosa_explicacao'],
    ['Transtorno Mental/Comportamental', 'seg_transtorno_mental'], ['Explicação', 'seg_transtorno_mental_explicacao'],
    ['Dependência de Drogas/Álcool', 'seg_dependente_drogas'], ['Explicação', 'seg_dependente_drogas_explicacao'],
    ['Preso/Condenado', 'seg_preso_condenado'], ['Explicação Crime', 'seg_preso_condenado_explicacao'],
    ['Tráfico de Drogas', 'seg_trafico_drogas'], ['Explicação', 'seg_trafico_drogas_explicacao'],
    ['Lavagem de Dinheiro', 'seg_lavagem_dinheiro'], ['Explicação', 'seg_lavagem_dinheiro_explicacao'],
    ['Prostituição', 'seg_prostituicao'], ['Explicação', 'seg_prostituicao_explicacao'],
    ['Tráfico de Pessoas', 'seg_trafico_pessoas'], ['Explicação', 'seg_trafico_pessoas_explicacao'],
    ['Auxílio ao Tráfico de Pessoas', 'seg_auxilio_trafico_pessoas'], ['Explicação', 'seg_auxilio_trafico_pessoas_explicacao'],
    ['Atividade Terrorista', 'seg_atividade_terrorista'], ['Explicação', 'seg_atividade_terrorista_explicacao'],
    ['Apoio a Terrorismo', 'seg_apoio_terrorismo'], ['Explicação', 'seg_apoio_terrorismo_explicacao'],
    ['Membro de Org. Terrorista', 'seg_membro_org_terrorista'], ['Explicação', 'seg_membro_org_terrorista_explicacao'],
    ['Genocídio', 'seg_genocidio'], ['Explicação', 'seg_genocidio_explicacao'],
    ['Tortura', 'seg_tortura'], ['Explicação', 'seg_tortura_explicacao'],
    ['Violência Extrajudicial', 'seg_violencia_extrajudicial'], ['Explicação', 'seg_violencia_extrajudicial_explicacao'],
    ['Crianças como Soldados', 'seg_crianca_soldado'], ['Explicação', 'seg_crianca_soldado_explicacao'],
    ['Violou Liberdade Religiosa', 'seg_violou_liberdade_religiosa'], ['Explicação', 'seg_violou_liberdade_religiosa_explicacao'],
    ['Controle Populacional Coercitivo', 'seg_controle_populacional'], ['Explicação', 'seg_controle_populacional_explicacao'],
    ['Transplante de Órgãos Coercitivo', 'seg_transplante_orgaos'], ['Explicação', 'seg_transplante_orgaos_explicacao'],
    ['Visto Cancelado', 'seg_visto_cancelado'], ['Explicação Cancelamento', 'seg_visto_cancelado_explicacao'],
    ['Deportação', 'seg_deportacao'], ['Explicação Deportação', 'seg_deportacao_explicacao'],
    ['Fraude', 'seg_fraude'], ['Explicação Fraude', 'seg_fraude_explicacao'],
    ['Excedeu Prazo', 'seg_excedeu_prazo'], ['Explicação Prazo', 'seg_excedeu_prazo_explicacao'],
    ['ESTA Negado', 'seg_esta_negado'], ['Explicação ESTA', 'seg_esta_negado_explicacao'],
    ['Renunciou Cidadania (Impostos)', 'seg_renunciou_cidadania_impostos'], ['Explicação', 'seg_renunciou_cidadania_impostos_explicacao'],
    ['Violou Guarda de Crianças', 'seg_violou_guarda_criancas'], ['Explicação', 'seg_violou_guarda_criancas_explicacao'],
    ['Votou Ilegalmente nos EUA', 'seg_votou_ilegalmente'], ['Explicação', 'seg_votou_ilegalmente_explicacao'],
  ]},
  { title: '11. Declaração Final', fields: [
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

      const valStr = sanitize(String(value));
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
      const socials = sanitize(formData.redes_sociais.join(', '));
      const lines = doc.splitTextToSize(socials, pageW - 80);
      doc.text(lines, 70, y);
      y += Math.max(lines.length * 4, 6);
    }

    y += 5;
  }

  doc.save(`DS160_${sanitize(clientName).replace(/\s+/g, '_')}.pdf`);
}
