const BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";
const SHARED_SECRET = process.env.SIDECAR_SHARED_SECRET || "";

// Cada slot fala com um router diferente do backend: "personal" alimenta as tabelas
// só-pessoais (WhatsappPersonalChat/Message), "business" alimenta o Inbox/CRM
// (Contact/Conversation/ConversationMessage) — mesmo shape de evento, destinos
// diferentes de propósito, pra nunca misturar os dois mundos.
const EVENT_URL = {
  personal: `${BACKEND_URL}/api/whatsapp-personal/event`,
  business: `${BACKEND_URL}/api/whatsapp-business/qr/event`,
};

export async function postEvent(payload, slot = "personal") {
  try {
    const res = await fetch(EVENT_URL[slot], {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sidecar-Secret": SHARED_SECRET },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`Backend (${slot}) recusou o evento '${payload.type}' (owner_id=${payload.owner_id}): ${res.status}`);
    }
  } catch (err) {
    console.error(`Falha ao notificar o backend (${slot}) do evento '${payload.type}':`, err);
  }
}

// Lotes do backfill de histórico (history sync) — ao contrário de postEvent (que é
// fire-and-forget), aqui vale insistir: é um import único e perder um lote no meio
// deixa um buraco silencioso no histórico da conversa.
export async function postHistoryBatch(payload, slot = "personal", retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(EVENT_URL[slot], {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Sidecar-Secret": SHARED_SECRET },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;
      console.error(`Backend (${slot}) recusou lote de histórico (owner_id=${payload.owner_id}): ${res.status}`);
    } catch (err) {
      console.error(`Falha ao enviar lote de histórico (tentativa ${attempt + 1}/${retries + 1}):`, err);
    }
  }
  return false;
}
