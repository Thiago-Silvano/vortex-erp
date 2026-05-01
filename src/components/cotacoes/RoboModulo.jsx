/**
 * RoboModulo.jsx — Módulo Robô de Cotação
 * TravelERP — Aba Cotações
 * 
 * Cole este arquivo em: src/components/cotacoes/RoboModulo.jsx
 * Importe na tela de Cotações: import RoboModulo from './RoboModulo'
 */

import { useState, useRef } from "react";

// ─── URL do seu backend Puppeteer ────────────────────────────────────────────
// Em desenvolvimento: http://localhost:3001
// Em produção: https://seu-backend.com
const BACKEND_URL = import.meta.env.VITE_ROBO_BACKEND_URL || "http://localhost:3001";

// ─── Fornecedores disponíveis ─────────────────────────────────────────────────
const FORNECEDORES = [
  { id: "opere",        nome: "Opere Viagens (Infotravel)" },
  { id: "viagenspromo", nome: "Viagens Promo (Infotravel)" },
  { id: "europlus",     nome: "Europlus (Infotravel)"      },
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RoboModulo({ onAdicionarCotacao }) {
  const [status, setStatus]       = useState("idle"); // idle | running | done | error
  const [logs, setLogs]           = useState([]);
  const [resultados, setResult]   = useState([]);
  const [selecionados, setSelec]  = useState([]);
  const [form, setForm]           = useState({
    fornecedor: "opere",
    login: "",
    senha: "",
    destino: "",
    checkin: "",
    checkout: "",
    adultos: 2,
    criancas: 0,
    categoria: "Qualquer",
    regime: "Qualquer",
  });
  const logRef = useRef(null);

  const noites = form.checkin && form.checkout
    ? Math.round((new Date(form.checkout) - new Date(form.checkin)) / 86400000)
    : 0;

  const addLog = (tipo, texto) => {
    setLogs(prev => {
      const novo = [...prev, { tipo, texto, id: Date.now() + Math.random() }];
      setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
      return novo;
    });
  };

  // ─── Iniciar robô ────────────────────────────────────────────────────────────
  const iniciarRobo = async () => {
    if (status === "running") return;
    if (!form.destino || !form.checkin || !form.checkout) {
      alert("Preencha destino, check-in e check-out.");
      return;
    }

    setStatus("running");
    setLogs([]);
    setResult([]);
    setSelec([]);

    addLog("info", "$ iniciando robô...");
    addLog("act",  `> conectando ao fornecedor: ${FORNECEDORES.find(f => f.id === form.fornecedor)?.nome}`);

    try {
      addLog("act", `> buscando: ${form.destino} | ${form.checkin} → ${form.checkout}`);
      addLog("info", "$ aguardando resposta do portal...");

      // Chama o backend — use /api/buscar-mock para testes sem Puppeteer
      const endpoint = form.login ? "/api/buscar" : "/api/buscar-mock";
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fornecedor: form.fornecedor,
          credenciais: { login: form.login, senha: form.senha },
          busca: {
            destino:   form.destino,
            checkin:   form.checkin,
            checkout:  form.checkout,
            adultos:   form.adultos,
            criancas:  form.criancas,
            categoria: form.categoria,
            regime:    form.regime,
          },
        }),
      });

      const data = await res.json();

      if (!data.ok) throw new Error(data.erro || "Erro desconhecido");

      addLog("ok", `✓ ${data.total} resultado(s) encontrado(s)`);
      addLog("ok", "✓ dados extraídos com sucesso");
      setResult(data.resultados);
      setStatus("done");

    } catch (err) {
      addLog("error", `✗ erro: ${err.message}`);
      setStatus("error");
    }
  };

  // ─── Toggle seleção de card ───────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelec(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ─── Adicionar selecionados à cotação ─────────────────────────────────────
  const addCotacao = () => {
    const itens = resultados.filter(r => selecionados.includes(r.id));
    if (onAdicionarCotacao) onAdicionarCotacao(itens);
    setSelec([]);
    alert(`${itens.length} item(ns) adicionado(s) à cotação!`);
  };

  const precoMin = resultados.length ? resultados.reduce((a, b) => a.preco < b.preco ? a : b).preco : null;
  const precoMax = resultados.length ? resultados.reduce((a, b) => a.preco > b.preco ? a : b).preco : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={S.shell}>

      {/* Barra de abas */}
      <div style={S.tabBar}>
        {["Dashboard","Cotações","Vendas","Clientes","Financeiro"].map(t => (
          <div key={t} style={{ ...S.tab, ...(t === "Cotações" ? S.tabActive : {}) }}>{t}</div>
        ))}
      </div>

      {/* Summary bar — aparece após busca */}
      {resultados.length > 0 && (
        <div style={S.summaryBar}>
          <SumItem valor={resultados.length} label="resultados" />
          <div style={S.sumSep} />
          <SumItem valor={precoMin} label="menor preço" />
          <div style={S.sumSep} />
          <SumItem valor={precoMax} label="maior preço" />
          <div style={S.sumSep} />
          <SumItem valor={noites > 0 ? `${noites} noites` : "—"} label="período" />
          {selecionados.length > 0 && (
            <>
              <div style={{ marginLeft: "auto" }} />
              <button style={S.addCotBtn} onClick={addCotacao}>
                + Adicionar {selecionados.length} à cotação
              </button>
            </>
          )}
        </div>
      )}

      {/* Layout: painel esquerdo + resultados */}
      <div style={S.layout}>

        {/* PAINEL DE CONFIGURAÇÃO */}
        <div style={S.panel}>
          <SectionLabel icon="⚙" text="Robô de busca" />

          <Field label="Fornecedor">
            <select style={S.sel} value={form.fornecedor}
              onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))}>
              {FORNECEDORES.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </Field>

          <hr style={S.divider} />
          <SectionLabel icon="🔐" text="Credenciais" />

          <Field label="Login / AgencyId">
            <input style={S.inp} type="text" placeholder="Seu código de agência"
              value={form.login} onChange={e => setForm(p => ({ ...p, login: e.target.value }))} />
          </Field>
          <Field label="Senha">
            <input style={S.inp} type="password" placeholder="••••••••"
              value={form.senha} onChange={e => setForm(p => ({ ...p, senha: e.target.value }))} />
          </Field>

          <hr style={S.divider} />
          <SectionLabel icon="🔍" text="Parâmetros" />

          <Field label="Destino">
            <input style={S.inp} type="text" placeholder="Ex: Paris, França"
              value={form.destino} onChange={e => setForm(p => ({ ...p, destino: e.target.value }))} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Check-in">
              <input style={S.inp} type="date" value={form.checkin}
                onChange={e => setForm(p => ({ ...p, checkin: e.target.value }))} />
            </Field>
            <Field label="Check-out">
              <input style={S.inp} type="date" value={form.checkout}
                onChange={e => setForm(p => ({ ...p, checkout: e.target.value }))} />
            </Field>
          </div>

          {noites > 0 && (
            <div style={S.nightsPill}>{noites} noite{noites !== 1 ? "s" : ""}</div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Adultos">
              <input style={S.inp} type="number" min={1} value={form.adultos}
                onChange={e => setForm(p => ({ ...p, adultos: +e.target.value }))} />
            </Field>
            <Field label="Crianças">
              <input style={S.inp} type="number" min={0} value={form.criancas}
                onChange={e => setForm(p => ({ ...p, criancas: +e.target.value }))} />
            </Field>
          </div>

          <Field label="Categoria">
            <select style={S.sel} value={form.categoria}
              onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
              {["Qualquer","3 estrelas","4 estrelas","5 estrelas","Boutique"].map(c =>
                <option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Regime">
            <select style={S.sel} value={form.regime}
              onChange={e => setForm(p => ({ ...p, regime: e.target.value }))}>
              {["Qualquer","Café da manhã","Meia pensão","All inclusive"].map(r =>
                <option key={r}>{r}</option>)}
            </select>
          </Field>

          <hr style={S.divider} />

          {/* Status dot */}
          <div style={S.statusBar}>
            <div style={{ ...S.dot, background: STATUS_COLORS[status] }} />
            <span style={{ fontSize: 11, color: "#6b6b80" }}>
              {STATUS_TEXT[status]}
            </span>
          </div>

          {/* Botão principal */}
          <button
            style={{ ...S.runBtn, ...(status === "running" ? S.runBtnDisabled : {}) }}
            onClick={iniciarRobo}
            disabled={status === "running"}>
            {status === "running" ? "⏳ Buscando..." : "▶ Iniciar robô"}
          </button>

          {/* Log terminal */}
          <div style={S.logBox} ref={logRef}>
            {logs.length === 0
              ? <span style={{ color: "#3a3a46" }}>$ aguardando comando...</span>
              : logs.map(l => (
                  <div key={l.id} style={{ color: LOG_COLORS[l.tipo] }}>{l.texto}</div>
                ))}
          </div>
        </div>

        {/* ÁREA DE RESULTADOS */}
        <div style={S.results}>
          {resultados.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
              <p style={{ fontSize: 13, color: "#4a4a56", textAlign: "center", maxWidth: 240 }}>
                Configure os parâmetros e inicie o robô para buscar disponibilidade no fornecedor
              </p>
            </div>
          ) : (
            resultados.map(r => (
              <ResultCard
                key={r.id}
                item={r}
                selecionado={selecionados.includes(r.id)}
                onToggle={() => toggleSelect(r.id)}
                onAdd={() => {
                  if (onAdicionarCotacao) onAdicionarCotacao([r]);
                  alert(`"${r.nome}" adicionado à cotação!`);
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ResultCard({ item, selecionado, onToggle, onAdd }) {
  return (
    <div
      style={{ ...S.resCard, ...(selecionado ? S.resCardSelected : {}) }}
      onClick={onToggle}>
      <div style={S.rcTop}>
        <div style={{ flex: 1 }}>
          <div style={S.rcName}>{item.nome}</div>
          <div style={S.rcLoc}>{item.localização || item.localizacao || "—"}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={S.rcPrice}>{item.preco}</div>
          <div style={S.rcPriceLabel}>{item.precoBase}</div>
        </div>
      </div>

      <div style={S.rcPills}>
        {item.categoria && <Pill color="blue">{item.categoria}</Pill>}
        {item.regime    && <Pill color="purple">{item.regime}</Pill>}
        {item.disponivel
          ? <Pill color="green">Disponível</Pill>
          : <Pill color="red">Indisponível</Pill>}
        {(item.tags || []).map((t, i) => <Pill key={i} color="amber">{t}</Pill>)}
      </div>

      <div style={S.rcFooter}>
        <span style={S.rcForn}>via Infotravel · {item.codigoProduto}</span>
        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
          <button style={S.btnGhost} onClick={onToggle}>
            {selecionado ? "✓ Selecionado" : "Selecionar"}
          </button>
          <button style={S.btnAccent} onClick={onAdd}>+ Cotação</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#6b6b80", fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

function SectionLabel({ icon, text }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 500, color: "#5b5bd6", textTransform: "uppercase", letterSpacing: ".7px", display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 11 }}>{icon}</span>{text}
    </div>
  );
}

function SumItem({ valor, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: "#e8e8f0" }}>{valor}</span>
      <span style={{ fontSize: 10, color: "#4a4a56" }}>{label}</span>
    </div>
  );
}

function Pill({ color, children }) {
  const colors = {
    green:  { bg: "rgba(61,214,140,.1)",   text: "#3dd68c" },
    amber:  { bg: "rgba(255,180,60,.1)",   text: "#ffb43c" },
    red:    { bg: "rgba(241,106,106,.1)",  text: "#f16a6a" },
    blue:   { bg: "rgba(91,91,214,.1)",    text: "#a8a8f0" },
    purple: { bg: "rgba(168,168,240,.1)",  text: "#a8a8f0" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 500, background: c.bg, color: c.text }}>
      {children}
    </span>
  );
}

// ─── Constantes de estado ─────────────────────────────────────────────────────
const STATUS_COLORS = { idle: "#3a3a46", running: "#ffb43c", done: "#3dd68c", error: "#f16a6a" };
const STATUS_TEXT   = { idle: "Aguardando busca...", running: "Robô em execução...", done: "Busca concluída", error: "Erro na busca" };
const LOG_COLORS    = { info: "#8888a0", act: "#a8a8f0", ok: "#3dd68c", error: "#f16a6a", warn: "#ffb43c" };

// ─── Estilos ──────────────────────────────────────────────────────────────────
const S = {
  shell:        { background: "#0f0f10", borderRadius: 12, overflow: "hidden", border: "0.5px solid #242428", fontFamily: "Inter, system-ui, sans-serif" },
  tabBar:       { background: "#141416", display: "flex", borderBottom: "0.5px solid #242428", padding: "0 16px" },
  tab:          { fontSize: 12, color: "#6b6b80", padding: "10px 14px", cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive:    { color: "#a8a8f0", borderBottom: "2px solid #5b5bd6" },
  summaryBar:   { display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "#141416", borderBottom: "0.5px solid #242428" },
  sumSep:       { width: "0.5px", height: 20, background: "#1e1e22" },
  addCotBtn:    { height: 28, padding: "0 14px", borderRadius: 6, border: "none", background: "#5b5bd6", fontSize: 12, fontWeight: 500, color: "#fff", cursor: "pointer" },
  layout:       { display: "grid", gridTemplateColumns: "270px 1fr", minHeight: 500 },
  panel:        { background: "#141416", borderRight: "0.5px solid #242428", padding: 16, display: "flex", flexDirection: "column", gap: 10 },
  divider:      { border: "none", borderTop: "0.5px solid #1e1e22", margin: "2px 0" },
  inp:          { height: 30, background: "#0f0f10", border: "0.5px solid #2a2a2e", borderRadius: 6, padding: "0 9px", fontSize: 12, color: "#e8e8f0", width: "100%", outline: "none", boxSizing: "border-box" },
  sel:          { height: 30, background: "#0f0f10", border: "0.5px solid #2a2a2e", borderRadius: 6, padding: "0 9px", fontSize: 12, color: "#e8e8f0", width: "100%", outline: "none", boxSizing: "border-box" },
  nightsPill:   { alignSelf: "flex-start", background: "rgba(91,91,214,.15)", color: "#a8a8f0", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500 },
  statusBar:    { display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#0f0f10", borderRadius: 6, border: "0.5px solid #1e1e22" },
  dot:          { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  runBtn:       { height: 34, background: "#5b5bd6", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 500, color: "#fff", cursor: "pointer" },
  runBtnDisabled: { background: "#2a2a44", color: "#8888a0", cursor: "default" },
  logBox:       { background: "#0a0a0c", border: "0.5px solid #1e1e22", borderRadius: 6, padding: 10, fontSize: 11, fontFamily: "monospace", lineHeight: 1.7, maxHeight: 88, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 },
  results:      { background: "#0f0f10", padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: 560 },
  emptyState:   { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, opacity: 0.4 },
  resCard:      { background: "#141416", border: "0.5px solid #242428", borderRadius: 8, padding: "12px 14px", cursor: "pointer" },
  resCardSelected: { borderColor: "#5b5bd6", background: "#1a1a2e" },
  rcTop:        { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  rcName:       { fontSize: 13, fontWeight: 500, color: "#e8e8f0" },
  rcLoc:        { fontSize: 11, color: "#6b6b80", marginTop: 2 },
  rcPrice:      { fontSize: 15, fontWeight: 500, color: "#e8e8f0" },
  rcPriceLabel: { fontSize: 10, color: "#4a4a56" },
  rcPills:      { display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 },
  rcFooter:     { display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "0.5px solid #1e1e22" },
  rcForn:       { fontSize: 10, color: "#4a4a56" },
  btnGhost:     { height: 24, padding: "0 10px", borderRadius: 5, fontSize: 11, background: "transparent", border: "0.5px solid #2a2a2e", color: "#8888a0", cursor: "pointer" },
  btnAccent:    { height: 24, padding: "0 10px", borderRadius: 5, fontSize: 11, background: "#5b5bd6", border: "none", color: "#fff", fontWeight: 500, cursor: "pointer" },
};
