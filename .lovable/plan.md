## Objetivo
Reaplicar o visual do card "Investimento" na página pública da proposta (`src/pages/PropostaPublicPage.tsx`) para combinar com a imagem de referência: card escuro com gradiente sutil, label dourada "INVESTIMENTO TOTAL" com tracking amplo, valor grande em fonte serif branca, cantos arredondados e o botão verde do WhatsApp logo abaixo.

O conteúdo (parcelas, valor por pessoa, etc.) permanece igual — apenas o estilo visual será refinado nos dois heros existentes.

## Mudanças (apenas visuais, em `src/pages/PropostaPublicPage.tsx`)

### Card hero (linhas ~437–489)
- Trocar `background: '#fff'` do wrapper por algo neutro/transparente — o card escuro será o próprio hero.
- Aumentar `border-radius` para `rounded-2xl` (manter), e adicionar borda sutil dourada (`border: 1px solid rgba(200,164,91,0.15)`).
- Substituir o gradiente atual `linear-gradient(135deg, #0D1B2A, #1B3A4B)` por um gradiente mais escuro/profundo igual ao da imagem: `linear-gradient(135deg, #0F1A2A 0%, #15233A 50%, #0B1422 100%)`.
- Padding vertical maior (`py-12 px-8`) para dar respiro como na imagem.
- Label "INVESTIMENTO TOTAL":
  - cor `#C8A45B`, `text-[11px]`, `tracking-[6px]`, `font-semibold`, `uppercase`, `mb-6`.
- Valor:
  - `font-family: 'Playfair Display', Georgia, serif` (já existe Georgia como fallback), tamanho `text-6xl md:text-7xl`, `font-bold`, `text-white`.
  - Sem dourado no número — branco puro como na imagem.
- Variante com parcelamento:
  - Manter "12x de R$ ..." mas usar a mesma tipografia serif branca; o "12x" continua dourado em escala menor (`text-3xl md:text-4xl`) e o valor maior em branco (`text-5xl md:text-6xl`), preservando hierarquia atual mas em estilo mais limpo.
- Linha divisória dourada e textos auxiliares (valor total, por pessoa) mantidos, apenas refinando opacidade/tamanho para harmonizar.

### Botão WhatsApp (linhas ~513–522)
- Já está bem próximo da imagem; ajustar gradiente para `linear-gradient(135deg, #2BD96E, #14A85A)` e `rounded-xl` mantido. Sem outras mudanças.

### Título de seção "Investimento"
- Mantém o `<SectionTitle>` existente (já tem a barrinha dourada à esquerda visível na imagem).

## Fora de escopo
- Não mexer em lógica de cálculo, parcelas, condicionais de exibição, nem no `showOnlyTotal` (linha 527+).
- Não alterar a seção "Opções de pagamento".
- Não alterar `PropostaClienteBuildsPage.tsx`.

## Arquivos
- `src/pages/PropostaPublicPage.tsx` — apenas classes/estilos inline dos blocos descritos.
