/**
 * ============================================================
 *  VORTEX WHATSAPP SERVER - Node.js
 *  Compatível 100% com o ERP Vortex (edge functions)
 * ============================================================
 *
 *  Endpoints esperados pelo ERP:
 *    GET  /status?empresa_id=XXX
 *    GET  /connect?empresa_id=XXX
 *    GET  /disconnect?empresa_id=XXX
 *    POST /send-message?empresa_id=XXX
 *
 *  Webhook de callback (envia para o ERP):
 *    POST /functions/v1/whatsapp-webhook
 *    Eventos: qr_code, session_update, message_received, status_update
 *
 *  Instalação:
 *    npm install
 *    node index.js
 *
 *  Variáveis de ambiente (opcional, tem defaults):
 *    PORT=3001
 *    SUPABASE_URL=https://skicawqysqozkmmsipvm.supabase.co
 *    SUPABASE_ANON_KEY=eyJ...
 */

const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// ─── Config ───
const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://skicawqysqozkmmsipvm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNraWNhd3F5c3FvemttbXNpcHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NzM5MTQsImV4cCI6MjA4ODI0OTkxNH0.urBOWrAyAP8wJhxm8nvh9n0V-fnjeahePcvKTwNwnIU';
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

const app = express();
app.use(express.json({ limit: '50mb' }));

// ─── Sessions Map (empresa_id -> session data) ───
const sessions = new Map();

/**
 * Estrutura de cada sessão:
 * {
 *   client: WhatsApp Client instance,
 *   status: 'disconnected' | 'connecting' | 'waiting_qr' | 'connected',
 *   qr: string (base64 data URI do QR),
 *   phone: string,
 *   empresa_id: string,
 * }
 */

// ─── Helpers ───

function log(empresaId, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${empresaId?.slice(0, 8) || 'GLOBAL'}] ${msg}`);
}

async function sendWebhook(event, data) {
  try {
    await axios.post(WEBHOOK_URL, { event, data }, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      timeout: 10000,
    });
    log(data.empresa_id, `Webhook "${event}" enviado com sucesso`);
  } catch (err) {
    log(data.empresa_id, `Webhook "${event}" FALHOU: ${err.message}`);
  }
}

function getSession(empresaId) {
  return sessions.get(empresaId) || null;
}

function normalizePhone(phone) {
  if (!phone) return '';
  // Remove tudo que não é dígito
  let digits = phone.replace(/\D/g, '');
  // Garante código do país
  if (digits.length <= 11 && !digits.startsWith('55')) {
    digits = '55' + digits;
  }
  return digits;
}

// ─── Criar / Inicializar cliente WhatsApp ───

async function createWhatsAppClient(empresaId) {
  // Se já existe sessão ativa, destruir antes
  const existing = sessions.get(empresaId);
  if (existing?.client) {
    try {
      await existing.client.destroy();
    } catch (e) {
      log(empresaId, `Erro ao destruir sessão anterior: ${e.message}`);
    }
  }

  const sessionData = {
    client: null,
    status: 'connecting',
    qr: '',
    phone: '',
    empresa_id: empresaId,
  };
  sessions.set(empresaId, sessionData);

  const authPath = path.join(__dirname, '.wwebjs_auth', `session-${empresaId}`);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: empresaId, dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
      ],
    },
  });

  sessionData.client = client;

  // ─── Evento: QR Code ───
  client.on('qr', async (qr) => {
    log(empresaId, 'QR Code recebido');
    try {
      const qrDataUrl = await qrcode.toDataURL(qr, { width: 300 });
      sessionData.qr = qrDataUrl;
      sessionData.status = 'waiting_qr';

      // Enviar QR para o ERP via webhook
      await sendWebhook('qr_code', {
        empresa_id: empresaId,
        qr_code: qrDataUrl,
      });
    } catch (err) {
      log(empresaId, `Erro ao gerar QR: ${err.message}`);
    }
  });

  // ─── Evento: Autenticado ───
  client.on('authenticated', () => {
    log(empresaId, 'Autenticado com sucesso');
    sessionData.status = 'connecting';
    sessionData.qr = '';
  });

  // ─── Evento: Pronto (Conectado) ───
  client.on('ready', async () => {
    log(empresaId, 'WhatsApp PRONTO');
    const info = client.info;
    const phoneNumber = info?.wid?.user || '';
    sessionData.status = 'connected';
    sessionData.qr = '';
    sessionData.phone = phoneNumber;

    await sendWebhook('session_update', {
      empresa_id: empresaId,
      status: 'connected',
      phone_number: phoneNumber,
    });
  });

  // ─── Evento: Desconectado ───
  client.on('disconnected', async (reason) => {
    log(empresaId, `Desconectado: ${reason}`);
    sessionData.status = 'disconnected';
    sessionData.qr = '';

    await sendWebhook('session_update', {
      empresa_id: empresaId,
      status: 'disconnected',
    });

    // Limpar instância
    try {
      await client.destroy();
    } catch (e) {}
  });

  // ─── Evento: Falha na autenticação ───
  client.on('auth_failure', async (msg) => {
    log(empresaId, `Falha na autenticação: ${msg}`);
    sessionData.status = 'disconnected';
    sessionData.qr = '';

    await sendWebhook('session_update', {
      empresa_id: empresaId,
      status: 'disconnected',
    });
  });

  // ─── Evento: Mensagem recebida ───
  client.on('message', async (msg) => {
    try {
      // Ignorar mensagens de status/broadcast
      if (msg.from === 'status@broadcast') return;
      if (msg.isStatus) return;

      const contact = await msg.getContact();
      const senderName = contact?.pushname || contact?.name || '';
      
      // Resolve real phone number - LID numbers are NOT real phone numbers
      let phone = msg.from.replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
      
      // If the sender is a LID (not a real phone), try to get the real number from the contact
      const isLid = msg.from.endsWith('@lid') || (phone.length > 13 && !/^55\d{10,11}$/.test(phone));
      if (isLid) {
        log(empresaId, `Detectado LID: ${msg.from}, tentando resolver número real...`);
        
        // Try contact.number first (most reliable)
        if (contact?.number) {
          const contactNumber = String(contact.number).replace(/\D/g, '');
          if (contactNumber && contactNumber.length >= 8 && contactNumber.length <= 15) {
            log(empresaId, `LID resolvido via contact.number: ${phone} -> ${contactNumber}`);
            phone = contactNumber;
          }
        }
        
        // Try getNumberId as fallback
        if (isLid && phone === msg.from.replace(/@.*$/, '')) {
          try {
            const numberId = await client.getNumberId(msg.from);
            if (numberId?.user) {
              log(empresaId, `LID resolvido via getNumberId: ${phone} -> ${numberId.user}`);
              phone = numberId.user;
            }
          } catch (e) {
            log(empresaId, `getNumberId falhou para LID: ${e.message}`);
          }
        }
        
        // If still unresolved, try to find in existing chats by matching the LID
        if (phone.length > 13) {
          try {
            const chats = await client.getChats();
            for (const chat of chats) {
              if (chat.isGroup) continue;
              const chatContact = await chat.getContact();
              if (chatContact?.id?._serialized === msg.from && chatContact?.number) {
                const realNumber = String(chatContact.number).replace(/\D/g, '');
                if (realNumber.length >= 8 && realNumber.length <= 15) {
                  log(empresaId, `LID resolvido via chat scan: ${phone} -> ${realNumber}`);
                  phone = realNumber;
                  break;
                }
              }
            }
          } catch (e) {
            log(empresaId, `Chat scan para LID falhou: ${e.message}`);
          }
        }
        
        if (phone.length > 13) {
          log(empresaId, `AVISO: Não foi possível resolver LID ${msg.from} para número real. Usando como está.`);
        }
      }

      log(empresaId, `Mensagem de ${phone}: ${msg.body?.substring(0, 50) || '[mídia]'}`);

      // Determinar tipo de mensagem
      let messageType = 'text';
      let mediaBase64 = null;
      let mediaMimetype = null;
      let mediaFilename = null;

      if (msg.hasMedia) {
        try {
          const media = await msg.downloadMedia();
          if (media) {
            mediaBase64 = media.data; // base64 string
            mediaMimetype = media.mimetype;
            mediaFilename = media.filename || null;

            if (media.mimetype?.startsWith('image/')) messageType = 'image';
            else if (media.mimetype?.startsWith('video/')) messageType = 'video';
            else if (media.mimetype?.startsWith('audio/') || msg.type === 'ptt') messageType = msg.type === 'ptt' ? 'ptt' : 'audio';
            else if (msg.type === 'sticker') messageType = 'sticker';
            else messageType = 'document';
          }
        } catch (mediaErr) {
          log(empresaId, `Erro ao baixar mídia: ${mediaErr.message}`);
        }
      }

      // Verificar se é resposta a outra mensagem
      let replyTo = null;
      if (msg.hasQuotedMsg) {
        try {
          const quotedMsg = await msg.getQuotedMessage();
          // Não temos o ID do DB, mas podemos enviar null
          replyTo = null;
        } catch (e) {}
      }

      // Enviar para o ERP via webhook
      await sendWebhook('message_received', {
        empresa_id: empresaId,
        phone: phone,
        original_from: msg.from, // Original WhatsApp ID (e.g., xxx@lid or xxx@c.us)
        sender_name: senderName,
        content: msg.body || '',
        message_type: messageType,
        media: mediaBase64,
        media_mimetype: mediaMimetype,
        media_filename: mediaFilename,
        reply_to: replyTo,
      });
    } catch (err) {
      log(empresaId, `Erro ao processar mensagem: ${err.message}`);
    }
  });

  // ─── Evento: ACK (confirmação de entrega) ───
  client.on('message_ack', async (msg, ack) => {
    // ack: 0 = erro, 1 = enviado, 2 = entregue, 3 = lido
    // Não temos message_id do DB aqui, mas logamos
    // Se o front-end enviar message_id no metadata, pode-se rastrear
  });

  // Inicializar
  log(empresaId, 'Inicializando cliente WhatsApp...');
  try {
    await client.initialize();
  } catch (err) {
    log(empresaId, `Erro ao inicializar: ${err.message}`);
    sessionData.status = 'disconnected';
    sessionData.qr = '';
  }

  return sessionData;
}

// ════════════════════════════════════════════════════════════
//  ENDPOINTS
// ════════════════════════════════════════════════════════════

// ─── GET /status ───
app.get('/status', (req, res) => {
  const empresaId = req.query.empresa_id;
  if (!empresaId) {
    return res.status(400).json({ error: 'empresa_id é obrigatório' });
  }

  const session = getSession(empresaId);
  if (!session) {
    return res.json({
      connected: false,
      status: 'disconnected',
      qr: '',
      phone: '',
      empresa_id: empresaId,
    });
  }

  res.json({
    connected: session.status === 'connected',
    status: session.status,
    qr: session.qr || '',
    phone: session.phone || '',
    phone_number: session.phone || '',
    empresa_id: empresaId,
  });
});

// ─── GET /connect ───
app.get('/connect', async (req, res) => {
  const empresaId = req.query.empresa_id;
  if (!empresaId) {
    return res.status(400).json({ error: 'empresa_id é obrigatório' });
  }

  try {
    const existing = getSession(empresaId);

    // Se já está conectado, retornar status
    if (existing?.status === 'connected') {
      return res.json({
        connected: true,
        phone: existing.phone || '',
        phone_number: existing.phone || '',
        message: 'Já conectado',
      });
    }

    // Se já tem QR disponível, retornar
    if (existing?.status === 'waiting_qr' && existing?.qr) {
      return res.json({
        connected: false,
        qr: existing.qr,
        status: 'waiting_qr',
        message: 'QR Code disponível, escaneie com o WhatsApp',
      });
    }

    // Se já está conectando (sem QR ainda), não criar outra sessão
    if (existing?.status === 'connecting' || existing?.status === 'waiting_qr') {
      log(empresaId, 'Sessão já está sendo inicializada, aguardando...');
      // Esperar até 15s por QR ou conexão da sessão existente
      const startWait = Date.now();
      while (Date.now() - startWait < 15000) {
        await new Promise(r => setTimeout(r, 1000));
        if (existing.status === 'connected') {
          return res.json({ connected: true, phone: existing.phone || '', phone_number: existing.phone || '', message: 'Conectado com sucesso' });
        }
        if (existing.qr) {
          return res.json({ connected: false, qr: existing.qr, status: 'waiting_qr', message: 'QR Code gerado' });
        }
      }
      return res.json({ connected: false, status: existing.status, qr: '', message: 'Aguardando inicialização...' });
    }

    // Criar nova sessão
    log(empresaId, 'Criando nova sessão...');
    const session = await createWhatsAppClient(empresaId);

    // Esperar até 15s por QR ou conexão
    const startTime = Date.now();
    while (Date.now() - startTime < 15000) {
      await new Promise(r => setTimeout(r, 1000));

      if (session.status === 'connected') {
        return res.json({
          connected: true,
          phone: session.phone || '',
          phone_number: session.phone || '',
          message: 'Conectado com sucesso',
        });
      }

      if (session.qr) {
        return res.json({
          connected: false,
          qr: session.qr,
          status: 'waiting_qr',
          message: 'QR Code gerado, escaneie com o WhatsApp',
        });
      }
    }

    // Timeout - retornar status atual
    res.json({
      connected: false,
      status: session.status,
      qr: session.qr || '',
      message: 'Aguardando inicialização...',
    });
  } catch (err) {
    log(empresaId, `Erro no /connect: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /disconnect ───
app.get('/disconnect', async (req, res) => {
  const empresaId = req.query.empresa_id;
  if (!empresaId) {
    return res.status(400).json({ error: 'empresa_id é obrigatório' });
  }

  const session = getSession(empresaId);
  if (!session?.client) {
    sessions.delete(empresaId);
    return res.json({ connected: false, message: 'Sessão não encontrada' });
  }

  try {
    log(empresaId, 'Desconectando...');
    await session.client.logout();
    await session.client.destroy();
  } catch (err) {
    log(empresaId, `Erro ao desconectar: ${err.message}`);
    try { await session.client.destroy(); } catch (e) {}
  }

  sessions.delete(empresaId);

  // Limpar dados de autenticação local
  const authDir = path.join(__dirname, '.wwebjs_auth', `session-${empresaId}`);
  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      log(empresaId, 'Dados de sessão local removidos');
    }
  } catch (e) {
    log(empresaId, `Erro ao limpar dados locais: ${e.message}`);
  }

  await sendWebhook('session_update', {
    empresa_id: empresaId,
    status: 'disconnected',
  });

  res.json({ connected: false, message: 'Desconectado com sucesso' });
});

// ─── POST /send-message ───
app.post('/send-message', async (req, res) => {
  const empresaId = req.query.empresa_id || req.body.empresa_id;
  if (!empresaId) {
    return res.status(400).json({ error: 'empresa_id é obrigatório' });
  }

  const session = getSession(empresaId);
  if (!session?.client || session.status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não está conectado para esta empresa' });
  }

  const {
    phone,
    number,       // alias para phone (ERP envia ambos)
    whatsapp_id,  // Original WhatsApp ID (e.g., 107533314330705@lid or 5548991165568@c.us)
    message,
    message_type,
    media_url,
    media_mimetype,
    filename,
    message_id,   // ID da mensagem no banco do ERP
  } = req.body;

  const targetPhone = phone || number;
  if (!targetPhone && !whatsapp_id) {
    return res.status(400).json({ error: 'phone/number ou whatsapp_id é obrigatório' });
  }

  // Determinar possíveis IDs de destino (c.us, lid e chats já existentes)
  const buildCandidateIds = async () => {
    const candidates = [];
    const pushCandidate = (value) => {
      if (value && !candidates.includes(value)) {
        candidates.push(value);
      }
    };

    // Priority 1: Use whatsapp_id if available (original sender ID)
    if (whatsapp_id) {
      pushCandidate(whatsapp_id);
      // If it's a LID, also try to resolve it
      if (whatsapp_id.endsWith('@lid')) {
        try {
          const contact = await session.client.getContactById(whatsapp_id);
          if (contact?.id?._serialized && contact.id._serialized !== whatsapp_id) {
            pushCandidate(contact.id._serialized);
          }
          if (contact?.number) {
            pushCandidate(`${String(contact.number).replace(/\D/g, '')}@c.us`);
          }
        } catch (e) {
          log(empresaId, `Falha ao resolver whatsapp_id LID: ${e.message}`);
        }
      }
    }

    const rawTarget = String(targetPhone || '').trim();
    const numericTarget = rawTarget.replace(/\D/g, '');
    const numericTail = numericTarget ? numericTarget.slice(-8) : '';

    if (rawTarget.includes('@')) {
      pushCandidate(rawTarget);
    }

    if (numericTarget) {
      pushCandidate(`${numericTarget}@c.us`);
      pushCandidate(`${numericTarget}@s.whatsapp.net`);

      for (const lookupTarget of [numericTarget, `${numericTarget}@c.us`]) {
        try {
          const numberId = await session.client.getNumberId(lookupTarget);
          if (numberId?._serialized) {
            pushCandidate(numberId._serialized);
            log(empresaId, `Número resolvido via getNumberId: ${lookupTarget} -> ${numberId._serialized}`);
          }
        } catch (resolveErr) {
          log(empresaId, `Não foi possível resolver via getNumberId (${lookupTarget}): ${resolveErr.message}`);
        }
      }
    }

    if (rawTarget.endsWith('@lid')) {
      try {
        const contact = await session.client.getContactById(rawTarget);
        if (contact?.id?._serialized) {
          pushCandidate(contact.id._serialized);
          log(empresaId, `Contato LID resolvido: ${rawTarget} -> ${contact.id._serialized}`);
        }
        if (contact?.number) {
          pushCandidate(`${String(contact.number).replace(/\D/g, '')}@c.us`);
        }
      } catch (contactErr) {
        log(empresaId, `Falha ao resolver contato LID: ${contactErr.message}`);
      }
    }

    if (numericTarget) {
      try {
        const contactByNumber = await session.client.getContactById(`${numericTarget}@c.us`);
        if (contactByNumber?.id?._serialized) {
          pushCandidate(contactByNumber.id._serialized);
          log(empresaId, `Contato por número resolvido: ${numericTarget}@c.us -> ${contactByNumber.id._serialized}`);
        }
      } catch (contactErr) {
        log(empresaId, `Falha ao resolver contato por número: ${contactErr.message}`);
      }
    }

    try {
      const chats = await session.client.getChats();
      for (const chat of chats) {
        if (!chat || chat.isGroup) continue;

        const serialized = chat?.id?._serialized;
        if (!serialized) continue;

        const chatUser = String(chat?.id?.user || '').replace(/\D/g, '');
        const chatNumber = String(chat?.contact?.number || '').replace(/\D/g, '');
        const matchesRaw = serialized === rawTarget;
        const matchesNumeric = numericTarget && (
          chatUser === numericTarget ||
          chatNumber === numericTarget ||
          (numericTail && (chatUser.endsWith(numericTail) || chatNumber.endsWith(numericTail)))
        );

        if (matchesRaw || matchesNumeric) {
          pushCandidate(serialized);
        }
      }
    } catch (chatErr) {
      log(empresaId, `Falha ao varrer chats para fallback: ${chatErr.message}`);
    }

    return candidates.length ? candidates : [rawTarget];
  };

  try {
    const candidateIds = await buildCandidateIds();
    log(empresaId, `Tentando envio para IDs: ${candidateIds.join(', ')}`);

    let sentMsg = null;
    let sentTo = null;
    let lastError = null;

    for (const candidateId of candidateIds) {
      try {
        // Se tem media_url, enviar como mídia
        if (media_url && message_type !== 'text') {
          try {
            const media = await MessageMedia.fromUrl(media_url, {
              unsafeMime: true,
              reqOptions: { timeout: 30000 },
            });

            if (media_mimetype) {
              media.mimetype = media_mimetype;
            }
            if (filename) {
              media.filename = filename;
            }

            sentMsg = await session.client.sendMessage(candidateId, media, {
              caption: message || '',
              sendMediaAsDocument: message_type === 'document',
            });
          } catch (mediaErr) {
            log(empresaId, `Erro ao enviar mídia para ${candidateId}, tentando como texto: ${mediaErr.message}`);
            sentMsg = await session.client.sendMessage(candidateId, `${message || ''}\n${media_url}`);
          }
        } else {
          sentMsg = await session.client.sendMessage(candidateId, message || '');
        }

        sentTo = candidateId;
        break;
      } catch (sendErr) {
        lastError = sendErr;
        log(empresaId, `Falha ao enviar para ${candidateId}: ${sendErr.message}`);
      }
    }

    if (!sentMsg) {
      throw lastError || new Error('Falha ao enviar mensagem para todos os IDs candidatos');
    }

    log(empresaId, `Mensagem enviada com sucesso para ${sentTo || targetPhone}`);

    // Enviar status_update para o ERP se temos message_id
    if (message_id) {
      await sendWebhook('status_update', {
        message_id: message_id,
        status: 'sent',
      });
    }

    res.json({
      success: true,
      message_id: sentMsg?.id?.id || null,
      timestamp: sentMsg?.timestamp || null,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
    log(empresaId, `ERRO ao enviar mensagem: ${errMsg}`);

    // Enviar falha para o ERP
    if (message_id) {
      await sendWebhook('status_update', {
        message_id: message_id,
        status: 'failed',
      });
    }

    res.status(500).json({ error: `Falha ao enviar: ${errMsg}` });
  }
});

// ─── Health check ───
app.get('/', (req, res) => {
  const activeSessions = [];
  sessions.forEach((session, empresaId) => {
    activeSessions.push({
      empresa_id: empresaId,
      status: session.status,
      phone: session.phone || '',
      connected: session.status === 'connected',
    });
  });

  res.json({
    server: 'Vortex WhatsApp Server',
    version: '1.0.0',
    uptime: process.uptime(),
    active_sessions: activeSessions.length,
    sessions: activeSessions,
    webhook_url: WEBHOOK_URL,
    timestamp: new Date().toISOString(),
  });
});

// ─── Reset session (limpar dados e reconectar) ───
app.get('/reset', async (req, res) => {
  const empresaId = req.query.empresa_id;
  if (!empresaId) {
    return res.status(400).json({ error: 'empresa_id é obrigatório' });
  }

  log(empresaId, 'Resetando sessão...');

  // Destruir sessão atual
  const session = getSession(empresaId);
  if (session?.client) {
    try {
      await session.client.logout();
    } catch (e) {}
    try {
      await session.client.destroy();
    } catch (e) {}
  }
  sessions.delete(empresaId);

  // Limpar dados de autenticação
  const authDir = path.join(__dirname, '.wwebjs_auth', `session-${empresaId}`);
  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
  } catch (e) {}

  await sendWebhook('session_update', {
    empresa_id: empresaId,
    status: 'disconnected',
  });

  res.json({ success: true, message: 'Sessão resetada. Use /connect para reconectar.' });
});

// ════════════════════════════════════════════════════════════
//  INICIAR SERVIDOR
// ════════════════════════════════════════════════════════════

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║    VORTEX WHATSAPP SERVER v1.0.0             ║');
  console.log(`║    Rodando na porta ${PORT}                     ║`);
  console.log(`║    Webhook: ${WEBHOOK_URL.substring(0, 35)}...  ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('Endpoints disponíveis:');
  console.log(`  GET  http://localhost:${PORT}/status?empresa_id=XXX`);
  console.log(`  GET  http://localhost:${PORT}/connect?empresa_id=XXX`);
  console.log(`  GET  http://localhost:${PORT}/disconnect?empresa_id=XXX`);
  console.log(`  POST http://localhost:${PORT}/send-message?empresa_id=XXX`);
  console.log(`  GET  http://localhost:${PORT}/reset?empresa_id=XXX`);
  console.log(`  GET  http://localhost:${PORT}/  (health check)`);
  console.log('');
});
