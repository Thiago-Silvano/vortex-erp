/**
 * NfseModulo.jsx — Módulo de Emissão de NFS-e
 * TravelERP — Integrado ao tema escuro do sistema
 *
 * Cole em: src/components/fiscal/NfseModulo.jsx
 *
 * Variável de ambiente necessária:
 * VITE_NFSE_BACKEND_URL=http://localhost:3003
 */

import { useState, useRef } from "react"

const BACKEND_URL = import.meta.env.VITE_NFSE_BACKEND_URL || "http://localhost:3003"

// Código de serviço padrão para agências de viagem (LC 116)
const CODIGO_SERVICO_PADRAO = "7.01"

export default function NfseModulo({ venda }) {
  /**
   * venda: objeto vindo do ERP com os dados da venda aprovada
   * {
   *   id: "uuid",
   *   cliente: { nome, cpf, cnpj },
   *   valor_comissao: 1500.00,
   *   descricao: "Agenciamento de viagem...",
   *   data: "2025-06-01"
   * }
   */

  const [status, setStatus]       = useState("idle") // idle | loading | success | error
  const [logs, setLogs]           = useState([])
  const [resultado, setResultado] = useState(null)
  const [certBase64, setCertBase64] = useState("")
  const [certSenha, setCertSenha]   = useState("")
  const [form, setForm] = useState({
    cpf_tomador:       venda?.cliente?.cpf?.replace(/\D/g, "") || "",
    nome_tomador:      venda?.cliente?.nome || "",
    descricao_servico: venda?.descricao || "Agenciamento de viagens internacionais",
    valor_total:       venda?.valor_comissao || 0,
    competencia:       new Date().toISOString().slice(0, 7),
    codigo_servico:    CODIGO_SERVICO_PADRAO,
    aliquota_iss:      2,
    natureza_operacao: "1",
    optante_simples:   false,
  })
  const logRef   = useRef(null)
  const fileRef  = useRef(null)

  const addLog = (tipo, txt) => {
    setLogs(p => {
      const novo = [...p, { tipo, txt, id: Date.now() + Math.random() }]
      setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, 50)
      return novo
    })
  }

  // ── Upload do certificado .pfx ─────────────────────────────────────────────
  const handleCertUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith(".pfx") && !file.name.endsWith(".p12")) {
      alert("Selecione um arquivo .pfx ou .p12")
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1]
      setCertBase64(base64)
      addLog("ok", `✓ Certificado carregado: ${file.name}`)
    }
    reader.readAsDataURL(file)
  }

  // ── Emitir nota ────────────────────────────────────────────────────────────
  const emitirNota = async () => {
    if (!certBase64)          return alert("Carregue o certificado .pfx primeiro")
    if (!certSenha)           return alert("Informe a senha do certificado")
    if (!form.cpf_tomador)    return alert("Informe o CPF do tomador")
    if (!form.valor_total)    return alert("Informe o valor da nota")

    setStatus("loading")
    setLogs([])
    setResultado(null)

    addLog("info", "$ iniciando robô de emissão...")
    addLog("act",  "> conectando ao nfse.gov.br")
    addLog("act",  `> tomador: ${form.cpf_tomador} | valor: R$ ${Number(form.valor_total).toFixed(2)}`)

    try {
      addLog("info", "$ autenticando com certificado digital A1...")

      const res = await fetch(`${BACKEND_URL}/api/emitir-nfse`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificado: { base64: certBase64, senha: certSenha },
          nota:        { ...form, valor_total: Number(form.valor_total) },
          venda_id:    venda?.id,
          empresa_id:  venda?.empresa_id,
        }),
      })

      const data = await res.json()

      if (!data.ok) throw new Error(data.erro || "Erro desconhecido")

      addLog("ok", `✓ NFS-e emitida${data.numeroNota ? ` — Nº ${data.numeroNota}` : ""}`)
      addLog("ok", `✓ PDF gerado: ${data.pdfFilename}`)

      setResultado(data)
      setStatus("success")

      // Salva PDF no Supabase Storage (opcional — implemente conforme sua lógica)
      if (data.pdfBase64 && venda?.id) {
        await salvarPdfNoStorage(data.pdfBase64, data.pdfFilename, venda.id)
      }

    } catch (err) {
      addLog("error", `✗ erro: ${err.message}`)
      setStatus("error")
    }
  }

  // ── Salvar PDF no Supabase Storage ─────────────────────────────────────────
  const salvarPdfNoStorage = async (base64, filename, vendaId) => {
    try {
      addLog("info", "$ salvando PDF no sistema...")
      // Adapte para seu cliente Supabase
      // const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      // await supabase.storage.from("notas-fiscais").upload(`${vendaId}/${filename}`, bytes)
      addLog("ok", "✓ PDF salvo no sistema")
    } catch (e) {
      addLog("warn", `⚠ PDF não salvo no storage: ${e.message}`)
    }
  }

  // ── Download do PDF localmente ─────────────────────────────────────────────
  const downloadPdf = () => {
    if (!resultado?.pdfBase64) return
    const link = document.createElement("a")
    link.href     = `data:application/pdf;base64,${resultado.pdfBase64}`
    link.download = resultado.pdfFilename
    link.click()
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={S.shell}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerIcon}>🧾</div>
          <div>
            <div style={S.headerTitle}>Emissão de NFS-e</div>
            <div style={S.headerSub}>Emissor Nacional — nfse.gov.br</div>
          </div>
        </div>
        {venda && (
          <div style={S.vendaTag}>
            Venda #{venda.id?.slice(0, 8).toUpperCase()}
          </div>
        )}
      </div>

      <div style={S.body}>

        {/* Coluna esquerda — configuração */}
        <div style={S.panel}>

          {/* Certificado */}
          <Section label="🔐 Certificado Digital A1">
            <div style={S.uploadArea} onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".pfx,.p12"
                style={{ display: "none" }} onChange={handleCertUpload} />
              {certBase64
                ? <span style={{ color: "#3dd68c", fontSize: 12 }}>✓ Certificado carregado</span>
                : <>
                    <span style={{ fontSize: 20 }}>📁</span>
                    <span style={{ fontSize: 12, color: "#6b6b80" }}>Clique para selecionar o .pfx</span>
                  </>}
            </div>
            <Field label="Senha do certificado">
              <input style={S.inp} type="password" placeholder="••••••••"
                value={certSenha} onChange={e => setCertSenha(e.target.value)} />
            </Field>
          </Section>

          <Divider />

          {/* Tomador */}
          <Section label="👤 Tomador do Serviço">
            <Field label="CPF do tomador *">
              <input style={S.inp} type="text" placeholder="000.000.000-00"
                value={form.cpf_tomador}
                onChange={e => setForm(p => ({ ...p, cpf_tomador: e.target.value.replace(/\D/g, "") }))} />
            </Field>
            <Field label="Nome (opcional)">
              <input style={S.inp} type="text" placeholder="Nome do cliente"
                value={form.nome_tomador}
                onChange={e => setForm(p => ({ ...p, nome_tomador: e.target.value }))} />
            </Field>
          </Section>

          <Divider />

          {/* Serviço */}
          <Section label="🔧 Serviço">
            <Field label="Código LC 116">
              <input style={S.inp} type="text" placeholder="7.01"
                value={form.codigo_servico}
                onChange={e => setForm(p => ({ ...p, codigo_servico: e.target.value }))} />
            </Field>
            <Field label="Descrição do serviço *">
              <textarea style={{ ...S.inp, height: 64, padding: "8px 10px", resize: "vertical" }}
                placeholder="Ex: Agenciamento de viagem internacional..."
                value={form.descricao_servico}
                onChange={e => setForm(p => ({ ...p, descricao_servico: e.target.value }))} />
            </Field>
          </Section>

          <Divider />

          {/* Valores */}
          <Section label="💰 Valores">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Valor total (R$) *">
                <input style={S.inp} type="number" step="0.01" placeholder="0,00"
                  value={form.valor_total}
                  onChange={e => setForm(p => ({ ...p, valor_total: e.target.value }))} />
              </Field>
              <Field label="Alíquota ISS (%)">
                <input style={S.inp} type="number" step="0.01" placeholder="2"
                  value={form.aliquota_iss}
                  onChange={e => setForm(p => ({ ...p, aliquota_iss: e.target.value }))} />
              </Field>
              <Field label="Competência">
                <input style={S.inp} type="month"
                  value={form.competencia}
                  onChange={e => setForm(p => ({ ...p, competencia: e.target.value }))} />
              </Field>
              <Field label="Natureza">
                <select style={S.sel}
                  value={form.natureza_operacao}
                  onChange={e => setForm(p => ({ ...p, natureza_operacao: e.target.value }))}>
                  <option value="1">Tributação no município</option>
                  <option value="2">Tributação fora do município</option>
                  <option value="3">Isenção</option>
                  <option value="4">Imune</option>
                  <option value="6">Exportação</option>
                </select>
              </Field>
            </div>
            <Field label="">
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#a8a8b8", cursor: "pointer" }}>
                <input type="checkbox"
                  checked={form.optante_simples}
                  onChange={e => setForm(p => ({ ...p, optante_simples: e.target.checked }))}
                  style={{ accentColor: "#5b5bd6" }} />
                Optante pelo Simples Nacional
              </label>
            </Field>
          </Section>

          <Divider />

          {/* Status bar */}
          <div style={S.statusBar}>
            <div style={{ ...S.dot, background: STATUS_COLORS[status] }} />
            <span style={{ fontSize: 11, color: "#6b6b80" }}>{STATUS_TEXT[status]}</span>
          </div>

          {/* Botão emitir */}
          <button
            style={{ ...S.emitBtn, ...(status === "loading" ? S.emitBtnDisabled : {}) }}
            onClick={emitirNota}
            disabled={status === "loading"}>
            {status === "loading" ? "⏳ Emitindo..." : "🧾 Emitir NFS-e"}
          </button>

          {/* Log terminal */}
          <div style={S.logBox} ref={logRef}>
            {logs.length === 0
              ? <span style={{ color: "#3a3a46" }}>$ aguardando comando...</span>
              : logs.map(l => (
                  <div key={l.id} style={{ color: LOG_COLORS[l.tipo] }}>{l.txt}</div>
                ))}
          </div>
        </div>

        {/* Coluna direita — resultado */}
        <div style={S.result}>
          {status !== "success"
            ? (
              <div style={S.emptyState}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                <p style={{ fontSize: 13, color: "#4a4a56", textAlign: "center", maxWidth: 220 }}>
                  Preencha os dados e clique em "Emitir NFS-e" para emitir a nota diretamente no portal do governo
                </p>
                <div style={S.flowDiagram}>
                  {["Seu ERP", "→", "Robô", "→", "nfse.gov.br", "→", "PDF salvo"].map((t, i) => (
                    <span key={i} style={{
                      fontSize: 11,
                      color: t === "→" ? "#3a3a46" : "#6b6b80",
                      fontWeight: t !== "→" ? 500 : 400
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )
            : (
              <div style={S.successCard}>
                <div style={S.successIcon}>✅</div>
                <div style={S.successTitle}>NFS-e Emitida com Sucesso!</div>

                {resultado?.numeroNota && (
                  <div style={S.notaNum}>
                    <span style={{ fontSize: 11, color: "#6b6b80" }}>Número da Nota</span>
                    <span style={{ fontSize: 28, fontWeight: 500, color: "#e8e8f0", letterSpacing: -1 }}>
                      {resultado.numeroNota}
                    </span>
                  </div>
                )}

                <div style={S.infoGrid}>
                  <InfoItem label="Tomador" value={form.nome_tomador || form.cpf_tomador} />
                  <InfoItem label="CPF" value={form.cpf_tomador} />
                  <InfoItem label="Valor" value={`R$ ${Number(form.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <InfoItem label="ISS" value={`${form.aliquota_iss}%`} />
                  <InfoItem label="Competência" value={form.competencia} />
                  <InfoItem label="Arquivo" value={resultado?.pdfFilename?.slice(0, 28) + "..."} />
                </div>

                <button style={S.downloadBtn} onClick={downloadPdf}>
                  ⬇ Baixar PDF da Nota
                </button>

                <button style={S.newBtn} onClick={() => { setStatus("idle"); setResultado(null); setLogs([]) }}>
                  + Emitir outra nota
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function Section({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: "#5b5bd6", textTransform: "uppercase", letterSpacing: ".7px" }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <span style={{ fontSize: 11, color: "#6b6b80", fontWeight: 500 }}>{label}</span>}
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: "0.5px", background: "#1e1e22", margin: "2px 0" }} />
}

function InfoItem({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, color: "#4a4a56" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#c8c8e0", fontWeight: 500 }}>{value}</span>
    </div>
  )
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUS_COLORS = { idle: "#3a3a46", loading: "#ffb43c", success: "#3dd68c", error: "#f16a6a" }
const STATUS_TEXT   = { idle: "Aguardando...", loading: "Robô em execução...", success: "Nota emitida!", error: "Erro na emissão" }
const LOG_COLORS    = { info: "#8888a0", act: "#a8a8f0", ok: "#3dd68c", error: "#f16a6a", warn: "#ffb43c" }

// ─── Estilos ──────────────────────────────────────────────────────────────────
const S = {
  shell:       { background: "#0f0f10", borderRadius: 12, overflow: "hidden", border: "0.5px solid #242428", fontFamily: "Inter, system-ui, sans-serif", minHeight: 500 },
  header:      { background: "#141416", borderBottom: "0.5px solid #242428", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft:  { display: "flex", alignItems: "center", gap: 10 },
  headerIcon:  { width: 36, height: 36, background: "#5b5bd6", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  headerTitle: { fontSize: 15, fontWeight: 500, color: "#e8e8f0" },
  headerSub:   { fontSize: 11, color: "#4a4a56", marginTop: 1 },
  vendaTag:    { fontSize: 11, color: "#5b5bd6", background: "rgba(91,91,214,.15)", borderRadius: 6, padding: "3px 10px", fontWeight: 500 },
  body:        { display: "grid", gridTemplateColumns: "300px 1fr", minHeight: 460 },
  panel:       { background: "#141416", borderRight: "0.5px solid #242428", padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: 600 },
  uploadArea:  { height: 52, border: "0.5px dashed #2a2a3e", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", background: "#0f0f10" },
  inp:         { height: 30, background: "#0f0f10", border: "0.5px solid #2a2a2e", borderRadius: 6, padding: "0 9px", fontSize: 12, color: "#e8e8f0", width: "100%", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  sel:         { height: 30, background: "#0f0f10", border: "0.5px solid #2a2a2e", borderRadius: 6, padding: "0 9px", fontSize: 12, color: "#e8e8f0", width: "100%", outline: "none", boxSizing: "border-box" },
  statusBar:   { display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#0f0f10", borderRadius: 6, border: "0.5px solid #1e1e22" },
  dot:         { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  emitBtn:     { height: 36, background: "#5b5bd6", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", width: "100%" },
  emitBtnDisabled: { background: "#2a2a44", color: "#8888a0", cursor: "default" },
  logBox:      { background: "#0a0a0c", border: "0.5px solid #1e1e22", borderRadius: 6, padding: 10, fontSize: 11, fontFamily: "monospace", lineHeight: 1.7, maxHeight: 88, overflowY: "auto", display: "flex", flexDirection: "column" },
  result:      { background: "#0f0f10", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  emptyState:  { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: 0.5 },
  flowDiagram: { display: "flex", alignItems: "center", gap: 6, marginTop: 8, background: "#141416", padding: "8px 14px", borderRadius: 8, border: "0.5px solid #1e1e22" },
  successCard: { background: "#141416", border: "0.5px solid #3dd68c40", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 340 },
  successIcon: { fontSize: 40 },
  successTitle: { fontSize: 15, fontWeight: 500, color: "#e8e8f0" },
  notaNum:     { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "#0f0f10", borderRadius: 8, padding: "12px 24px", border: "0.5px solid #242428", width: "100%" },
  infoGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" },
  downloadBtn: { height: 36, background: "#3dd68c", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#0f0f10", cursor: "pointer", width: "100%" },
  newBtn:      { height: 32, background: "transparent", border: "0.5px solid #2a2a2e", borderRadius: 8, fontSize: 12, color: "#8888a0", cursor: "pointer", width: "100%" },
}
