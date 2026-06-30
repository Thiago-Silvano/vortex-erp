# Reescrita completa do Formulário DS-160 (15 etapas)

Objetivo: padronizar o formulário de coleta DS-160 (preenchido pelo cliente em PT-BR) e o editor interno, cobrindo **todos** os campos, condicionais e tabelas do prompt, mantendo a integração com o robô.

## Arquitetura atual (o que existe hoje)
- `DS160PublicPage.tsx`: wizard de **11 etapas** (contagem fixa), autosave via RPC, validação por índice, navegação com "etapa máxima alcançável".
- `src/components/ds160/DS160Step1..11.tsx`: cada etapa recebe `{ data, onChange, errors }`.
- `validation.ts`: `validateStep(idx, formData)` retorna erros por etapa.
- `types.ts`: constantes `COUNTRIES`, `ESTADO_CIVIL_OPTIONS`, `REDES_SOCIAIS_OPTIONS`.
- `ds160-mapper.ts`: transforma `form_data` no JSON do robô (`montarDadosDS160`). Hoje cobre um **subconjunto** das chaves do prompt.
- `DS160Section.tsx` / `DS160EditDialog.tsx`: edição interna; o disparo do robô usa `mapearDadosDS160(form_data)` (ou o `json_override` quando existe).

## Decisão de integração importante
O robô recebe a **saída do mapper**, não o `form_data` cru. Para que todos os campos novos cheguem ao robô, o **mapper precisa repassar todas as chaves do prompt**. Plano: o formulário grava `form_data` já usando **exatamente as chaves do JSON do prompt**, e o mapper passa a fazer um **pass-through completo** (todas as chaves do contrato, com defaults e normalização de datas/booleanos), preservando os aliases atuais.

## Etapas-alvo (15)
1. Dados pessoais (nomes, sexo, estado civil + "Outro", nascimento, outros nomes repetível, nome nativo c/ "não se aplica")
2. Nacionalidade e documentos (outra nacionalidade + passaporte, residente em outro país, CPF/SSN/Tax-ID com NA)
3. Viagem (propósito, planos específicos Sim/Não com campos distintos, onde vai ficar, quem paga + pagador)
4. Companheiros de viagem (grupo vs lista repetível; serialização `"Nome Sobrenome (RELACAO)"`)
5. Viagens anteriores aos EUA (visitas repetíveis, carteira motorista EUA, visto anterior + sub-perguntas, visto negado, petição imigração)
6. Endereço, contato e redes sociais (residencial, correspondência condicional, telefones c/ NA, emails/telefones adicionais, redes sociais repetível + "não tenho")
7. Passaporte (tipo, número, livro c/ NA, emissor/cidade/UF/país, datas, perdido/roubado condicional)
8. Contato nos EUA (pessoa/organização/não sei, nome, relação, endereço completo)
9. Família — pais (nome/nascimento c/ "não sei", pai/mãe nos EUA + status; outros parentes repetível)
10. Cônjuge (condicional ao estado civil: casado/união/parceria, divorciado, viúvo; pular solteiro/separado)
11. Trabalho atual (ocupação + campos condicionais por tipo: empregador, estudante, aposentado/desempregado/do lar, outro)
12. Trabalho e educação anteriores (empregos repetíveis c/ supervisor; instituições repetíveis)
13. Informações adicionais (clã/tribo, idiomas, países visitados, organizações, habilidades especiais, serviço militar, paramilitar)
14. Antecedentes/Segurança (bloco recolhível, tudo "Não" por padrão, aviso)
15. Revisão e envio (resumo por seção com editar + enviar)

## Tabelas (dropdowns) a centralizar em `types.ts`
Estado civil, Sexo, Propósito (B1/B2 default), Quem paga (S/O/C), Parentesco acompanhante, Tipo de passaporte, Status nos EUA, Ocupação principal, Relação contato EUA, Redes sociais (já existe), Países (já existe). Cada uma com `{ value, label }` e o valor exato do prompt.

## Componentes reutilizáveis (novos, em `src/components/ds160/fields/`)
- `FieldText`, `FieldSelect`, `FieldDateBR` (gera `DD/MM/AAAA`, teclado/máscara), `FieldYesNo` (toggle Sim/Não), `NACheckbox` (desabilita+limpa o campo), `RepeatableGroup` (Adicionar/Remover), `HelpTooltip` (textos de ajuda PT-BR).
- Inputs grandes e mobile-first, teclado numérico para telefone/CEP.

## Mudanças por arquivo
1. `src/components/ds160/types.ts` — adicionar todas as tabelas de opções do prompt.
2. `src/components/ds160/fields/*` — criar os componentes reutilizáveis.
3. `src/components/ds160/DS160Step1..15.tsx` — reescrever/criar as 15 etapas (substitui as 11 atuais; Step12..15 novos).
4. `src/components/ds160/validation.ts` — reescrever para 15 etapas, marcando obrigatórios do prompt e respeitando condicionais (ex.: cônjuge só valida se casado).
5. `src/pages/DS160PublicPage.tsx` — generalizar de 11→15 (array `STEPS`, índices de "última etapa", `progress`, `maxReachable`, render dinâmico).
6. `src/components/ds160/DS160EditDialog.tsx` — renderizar as mesmas 15 seções para edição interna (reusando os componentes de etapa).
7. `src/lib/ds160-mapper.ts` — expandir `montarDadosDS160` para **pass-through completo** de todas as chaves do contrato do prompt (defaults, datas BR, booleanos, arrays), mantendo `mapearDadosDS160`/`validarDS160`/`dispararRoboDS160`.

## Formato de saída (`form_data` = contrato do robô)
O formulário grava `form_data` com as chaves exatas do prompt (incl. `acompanhantes` como array de **strings** `"Nome Sobrenome (RELACAO)"`, `redes_sociais` como `[{plataforma, usuario}]`, arrays repetíveis, flags NA). Datas sempre `DD/MM/AAAA`. Seção de segurança default `false`.

## Detalhes técnicos
- Compatibilidade: `form_data` antigo continua carregando (chaves ausentes assumem default). Não há migration de banco — `form_data` é JSONB livre.
- Autosave/RPCs (`get_public_ds160`, `save_public_ds160`, `submit_public_ds160`) permanecem; apenas muda o conteúdo de `form_data` e o número de etapas.
- Validação de envio passa a usar o índice da última etapa de dados (Segurança/Declaração), não mais `10` fixo.
- Sem alterações de backend/migrations; deploy é frontend (Publicar).

## Verificação
- `tsgo` typecheck limpo.
- Teste manual via Playwright no link público: navegar pelas 15 etapas, validar condicionais (estado civil → cônjuge, quem paga → pagador, etc.), confirmar JSON gerado pelo mapper.
