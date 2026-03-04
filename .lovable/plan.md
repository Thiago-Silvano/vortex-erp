

# Sistema de Orçamentos - Agência de Viagens

## Visão Geral
Sistema interno para criar orçamentos de viagem e gerar PDFs com visual premium para enviar aos clientes.

## Fluxo Principal
Preencher dados do cliente → Adicionar serviços → Visualizar PDF → Baixar/Enviar

---

## Páginas e Funcionalidades

### 1. Página Principal - Formulário de Orçamento
- **Dados do cliente**: Nome, passageiros, telefone, email, observações
- **Dados da viagem**: Origem, destino, datas ida/volta, noites, tipo (Lazer/Negócios/Lua de mel/Família)
- **Lista de serviços**: Sistema tipo "carrinho" para adicionar múltiplos itens
  - Cada item: tipo (aéreo, hotel, carro, seguro, experiência, adicional), título, descrição, fornecedor, datas, local, valor, quantidade, imagem opcional
  - Botões para adicionar, editar e remover itens

### 2. Visualização do PDF
- Preview em tela do orçamento antes de baixar
- Botões: "Baixar PDF", "Gerar nova cotação"

### 3. Layout Premium do PDF (usando biblioteca jsPDF + html2canvas ou react-pdf)
- **Cabeçalho**: Logo, nome da agência, contatos (WhatsApp, email, site)
- **Seção cliente**: Nome, destino, datas, passageiros
- **Serviços agrupados por categoria** com ícones (✈️🏨🚗🛡🎟📋), cada um em card com imagem, título, descrição, fornecedor, datas e valor
- **Resumo financeiro**: Totais por categoria + total geral
- **Rodapé**: Observações legais sobre disponibilidade e tarifas
- **Estilo**: Azul escuro + dourado + branco, fontes elegantes, espaçamento generoso

### 4. Configurações da Agência
- Página simples para cadastrar: logo, nome da agência, WhatsApp, email, site
- Dados salvos em localStorage para uso nos PDFs

---

## Detalhes Técnicos
- Dados salvos em localStorage (sem backend por enquanto)
- Upload de imagens convertidas para base64 para inclusão no PDF
- Geração de PDF com biblioteca `@react-pdf/renderer` para controle total do layout premium
- Organização automática dos itens por categoria no PDF

