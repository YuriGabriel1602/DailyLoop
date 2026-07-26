import "dotenv/config";
import express from "express";
import { startSession, logoutSession, resumeExistingSessions, sendMessage, SLOTS } from "./sessions.js";

const SHARED_SECRET = process.env.SIDECAR_SHARED_SECRET || "";
const PORT = process.env.SIDECAR_PORT || 8100;

const app = express();
app.use(express.json());

function requireSharedSecret(req, res, next) {
  if (!SHARED_SECRET || req.headers["x-sidecar-secret"] !== SHARED_SECRET) {
    return res.status(401).json({ detail: "Segredo compartilhado ausente ou inválido." });
  }
  next();
}

function requireValidSlot(req, res, next) {
  if (!SLOTS.includes(req.params.slot)) {
    return res.status(400).json({ detail: `Slot inválido: ${req.params.slot}` });
  }
  next();
}

app.post("/sessions/:ownerId/:slot/start", requireSharedSecret, requireValidSlot, async (req, res) => {
  try {
    await startSession(req.params.ownerId, req.params.slot);
    res.json({ status: "starting" });
  } catch (err) {
    console.error(`Falha ao iniciar sessão ${req.params.ownerId}:${req.params.slot}:`, err);
    res.status(500).json({ detail: "Falha ao iniciar a sessão do WhatsApp." });
  }
});

app.post("/sessions/:ownerId/:slot/send", requireSharedSecret, requireValidSlot, async (req, res) => {
  try {
    const messageId = await sendMessage(req.params.ownerId, req.params.slot, req.body || {});
    res.json({ status: "sent", message_id: messageId });
  } catch (err) {
    console.error(`Falha ao enviar mensagem (owner_id=${req.params.ownerId}:${req.params.slot}):`, err);
    res.status(500).json({ detail: "Falha ao enviar a mensagem." });
  }
});

app.post("/sessions/:ownerId/:slot/logout", requireSharedSecret, requireValidSlot, async (req, res) => {
  try {
    await logoutSession(req.params.ownerId, req.params.slot);
    res.json({ status: "logged_out" });
  } catch (err) {
    console.error(`Falha ao encerrar sessão ${req.params.ownerId}:${req.params.slot}:`, err);
    res.status(500).json({ detail: "Falha ao encerrar a sessão do WhatsApp." });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`WhatsApp sidecar rodando em http://127.0.0.1:${PORT}`);
  resumeExistingSessions();
});
