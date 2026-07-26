import fs from "fs";
import path from "path";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode";
import { postEvent, postHistoryBatch } from "./backendClient.js";

const SESSIONS_DIR = process.env.SESSIONS_DIR || path.join(process.cwd(), "sessions");
const logger = pino({ level: process.env.LOG_LEVEL || "warn" });
const HISTORY_BATCH_SIZE = 200;
export const SLOTS = ["personal", "business"];

// Uma sessão Baileys por (owner_id, slot) — "personal" é o WhatsApp Pessoal, "business"
// é o WhatsApp Empresarial quando conectado via QR Code (alternativa à Cloud API
// oficial). Guarda as chaves reais do dispositivo WhatsApp em JSON puro dentro de
// SESSIONS_DIR/{owner_id}/{slot}/ (formato do próprio Baileys) — fora do alcance do
// crypto_service.py (que só cobre colunas do banco), trate essa pasta como segredo em
// repouso.
const sockets = new Map();

function sessionKey(ownerId, slot) {
  return `${ownerId}:${slot}`;
}

// Sessões criadas antes do suporte a múltiplos slots ficavam direto em
// SESSIONS_DIR/{owner_id}/ (sem subpasta) — move pra SESSIONS_DIR/{owner_id}/personal/
// na primeira vez que o sidecar sobe com essa versão, pra não forçar reescanear o QR.
function migrateFlatSessionToPersonalSlot(ownerId) {
  const ownerDir = path.join(SESSIONS_DIR, String(ownerId));
  const personalDir = path.join(ownerDir, "personal");
  if (fs.existsSync(personalDir)) return;
  if (!fs.existsSync(path.join(ownerDir, "creds.json"))) return;
  fs.mkdirSync(personalDir, { recursive: true });
  for (const entry of fs.readdirSync(ownerDir)) {
    if (SLOTS.includes(entry)) continue;
    fs.renameSync(path.join(ownerDir, entry), path.join(personalDir, entry));
  }
  logger.info(`Sessão antiga do owner_id=${ownerId} migrada pro slot "personal".`);
}

// Fora de escopo por enquanto: grupos (@g.us) e o feed de Status/Stories
// (status@broadcast, e listas de transmissão em geral em @broadcast) — nenhum dos
// dois é uma conversa 1-a-1 de verdade.
function isExcludedJid(jid) {
  return typeof jid === "string" && (jid.endsWith("@g.us") || jid.endsWith("@broadcast"));
}

// Contatos "mais novos" do WhatsApp são identificados por @lid (Linked ID, esconde o
// número real) em vez de @s.whatsapp.net — só que as MENSAGENS desses contatos chegam
// com remoteJid=@lid, enquanto o objeto de Contact às vezes só traz o nome associado ao
// @s.whatsapp.net (ou vice-versa). O Baileys expõe os dois lados dessa ponte no mesmo
// objeto (`id`, `lid`, `jid`) — registra o nome pra TODAS as variantes conhecidas, senão
// o nome fica pendurado no identificador errado e a conversa continua mostrando só número.
function applyContactName(chatMeta, contact) {
  const name = contact.name || contact.notify || "";
  if (!name) return;
  const variants = new Set([contact.id, contact.lid, contact.jid].filter((j) => j && !isExcludedJid(j)));
  for (const jid of variants) {
    const existing = chatMeta.get(jid);
    if (existing) existing.name = name;
    else chatMeta.set(jid, { jid, name, archived: false, unread_count: 0 });
  }
}

function extractText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    ""
  );
}

// Grupos ficam fora de escopo por enquanto (metadados de participantes complicam o
// modelo de dados). Vídeo/áudio/documento/figurinha viram um placeholder de texto em
// vez de sumir silenciosamente — só imagem é baixada/renderizada de verdade.
async function buildMessagePayload(sock, msg) {
  const remoteJid = msg.key?.remoteJid;
  if (!remoteJid || isExcludedJid(remoteJid) || !msg.message) return null;

  const timestampRaw = msg.messageTimestamp;
  const timestamp = typeof timestampRaw === "number" ? timestampRaw : Number(timestampRaw || 0) || undefined;
  const base = {
    jid: remoteJid,
    direction: msg.key.fromMe ? "outbound" : "inbound",
    external_message_id: msg.key.id || "",
    push_name: msg.pushName || "",
    timestamp,
  };

  if (msg.message.imageMessage) {
    try {
      const buffer = await downloadMediaMessage(msg, "buffer", {}, { logger, reuploadRequest: sock.updateMediaMessage });
      return {
        ...base,
        message_type: "image",
        content: msg.message.imageMessage.caption || "",
        media_base64: buffer.toString("base64"),
        media_mime: msg.message.imageMessage.mimetype || "image/jpeg",
      };
    } catch (err) {
      logger.error(err, "Falha ao baixar imagem");
      return { ...base, message_type: "unsupported", content: "📎 Não foi possível baixar a imagem" };
    }
  }

  const text = extractText(msg);
  if (text) return { ...base, message_type: "text", content: text };

  const unsupportedLabel = msg.message.videoMessage
    ? "vídeo"
    : msg.message.audioMessage
      ? "áudio"
      : msg.message.documentMessage
        ? "documento"
        : msg.message.stickerMessage
          ? "figurinha"
          : null;
  if (unsupportedLabel) {
    return { ...base, message_type: "unsupported", content: `📎 Mídia não suportada: ${unsupportedLabel}` };
  }

  return null; // mensagens de sistema/protocolo sem conteúdo visível — ignora
}

export async function startSession(ownerId, slot) {
  if (!SLOTS.includes(slot)) throw new Error(`Slot inválido: ${slot}`);
  const key = sessionKey(ownerId, slot);
  if (sockets.has(key)) return sockets.get(key);

  if (slot === "personal") migrateFlatSessionToPersonalSlot(ownerId);

  const sessionDir = path.join(SESSIONS_DIR, String(ownerId), slot);
  fs.mkdirSync(sessionDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  // syncFullHistory só tem efeito num pareamento novo (QR Code do zero) — uma sessão
  // já conectada antes dessa opção existir não recebe backfill retroativo.
  const sock = makeWASocket({ auth: state, version, logger: logger.child({ ownerId, slot }), syncFullHistory: true });
  sockets.set(key, sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrDataUrl = await qrcode.toDataURL(qr);
      await postEvent({ owner_id: Number(ownerId), type: "qr", qr_data_url: qrDataUrl }, slot);
    }

    if (connection === "open") {
      const jid = sock.user?.id || "";
      await postEvent({ owner_id: Number(ownerId), type: "connected", jid, phone_number: jid.split(":")[0] }, slot);
    }

    if (connection === "close") {
      sockets.delete(key);
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      logger.warn({ statusCode }, `Conexão fechada (owner_id=${ownerId}, slot=${slot})`);
      if (statusCode === DisconnectReason.loggedOut) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        await postEvent({ owner_id: Number(ownerId), type: "disconnected" }, slot);
      } else {
        // Queda de rede/reinício do WhatsApp no celular etc — reconecta sozinho, sem
        // precisar de novo QR (a sessão salva em disco continua válida).
        startSession(ownerId, slot).catch((err) => logger.error(err, `Falha ao reconectar sessão ${key}`));
      }
    }
  });

  // Disparado uma (ou algumas, em lotes) vez logo após um pareamento novo, com o
  // backfill de conversas/contatos/mensagens do celular. `chats` traz archived/
  // unreadCount; `contacts` traz o nome salvo — mescla os dois por jid pra listar
  // TODO contato conhecido, mesmo sem nenhuma mensagem trocada ainda.
  sock.ev.on("messaging-history.set", async ({ chats, contacts, messages }) => {
    const chatMeta = new Map();
    for (const c of chats || []) {
      if (isExcludedJid(c.id)) continue;
      chatMeta.set(c.id, { jid: c.id, name: c.name || "", archived: !!c.archived, unread_count: c.unreadCount || 0 });
    }
    for (const c of contacts || []) {
      applyContactName(chatMeta, c);
    }
    const historyChats = Array.from(chatMeta.values());

    const payloads = [];
    for (const msg of messages || []) {
      try {
        const payload = await buildMessagePayload(sock, msg);
        if (payload) payloads.push(payload);
      } catch (err) {
        logger.error(err, "Falha ao processar mensagem do histórico");
      }
    }

    if (payloads.length === 0) {
      if (historyChats.length > 0) {
        await postHistoryBatch(
          { owner_id: Number(ownerId), type: "history_sync", history_chats: historyChats, history_messages: [] },
          slot
        );
      }
      return;
    }

    for (let i = 0; i < payloads.length; i += HISTORY_BATCH_SIZE) {
      await postHistoryBatch(
        {
          owner_id: Number(ownerId),
          type: "history_sync",
          history_chats: i === 0 ? historyChats : [],
          history_messages: payloads.slice(i, i + HISTORY_BATCH_SIZE),
        },
        slot
      );
    }
  });

  // Contatos novos/atualizados chegando depois do backfill inicial (agenda sincronizando
  // aos poucos, ou contato novo salvo no celular) — só atualiza o nome, nunca mexe em
  // archived/unread_count (isso é responsabilidade do chats.update abaixo).
  sock.ev.on("contacts.upsert", async (contacts) => {
    const meta = new Map();
    for (const c of contacts || []) applyContactName(meta, c);
    const list = Array.from(meta.values());
    if (list.length) await postEvent({ owner_id: Number(ownerId), type: "contacts", history_chats: list }, slot);
  });

  // Atualizações incrementais de contato (WhatsApp preenchendo nome aos poucos,
  // sobretudo pra contatos @lid cujo nome real demora a chegar) — mesmo tratamento.
  sock.ev.on("contacts.update", async (updates) => {
    const meta = new Map();
    for (const c of updates || []) applyContactName(meta, c);
    const list = Array.from(meta.values());
    if (list.length) await postEvent({ owner_id: Number(ownerId), type: "contacts", history_chats: list }, slot);
  });

  // Contatos mais novos usam @lid (WhatsApp "linked ID", que esconde o número real) em
  // vez de @s.whatsapp.net — o Baileys às vezes descobre o número de telefone de fato
  // por trás de um @lid depois, e avisa aqui. Não dá pra pedir isso sob demanda nessa
  // versão da lib, só escutar oportunisticamente quando acontecer.
  sock.ev.on("chats.phoneNumberShare", async ({ lid, jid }) => {
    if (isExcludedJid(lid) || !jid) return;
    await postEvent({ owner_id: Number(ownerId), type: "phone_share", jid: lid, phone_number: jid.split("@")[0] }, slot);
  });

  // Usuário arquiva/desarquiva uma conversa no próprio celular — reflete aqui.
  sock.ev.on("chats.update", async (updates) => {
    for (const u of updates || []) {
      if (!u.id || isExcludedJid(u.id) || u.archived === undefined || u.archived === null) continue;
      await postEvent({ owner_id: Number(ownerId), type: "chat_meta", jid: u.id, archived: !!u.archived }, slot);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      try {
        const payload = await buildMessagePayload(sock, msg);
        if (payload) await postEvent({ owner_id: Number(ownerId), type: "message", message: payload }, slot);
      } catch (err) {
        logger.error(err, "Falha ao processar mensagem recebida");
      }
    }
  });

  return sock;
}

export async function sendMessage(ownerId, slot, { jid, text, image_base64, mime_type, caption }) {
  if (!SLOTS.includes(slot)) throw new Error(`Slot inválido: ${slot}`);
  const sock = sockets.get(sessionKey(ownerId, slot));
  if (!sock) throw new Error("Sessão do WhatsApp não está conectada.");

  const content = image_base64
    ? { image: Buffer.from(image_base64, "base64"), mimetype: mime_type || "image/jpeg", caption: caption || undefined }
    : { text: text || "" };

  const result = await sock.sendMessage(jid, content);
  return result?.key?.id || "";
}

export async function logoutSession(ownerId, slot) {
  if (!SLOTS.includes(slot)) throw new Error(`Slot inválido: ${slot}`);
  const key = sessionKey(ownerId, slot);
  const sock = sockets.get(key);
  if (sock) {
    try {
      await sock.logout();
    } catch {
      // já desconectado do lado do WhatsApp — segue pro cleanup local mesmo assim
    }
    sockets.delete(key);
  }
  fs.rmSync(path.join(SESSIONS_DIR, String(ownerId), slot), { recursive: true, force: true });
}

export function resumeExistingSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  for (const ownerId of fs.readdirSync(SESSIONS_DIR)) {
    migrateFlatSessionToPersonalSlot(ownerId);
    const ownerDir = path.join(SESSIONS_DIR, ownerId);
    for (const slot of SLOTS) {
      if (!fs.existsSync(path.join(ownerDir, slot, "creds.json"))) continue;
      startSession(ownerId, slot).catch((err) => logger.error(err, `Falha ao retomar sessão ${ownerId}:${slot}`));
    }
  }
}
