import { useEffect, useRef, useState } from "react";
import { Bot, Inbox, Instagram, Mail, MessageCircle, Pause, Phone, Play, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useRealtimeSocket } from "@/lib/ws";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Contact {
  id: number;
  name: string;
  phone_number: string | null;
  channel: "whatsapp" | "instagram" | "facebook" | "email";
  external_id: string;
}

interface ConversationListItem {
  id: number;
  channel: "whatsapp" | "instagram" | "facebook" | "email";
  ai_enabled: boolean;
  status: string;
  last_message_at: string;
  created_at: string;
  contact: Contact;
}

interface ConversationMessage {
  id: number;
  conversation_id: number;
  direction: "inbound" | "outbound";
  sender: "contact" | "ai" | "agent";
  content: string;
  created_at: string;
}

const CHANNEL_ICONS = { whatsapp: Phone, instagram: Instagram, facebook: MessageCircle, email: Mail };

const SENDER_LABEL: Record<ConversationMessage["sender"], string> = {
  contact: "Lead",
  ai: "Prometheus (IA)",
  agent: "Você",
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadConversations = () => {
    api.get<ConversationListItem[]>("/api/inbox/conversations").then((data) => {
      setConversations(data);
      setLoadingList(false);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    });
  };

  useEffect(loadConversations, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingMessages(true);
    api
      .get<ConversationMessage[]>(`/api/inbox/conversations/${selectedId}/messages`)
      .then(setMessages)
      .finally(() => setLoadingMessages(false));
  }, [selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useRealtimeSocket("/api/inbox/ws", (event) => {
    if (event.type === "message") {
      const msg = event.message as ConversationMessage;
      if (msg.conversation_id === selectedId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      loadConversations();
    } else if (event.type === "conversation_updated") {
      loadConversations();
    }
  });

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const toggleAi = async () => {
    if (!selected) return;
    await api.patch(`/api/inbox/conversations/${selected.id}`, { ai_enabled: !selected.ai_enabled });
    loadConversations();
  };

  const sendReply = async () => {
    if (!input.trim() || !selected) return;
    const content = input;
    setInput("");
    const msg = await api.post<ConversationMessage>(`/api/inbox/conversations/${selected.id}/messages`, { content });
    setMessages((prev) => [...prev, msg]);
    loadConversations();
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex w-72 shrink-0 flex-col border-r">
        <PageHeader
          title="Inbox"
          description="Conversas dos seus leads."
          help={
            <>
              <p>Conversas em tempo real de WhatsApp, Instagram e Facebook, assim que você conecta cada canal em Integrações.</p>
              <p>Dentro de cada conversa dá pra <strong className="text-foreground">pausar a IA</strong> e assumir o atendimento você mesmo, ou deixar respondendo sozinha.</p>
            </>
          }
        />
        <ScrollArea className="flex-1">
          {loadingList ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Inbox size={24} className="opacity-40" />
              <p className="px-4 text-sm">Nenhuma conversa ainda.</p>
            </div>
          ) : (
            <div className="space-y-0.5 p-2">
              {conversations.map((c) => {
                const Icon = CHANNEL_ICONS[c.channel];
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted",
                      c.id === selectedId && "bg-primary/10 hover:bg-primary/10"
                    )}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.contact.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.ai_enabled ? "IA respondendo" : "Pausado"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 border-b px-4 py-3 md:px-6">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{selected.contact.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selected.contact.phone_number || selected.contact.external_id}
                </p>
              </div>
              {selected.channel === "email" ? (
                <span className="shrink-0 text-[11px] text-muted-foreground">IA não responde email ainda</span>
              ) : (
                <Button
                  size="sm"
                  variant={selected.ai_enabled ? "outline" : "default"}
                  onClick={toggleAi}
                  className="shrink-0 gap-1.5"
                >
                  {selected.ai_enabled ? <Pause size={13} /> : <Play size={13} />}
                  {selected.ai_enabled ? "Pausar IA" : "Retomar IA"}
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 px-4 md:px-6">
              <div className="space-y-4 py-4">
                {loadingMessages ? (
                  [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-2/3 rounded-2xl" />)
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={cn("flex gap-3", m.direction === "outbound" && "flex-row-reverse")}>
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full border",
                          m.sender === "ai"
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border bg-muted text-foreground"
                        )}
                      >
                        {m.sender === "ai" ? <Bot size={15} /> : m.sender[0].toUpperCase()}
                      </div>
                      <div className="max-w-[70%]">
                        <p className="mb-1 text-[10px] text-muted-foreground">{SENDER_LABEL[m.sender]}</p>
                        <div
                          className={cn(
                            "rounded-2xl border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-card-foreground",
                            m.direction === "outbound" ? "rounded-tr-sm" : "rounded-tl-sm"
                          )}
                        >
                          {m.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-3 md:p-4">
              <div className="relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  placeholder="Responder manualmente pausa a IA nesta conversa..."
                  className="w-full rounded-xl border border-input bg-background py-2.5 pr-11 pl-4 text-sm outline-none focus:border-ring"
                />
                <Button size="icon-sm" onClick={sendReply} disabled={!input.trim()} className="absolute top-1/2 right-1.5 -translate-y-1/2">
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
