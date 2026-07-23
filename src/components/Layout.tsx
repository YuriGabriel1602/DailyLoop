import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookHeart, CalendarDays, CheckCircle2, Compass, Flame, Globe, Home, Inbox, LogOut, Loader2, Plug, ScrollText,
  Send, ShieldCheck, StickyNote, Sparkle, Sparkles, User, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { api, ApiError, registerUnauthorizedHandler } from "@/lib/api";
import { useStore, type AuthUser, type WorldMode } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/Logo";
import { IntegrationsTray } from "@/components/IntegrationsTray";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const REALM_GREETING: Record<WorldMode, string> = {
  personal: "Prometheus online. Como posso ajudar?",
  business: "Prometheus (consultor de negócio) online. Como está o funil hoje?",
};

const PrometheusSheet = ({
  isOpen,
  onClose,
  initialMessage,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string | null;
}) => {
  const mode = useStore((s) => s.mode);
  const realm = mode === "business" ? "empresarial" : "pessoal";
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (text: string) => {
    setChat((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const data = await api.post<{ response: string }>("/api/chat", { message: text, realm });
      setChat((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não consegui falar com o backend agora.";
      setChat((prev) => [...prev, { role: "assistant", content: message }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    api
      .get<ChatMessage[]>(`/api/chat/history?realm=${realm}`)
      .then((history) => setChat(history.length ? history : [{ role: "assistant", content: REALM_GREETING[mode] }]))
      .catch(() => setChat([{ role: "assistant", content: REALM_GREETING[mode] }]))
      .then(() => {
        // só depois do histórico carregado — senão a resposta do fetch sobrescreve a
        // mensagem inicial otimista que o Launcher acabou de mandar pro chat.
        if (initialMessage) sendMessage(initialMessage);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, realm, mode]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    await sendMessage(userMsg);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 text-primary">
            <Sparkle size={18} /> Prometheus
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-normal text-muted-foreground">
              {mode === "business" ? "Empresarial" : "Pessoal"}
            </span>
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {chat.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border",
                    msg.role === "assistant" ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-muted text-foreground"
                  )}
                >
                  {msg.role === "assistant" ? <Sparkle size={15} /> : <User size={15} />}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-card-foreground",
                    msg.role === "assistant" ? "rounded-tl-sm" : "rounded-tr-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="ml-11 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> Pensando...
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>
        <div className="border-t p-4">
          <div className="relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escreva uma mensagem..."
              className="w-full rounded-xl border border-input bg-background py-2.5 pr-11 pl-4 text-sm outline-none focus:border-ring"
            />
            <Button size="icon-sm" onClick={handleSend} disabled={loading} className="absolute top-1/2 right-1.5 -translate-y-1/2">
              <Send size={14} />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

const PERSONAL_NAV_ITEMS: NavItem[] = [
  { to: "/", icon: Home, label: "Painel", end: true },
  { to: "/tasks", icon: CheckCircle2, label: "Tarefas" },
  { to: "/finance", icon: Wallet, label: "Finanças" },
  { to: "/notes", icon: StickyNote, label: "Notas" },
  { to: "/areas", icon: Sparkle, label: "Áreas da Vida" },
  { to: "/pessoas", icon: Users, label: "Pessoas" },
  { to: "/diario", icon: BookHeart, label: "Diário" },
  { to: "/rituais", icon: Flame, label: "Rituais" },
  { to: "/bussola", icon: Compass, label: "Bússola" },
  { to: "/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/integracoes-pessoais", icon: Plug, label: "Integrações" },
  { to: "/hive", icon: Globe, label: "The Hive" },
];

const BUSINESS_NAV_ITEMS: NavItem[] = [
  { to: "/inbox", icon: Inbox, label: "Inbox" },
  { to: "/crm", icon: Users, label: "CRM" },
  { to: "/integrations", icon: Plug, label: "Integrações" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
];

// "Sistema" não vive mais na sidebar — fica só no menu do usuário (UserMenu), pra
// não competir com a navegação principal de cada mundo.
const COMMON_NAV_ITEMS: NavItem[] = [];

const MODE_HOME_ROUTE: Record<WorldMode, string> = {
  business: BUSINESS_NAV_ITEMS[0].to,
  personal: PERSONAL_NAV_ITEMS[0].to,
};

const ModeSwitcher = ({ collapsed }: { collapsed?: boolean }) => {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const navigate = useNavigate();

  const switchTo = (value: WorldMode) => {
    if (value === mode) return;
    setMode(value);
    navigate(MODE_HOME_ROUTE[value]);
  };

  const option = (value: WorldMode, label: string) => (
    <button
      onClick={() => switchTo(value)}
      className={cn(
        "flex-1 rounded-full py-1.5 font-mono text-[11px] transition-colors",
        mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {collapsed ? label.charAt(0) : label}
    </button>
  );

  return (
    <div className="flex rounded-full border bg-muted/40 p-0.5">
      {option("business", "Empresarial")}
      {option("personal", "Pessoal")}
    </div>
  );
};

const UserMenu = ({ collapsed }: { collapsed?: boolean }) => {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border py-1.5 pr-2.5 pl-1.5 text-left text-sm transition-colors hover:bg-muted",
            collapsed && "justify-center px-1.5"
          )}
        >
          <Avatar className="size-6 shrink-0"><AvatarFallback className="text-[10px]">{user?.username?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
          {!collapsed && <span className="min-w-0 flex-1 truncate">{user?.username}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user?.username}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <User size={14} /> Configurações
        </DropdownMenuItem>
        {user?.role === "admin" && (
          <DropdownMenuItem onSelect={() => navigate("/admin")}>
            <ShieldCheck size={14} /> Administração
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => { logout(); navigate("/login", { replace: true }); }}>
          <LogOut size={14} /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Sidebar = () => {
  const isAdmin = useStore((s) => s.user?.role === "admin");
  const mode = useStore((s) => s.mode);
  const modeItems = mode === "business" ? BUSINESS_NAV_ITEMS : PERSONAL_NAV_ITEMS;
  const items = [...modeItems, ...COMMON_NAV_ITEMS, ...(isAdmin ? [{ to: "/admin", icon: ShieldCheck, label: "Admin" }] : [])];

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r bg-card/30 md:flex">
      <div className="p-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
              )
            }
          >
            <item.icon size={16} className="shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <IntegrationsTray />

      <div className="p-3">
        <UserMenu />
      </div>
    </aside>
  );
};

const MobileTopBar = () => (
  <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-sm md:hidden">
    <Logo />
    <div className="max-w-[160px] flex-1">
      <ModeSwitcher />
    </div>
    <UserMenu collapsed />
  </div>
);

const PrometheusOrb = ({ onOpen }: { onOpen: () => void }) => (
  <button
    onClick={onOpen}
    title="Prometheus"
    className="fixed right-5 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:right-6 md:bottom-6"
  >
    <Sparkle size={24} className="fill-current" />
  </button>
);

interface PersonalQuickFacts {
  tasksDone: number;
  tasksTotal: number;
  streak: number;
  contactsCold: number;
}

interface BusinessQuickFacts {
  leadsNovo: number;
  leadsTotal: number;
  conversationsPaused: number;
}

const PERSONAL_PROMPTS = ["Como foi meu dia hoje?", "O que eu deveria priorizar agora?", "Puxe um resumo do meu diário"];
const BUSINESS_PROMPTS = ["Resuma meu funil de leads", "Quais conversas precisam de mim?", "Como está o atendimento hoje?"];

const PrometheusLauncher = ({
  isOpen,
  onClose,
  onStartChat,
}: {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (message: string) => void;
}) => {
  const mode = useStore((s) => s.mode);
  const [personalFacts, setPersonalFacts] = useState<PersonalQuickFacts | null>(null);
  const [businessFacts, setBusinessFacts] = useState<BusinessQuickFacts | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setInput("");
    if (mode === "personal") {
      setPersonalFacts(null);
      Promise.all([
        api.get<{ day_progress: { completed: number; total: number }; streak: { current: number } }>("/api/insights/dashboard"),
        api.get<{ area: string; contacts_cold?: number }[]>("/api/insights/life-areas"),
      ])
        .then(([dash, areas]) => {
          const relacoes = areas.find((a) => a.area === "Relações");
          setPersonalFacts({
            tasksDone: dash.day_progress.completed,
            tasksTotal: dash.day_progress.total,
            streak: dash.streak.current,
            contactsCold: relacoes?.contacts_cold ?? 0,
          });
        })
        .catch(() => setPersonalFacts(null));
    } else {
      setBusinessFacts(null);
      Promise.all([
        api.get<{ stage: string }[]>("/api/crm/contacts"),
        api.get<{ ai_enabled: boolean }[]>("/api/inbox/conversations"),
      ])
        .then(([contacts, conversations]) => {
          setBusinessFacts({
            leadsTotal: contacts.length,
            leadsNovo: contacts.filter((c) => c.stage === "novo").length,
            conversationsPaused: conversations.filter((c) => !c.ai_enabled).length,
          });
        })
        .catch(() => setBusinessFacts(null));
    }
  }, [isOpen, mode]);

  const prompts = mode === "business" ? BUSINESS_PROMPTS : PERSONAL_PROMPTS;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Sparkle size={18} className="fill-current" /> Prometheus
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-normal text-muted-foreground">
              {mode === "business" ? "Empresarial" : "Pessoal"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/30 p-3 text-sm">
          {mode === "personal" ? (
            !personalFacts ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> Carregando seu contexto...
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Sparkles size={15} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Hoje: <span className="font-medium text-foreground">{personalFacts.tasksDone}/{personalFacts.tasksTotal} tarefas</span>,
                  streak de <span className="font-medium text-foreground">{personalFacts.streak}d</span>
                  {personalFacts.contactsCold > 0 && (
                    <> e <span className="font-medium text-foreground">{personalFacts.contactsCold} pessoa(s)</span> esfriando.</>
                  )}
                </p>
              </div>
            )
          ) : !businessFacts ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> Carregando seu contexto...
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                Funil: <span className="font-medium text-foreground">{businessFacts.leadsTotal} leads</span>
                {businessFacts.leadsNovo > 0 && <>, <span className="font-medium text-foreground">{businessFacts.leadsNovo} novo(s)</span></>}
                {businessFacts.conversationsPaused > 0 && (
                  <> — <span className="font-medium text-foreground">{businessFacts.conversationsPaused}</span> conversa(s) pausada(s) da IA.</>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {prompts.map((p) => (
            <button
              key={p}
              onClick={() => onStartChat(p)}
              className="rounded-full border px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
            >
              {p}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && input.trim() && onStartChat(input)}
            placeholder="Ou escreva o que quiser..."
            autoFocus
            className="w-full rounded-xl border border-input bg-background py-2.5 pr-11 pl-4 text-sm outline-none focus:border-ring"
          />
          <Button
            size="icon-sm"
            disabled={!input.trim()}
            onClick={() => onStartChat(input)}
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
          >
            <Send size={14} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MobileDock = () => {
  const isAdmin = useStore((s) => s.user?.role === "admin");
  const mode = useStore((s) => s.mode);
  const modeItems = mode === "business" ? BUSINESS_NAV_ITEMS : PERSONAL_NAV_ITEMS;
  const items = [...modeItems, ...COMMON_NAV_ITEMS, ...(isAdmin ? [{ to: "/admin", icon: ShieldCheck, label: "Admin" }] : [])];

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-full -translate-x-1/2 px-4 md:hidden">
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border bg-card/95 p-1.5 shadow-lg backdrop-blur-sm">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : undefined}
            title={item.label}
            className={({ isActive }) =>
              cn(
                "flex size-10 shrink-0 flex-1 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )
            }
          >
            <item.icon size={18} />
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export const Layout = () => {
  const [isLauncherOpen, setLauncherOpen] = useState(false);
  const [isPrometheusOpen, setPrometheusOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const logout = useStore((s) => s.logout);
  const mode = useStore((s) => s.mode);
  const updateUser = useStore((s) => s.updateUser);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      logout();
      navigate("/login", { replace: true });
    });
  }, [logout, navigate]);

  useEffect(() => {
    // Refaz o fetch do perfil ao montar — cobre sessões antigas com campos novos
    // (ex: preferências de motor de IA) que não existiam no localStorage salvo.
    api.get<AuthUser>("/api/auth/me").then(updateUser).catch(() => {});
  }, [updateUser]);

  return (
    <div className={cn("relative flex h-full w-full overflow-hidden bg-background", mode === "business" && "mode-business")}>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, color-mix(in oklch, var(--primary) 8%, transparent), transparent 45%)",
        }}
      />
      <div className="fixed top-3 right-4 z-40 hidden w-44 md:block">
        <ModeSwitcher />
      </div>
      <Sidebar />
      <div className="relative z-10 flex h-full flex-1 flex-col overflow-hidden">
        <MobileTopBar />
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <MobileDock />
      <PrometheusOrb onOpen={() => setLauncherOpen(true)} />
      <PrometheusLauncher
        isOpen={isLauncherOpen}
        onClose={() => setLauncherOpen(false)}
        onStartChat={(message) => {
          setLauncherOpen(false);
          setPendingMessage(message);
          setPrometheusOpen(true);
        }}
      />
      <PrometheusSheet
        isOpen={isPrometheusOpen}
        onClose={() => {
          setPrometheusOpen(false);
          setPendingMessage(null);
        }}
        initialMessage={pendingMessage}
      />
    </div>
  );
};
