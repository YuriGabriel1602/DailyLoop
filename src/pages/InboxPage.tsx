import { useEffect, useRef, useState } from "react";
import { Bot, ImagePlus, Inbox, Instagram, Mail, MessageCircle, Pause, Phone, Play, Search, Send, X } from "lucide-react";
import { api, getStoredToken } from "@/lib/api";
import { useRealtimeSocket } from "@/lib/ws";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, fileToBase64 } from "@/lib/utils";

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
  message_type: "text" | "image" | "unsupported";
  media_path: string | null;
  media_mime: string | null;
}

const CHANNEL_ICONS = { whatsapp: Phone, instagram: Instagram, facebook: MessageCircle, email: Mail };

const SENDER_LABEL: Record<ConversationMessage["sender"], string> = {
  contact: "Lead",
  ai: "Prometheus (IA)",
  agent: "Você",
};

interface SearchResult {
  message_id: number;
  conversation_id: number;
  contact_name: string;
  channel: string;
  content: string;
  created_at: string;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<{ base64: string; mime: string; previewUrl: string } | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = getStoredToken();

  const loadConversations = () => {
    api.get<ConversationListItem[]>("/api/inbox/conversations").then((data) => {
      setConversations(data);
      setLoadingList(false);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    });
  };

  useEffect(loadConversations, []);

  // Busca em todo o histórico de mensagens (não só a conversa aberta) — debounced.
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(() => {
      api
        .get<SearchResult[]>(`/api/inbox/search?q=${encodeURIComponent(q)}`)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

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

  const visibleConversations = conversations.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.contact.name.toLowerCase().includes(q) || (c.contact.phone_number || "").includes(q);
  });

  const openSearchResult = (conversationId: number) => {
    setSelectedId(conversationId);
    setSearch("");
  };

  const toggleAi = async () => {
    if (!selected) return;
    await api.patch(`/api/inbox/conversations/${selected.id}`, { ai_enabled: !selected.ai_enabled });
    loadConversations();
  };

  const pickImage = () => fileInputRef.current?.click();

  const onImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const base64 = await fileToBase64(file);
    setPendingImage({ base64, mime: file.type || "image/jpeg", previewUrl: URL.createObjectURL(file) });
  };

  const sendReply = async () => {
    if (!selected) return;
    if (!input.trim() && !pendingImage) return;
    const content = input;
    const image = pendingImage;
    setInput("");
    setPendingImage(null);
    const msg = await api.post<ConversationMessage>(`/api/inbox/conversations/${selected.id}/messages`, {
      content,
      image_base64: image?.base64,
      mime_type: image?.mime,
    });
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
        <div className="relative border-b p-2">
          <Search size={13} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lead ou mensagem..."
            className="w-full rounded-md border border-input bg-background py-1.5 pr-2 pl-7 text-xs outline-none focus:border-ring"
          />
        </div>
        <ScrollArea className="min-h-0 flex-1">
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
              {visibleConversations.map((c) => {
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

          {search.trim() && searchResults.length > 0 && (
            <div className="space-y-0.5 border-t p-2">
              <p className="px-2.5 py-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Mensagens
              </p>
              {searchResults.map((r) => (
                <button
                  key={r.message_id}
                  onClick={() => openSearchResult(r.conversation_id)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted"
                >
                  <p className="w-full truncate text-sm font-medium">{r.contact_name}</p>
                  <p className="w-full truncate text-xs text-muted-foreground">{r.content}</p>
                </button>
              ))}
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

            <ScrollArea className="min-h-0 flex-1 px-4 md:px-6">
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
                          {m.message_type === "image" && m.media_path ? (
                            <div className="space-y-1.5">
                              <img
                                src={`${api.baseUrl}/api/inbox/media/${m.id}?token=${encodeURIComponent(token ?? "")}`}
                                alt="Imagem"
                                className="max-h-64 rounded-lg object-cover"
                              />
                              {m.content && <p>{m.content}</p>}
                            </div>
                          ) : m.message_type === "unsupported" ? (
                            <p className="italic text-muted-foreground">{m.content}</p>
                          ) : (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-3 md:p-4">
              {pendingImage && (
                <div className="mb-2 flex items-center gap-2">
                  <img src={pendingImage.previewUrl} alt="Anexo" className="size-12 rounded-lg object-cover" />
                  <Button size="icon-sm" variant="ghost" onClick={() => setPendingImage(null)}>
                    <X size={14} />
                  </Button>
                </div>
              )}
              <div className="relative flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageSelected} />
                <Button size="icon-sm" variant="ghost" onClick={pickImage} className="shrink-0">
                  <ImagePlus size={16} />
                </Button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  placeholder={pendingImage ? "Legenda (opcional)..." : "Responder manualmente pausa a IA nesta conversa..."}
                  className="w-full rounded-xl border border-input bg-background py-2.5 pr-11 pl-4 text-sm outline-none focus:border-ring"
                />
                <Button
                  size="icon-sm"
                  onClick={sendReply}
                  disabled={!input.trim() && !pendingImage}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2"
                >
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
