// ============================================================================
// DS-160 Server (local) — ponte entre o ERP Vortex e o robô de preenchimento
// ----------------------------------------------------------------------------
// Roda na máquina do operador (porta 3004). NÃO faz parte do app web.
//
//   npm install            (dentro da pasta ds160-server)
//   npm run ds160-server   (ou: pm2 start ds160-server.js --name ds160-server)
//
// Configure as variáveis no arquivo .env (veja .env.example).
// ============================================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Node 18+ já possui fetch global. Para Node mais antigo, instale node-fetch.
const fetchFn = global.fetch
  ? global.fetch.bind(global)
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
app.use(express.json({ limit: '5mb' }));

// ----------------------------------------------------------------------------
// CORS + Private Network Access (PNA)
// ----------------------------------------------------------------------------
// O ERP é servido por HTTPS (site público). Ao chamar este servidor local
// (http://localhost:3004), o Chrome aplica o "Private Network Access": envia um
// preflight OPTIONS com o cabeçalho `Access-Control-Request-Private-Network: true`
// e SÓ libera a requisição se o servidor responder com
// `Access-Control-Allow-Private-Network: true`. O middleware `cors()` padrão não
// envia esse cabeçalho, então sem isto o botão "Reenviar" é bloqueado pelo
// navegador antes de chegar ao robô. Este middleware adiciona o header e responde
// ao preflight manualmente.
app.use(cors({ origin: true, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use((req, res, next) => {
  // Necessário para o Private Network Access do Chrome.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.sendStatus(204);
  }
  next();
});

const CLIENTES_DIR = process.env.CLIENTES_DIR || 'C:\\Users\\User\\ds160-robot\\dist\\CLIENTES';
const ROBO_EXE = process.env.ROBO_EXE || 'C:\\Users\\User\\ds160-robot\\dist\\DS160-Robot-Vortex.exe';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ----------------------------------------------------------------------------
// Foco da janela do robô (estilo Alt+Tab)
// ----------------------------------------------------------------------------
// O navegador (ERP) NÃO consegue trazer outra janela do sistema para frente —
// é uma restrição de segurança do SO. Como é este servidor local quem abre o
// robô, ele pode forçar o foco. No Windows usamos PowerShell para localizar o
// processo do robô e trazer sua janela para o primeiro plano (restaurando se
// estiver minimizada). Em outros SOs a função simplesmente não faz nada.
function trazerRoboParaFrente() {
  if (process.platform !== 'win32') return;
  const procName = path.basename(ROBO_EXE).replace(/\.exe$/i, '');
  const ps = [
    'Add-Type @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class WinFocus {',
    '  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);',
    '  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);',
    '}',
    '"@;',
    `$p = Get-Process -Name '${procName}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;`,
    'if ($p) {',
    '  [WinFocus]::ShowWindowAsync($p.MainWindowHandle, 9) | Out-Null;', // 9 = SW_RESTORE
    '  [WinFocus]::SetForegroundWindow($p.MainWindowHandle) | Out-Null;',
    '}',
  ].join(' ');
  // Tenta algumas vezes porque a janela pode levar um instante para existir.
  let tentativas = 0;
  const tentar = () => {
    tentativas += 1;
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps.replace(/"/g, '\\"')}"`, (err) => {
      if (err && tentativas < 6) setTimeout(tentar, 700);
    });
    if (tentativas < 6) setTimeout(tentar, 700);
  };
  setTimeout(tentar, 600);
}

function normalizarNome(nome) {
  return String(nome || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

// Campos importantes para o preenchimento. Se algum faltar, o servidor avisa o
// ERP, mas NÃO bloqueia a abertura do robô. Assim o operador pode iniciar o
// processo e complementar manualmente quando necessário.
const CAMPOS_OBRIGATORIOS = [
  'nome_completo', 'cpf', 'data_nascimento', 'sexo', 'estado_civil',
  'passaporte_numero', 'passaporte_data_validade',
  'endereco_linha1', 'cidade_residencia', 'cep', 'telefone', 'email',
  'viagem_data_chegada', 'viagem_cidade_destino',
];

// Atualiza um registro de ds160_forms via REST API do Supabase (service role).
async function patchForm(formId, body) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !formId) return;
  const url = `${SUPABASE_URL}/rest/v1/ds160_forms?id=eq.${formId}`;
  const resp = await fetchFn(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Supabase PATCH falhou (${resp.status}): ${txt}`);
  }
}

// Healthcheck — o ERP usa para saber se o servidor está rodando.
app.get('/ds160/health', (_req, res) => res.json({ ok: true }));

// POST /ds160/iniciar — recebe dados do ERP, salva o JSON e abre o robô.
app.post('/ds160/iniciar', async (req, res) => {
  try {
    const { nome_cliente, form_id, dados } = req.body || {};
    if (!nome_cliente) {
      return res.status(400).json({ erro: 'nome_cliente é obrigatório' });
    }
    if (!dados) {
      return res.status(400).json({
        erro: 'dados é obrigatório — envie o JSON completo do formulário, sem PDF.',
      });
    }

    const faltando = CAMPOS_OBRIGATORIOS.filter((campo) => !dados[campo]);
    if (faltando.length > 0) {
      console.warn('DS-160 iniciado com campos pendentes:', faltando.join(', '));
    }

    const nomePasta = normalizarNome(nome_cliente);
    const pasta = path.join(CLIENTES_DIR, nomePasta);
    fs.mkdirSync(pasta, { recursive: true });

    const jsonPath = path.join(pasta, `DS160_${nomePasta}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(dados, null, 2), 'utf-8');

    await patchForm(form_id, { robot_status: 'em_andamento', robot_machine: process.env.COMPUTERNAME || '' });

    exec(`"${ROBO_EXE}" "${nomePasta}"`, (err) => {
      if (err) console.error('Erro ao abrir robô:', err.message);
    });

    res.json({ ok: true, cliente: nomePasta, pasta, campos_faltando: faltando });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: e.message });
  }
});

// POST /ds160/concluido — o robô Python envia o resultado de volta.
app.post('/ds160/concluido', async (req, res) => {
  try {
    const { form_id, application_id, status, maquina } = req.body || {};
    await patchForm(form_id, {
      robot_status: status || 'concluido',
      robot_application_id: application_id || null,
      robot_filled_at: new Date().toISOString(),
      robot_machine: maquina || process.env.COMPUTERNAME || '',
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: e.message });
  }
});

app.listen(3004, '0.0.0.0', () => {
  console.log('DS-160 Server rodando na porta 3004');
});