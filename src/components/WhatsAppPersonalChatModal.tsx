import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, MessageCirclePlus, Search, Send, X } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { api, ApiError, getStoredToken } from "@/lib/api";
import { useRealtimeSocket } from "@/lib/ws";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, fileToBase64 } from "@/lib/utils";

interface ChatListItem {
  id: number;
  jid: string;
  name: string;
  phone_number: string;
  last_message_at: string;
  last_message_preview: string;
  archived: boolean;
  unread_count: number;
  has_conversation: boolean;
}

interface SearchResult {
  message_id: number;
  chat_id: number;
  chat_name: string;
  content: string;
  created_at: string;
}

interface ChatMessage {
  id: number;
  chat_id: number;
  direction: "inbound" | "outbound";
  message_type: "text" | "image" | "unsupported";
  content: string;
  media_path: string | null;
  media_mime: string | null;
  status: string;
  created_at: string;
}

const MESSAGES_PAGE_SIZE = 50;

export function WhatsAppPersonalChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"conversas" | "arquivadas">("conversas");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<{ base64: string; mime: string; previewUrl: string } | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = getStoredToken();

  const loadChats = () => {
    api
      .get<ChatListItem[]>("/api/whatsapp-personal/chats")
      .then((data) => {
        setChats(data);
        setLoadingChats(false);
        setSelectedId((current) => current ?? data.find((c) => !c.archived)?.id ?? null);
      })
      .catch(() => setLoadingChats(false));
  };

  useEffect(() => {
    if (!open) return;
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Busca em TODO o histórico já sincronizado (não só nas conversas/mensagens
  // carregadas na tela) — debounced pra não disparar uma request por tecla.
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(() => {
      api
        .get<SearchResult[]>(`/api/whatsapp-personal/search?q=${encodeURIComponent(q)}`)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const openSearchResult = (chatId: number) => {
    const target = chats.find((c) => c.id === chatId);
    if (target) setTab(target.archived ? "arquivadas" : "conversas");
    setSelectedId(chatId);
    setSearch("");
  };

  useEffect(() => {
    if (!open || !selectedId) return;
    setLoadingMessages(true);
    setShowMessageSearch(false);
    setMessageSearch("");
    api
      .get<ChatMessage[]>(`/api/whatsapp-personal/chats/${selectedId}/messages?limit=${MESSAGES_PAGE_SIZE}`)
      .then((data) => {
        setMessages(data);
        setHasOlder(data.length === MESSAGES_PAGE_SIZE);
      })
      .finally(() => setLoadingMessages(false));
  }, [open, selectedId]);

  useEffect(() => {
    if (!open || !selectedId) return;
    setChats((prev) => prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c)));
    api.post(`/api/whatsapp-personal/chats/${selectedId}/read`).catch(() => {});
  }, [open, selectedId]);

  const suppressAutoScrollRef = useRef(false);

  useEffect(() => {
    if (suppressAutoScrollRef.current) {
      suppressAutoScrollRef.current = false;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, messages.length]);

  useRealtimeSocket("/api/inbox/ws", (event) => {
    if (event.type !== "whatsapp_personal_message") return;
    const msg = event.message as ChatMessage;
    if (event.chat_id === selectedId) {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      api.post(`/api/whatsapp-personal/chats/${selectedId}/read`).catch(() => {});
    }
    loadChats();
  });

  const loadOlder = async () => {
    if (!selectedId || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const older = await api.get<ChatMessage[]>(
        `/api/whatsapp-personal/chats/${selectedId}/messages?limit=${MESSAGES_PAGE_SIZE}&before_id=${messages[0].id}`
      );
      suppressAutoScrollRef.current = true;
      setMessages((prev) => [...older, ...prev]);
      setHasOlder(older.length === MESSAGES_PAGE_SIZE);
    } finally {
      setLoadingOlder(false);
    }
  };

  const pickImage = () => fileInputRef.current?.click();

  const onImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const base64 = await fileToBase64(file);
    setPendingImage({ base64, mime: file.type || "image/jpeg", previewUrl: URL.createObjectURL(file) });
  };

  const send = async () => {
    if (!selectedId || sending) return;
    if (!input.trim() && !pendingImage) return;
    setSending(true);
    const content = input;
    const image = pendingImage;
    setInput("");
    setPendingImage(null);
    try {
      const msg = await api.post<ChatMessage>(`/api/whatsapp-personal/chats/${selectedId}/messages`, {
        content,
        image_base64: image?.base64,
        mime_type: image?.mime,
      });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      loadChats();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  };

  const createChat = async () => {
    const digits = newChatPhone.replace(/\D/g, "");
    if (!digits) {
      toast.error("Informe um número válido (com DDI e DDD).");
      return;
    }
    setCreatingChat(true);
    try {
      const chat = await api.post<{ id: number }>("/api/whatsapp-personal/chats", { phone_number: digits });
      setNewChatOpen(false);
      setNewChatPhone("");
      setTab("conversas");
      setSelectedId(chat.id);
      loadChats();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível iniciar a conversa.");
    } finally {
      setCreatingChat(false);
    }
  };

  const selected = chats.find((c) => c.id === selectedId) ?? null;

  const visibleChats = chats
    .filter((c) => c.archived === (tab === "arquivadas"))
    .filter((c) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.phone_number.includes(q);
    });

  const visibleMessages =
    showMessageSearch && messageSearch.trim()
      ? messages.filter((m) => m.content.toLowerCase().includes(messageSearch.trim().toLowerCase()))
      : messages;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <SiWhatsapp size={15} className="text-[#0d8a4f]" /> WhatsApp Pessoal
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-64 shrink-0 flex-col border-r">
            <div className="flex items-center gap-1 border-b px-2 py-2">
              <button
                onClick={() => setTab("conversas")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  tab === "conversas" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                Conversas
              </button>
              <button
                onClick={() => setTab("arquivadas")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  tab === "arquivadas" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                Arquivadas
              </button>
              <Button size="icon-sm" variant="ghost" onClick={() => setNewChatOpen((v) => !v)} title="Nova conversa">
                <MessageCirclePlus size={15} />
              </Button>
            </div>

            {newChatOpen && (
              <div className="flex items-center gap-1.5 border-b p-2">
                <input
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createChat()}
                  placeholder="Número com DDI+DDD"
                  autoFocus
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-ring"
                />
                <Button size="icon-sm" onClick={createChat} disabled={creatingChat}>
                  <Send size={12} />
                </Button>
              </div>
            )}

            <div className="relative border-b p-2">
              <Search size={13} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar contato..."
                className="w-full rounded-md border border-input bg-background py-1.5 pr-2 pl-7 text-xs outline-none focus:border-ring"
              />
            </div>

            <ScrollArea className="min-h-0 flex-1">
              {loadingChats ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                </div>
              ) : visibleChats.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground">
                  <SiWhatsapp size={20} className="opacity-40" />
                  <p className="text-sm">
                    {tab === "arquivadas" ? "Nenhuma conversa arquivada." : "Nenhum contato encontrado."}
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5 p-2">
                  {visibleChats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted",
                        c.id === selectedId && "bg-primary/10 hover:bg-primary/10"
                      )}
                    >
                      <div className="flex w-full items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</p>
                        {c.unread_count > 0 && (
                          <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="w-full truncate text-xs text-muted-foreground">
                        {c.has_conversation ? c.last_message_preview || "—" : "Sem conversa ainda"}
                      </p>
                    </button>
                  ))}
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
                      onClick={() => openSearchResult(r.chat_id)}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <p className="w-full truncate text-sm font-medium">{r.chat_name}</p>
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
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{selected.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{selected.phone_number}</p>
                  </div>
                  <Button size="icon-sm" variant="ghost" onClick={() => setShowMessageSearch((v) => !v)}>
                    <Search size={14} />
                  </Button>
                </div>

                {showMessageSearch && (
                  <div className="border-b px-4 py-2">
                    <input
                      value={messageSearch}
                      onChange={(e) => setMessageSearch(e.target.value)}
                      placeholder="Buscar nas mensagens já carregadas..."
                      autoFocus
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-ring"
                    />
                  </div>
                )}

                <ScrollArea className="min-h-0 flex-1 px-4">
                  <div className="space-y-3 py-4">
                    {hasOlder && !(showMessageSearch && messageSearch.trim()) && (
                      <div className="flex justify-center pb-2">
                        <Button size="sm" variant="outline" onClick={loadOlder} disabled={loadingOlder}>
                          {loadingOlder ? "Carregando..." : "Carregar mais antigas"}
                        </Button>
                      </div>
                    )}
                    {loadingMessages ? (
                      [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-2/3 rounded-2xl" />)
                    ) : (
                      visibleMessages.map((m) => (
                        <div key={m.id} className={cn("flex", m.direction === "outbound" && "justify-end")}>
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-card-foreground",
                              m.direction === "outbound" ? "rounded-tr-sm" : "rounded-tl-sm"
                            )}
                          >
                            {m.message_type === "image" && m.media_path ? (
                              <div className="space-y-1.5">
                                <img
                                  src={`${api.baseUrl}/api/whatsapp-personal/media/${m.id}?token=${encodeURIComponent(token ?? "")}`}
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
                            {m.status === "failed" && (
                              <p className="mt-1 text-[10px] text-destructive">Falha ao enviar</p>
                            )}
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
                      onKeyDown={(e) => e.key === "Enter" && send()}
                      placeholder={pendingImage ? "Legenda (opcional)..." : "Mensagem..."}
                      className="w-full rounded-xl border border-input bg-background py-2.5 pr-11 pl-4 text-sm outline-none focus:border-ring"
                    />
                    <Button
                      size="icon-sm"
                      onClick={send}
                      disabled={sending || (!input.trim() && !pendingImage)}
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
      </DialogContent>
    </Dialog>
  );
}
