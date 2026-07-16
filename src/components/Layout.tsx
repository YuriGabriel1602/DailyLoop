import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bot, CheckCircle2, Fingerprint, Globe, Home, LogOut, Loader2, Send, Settings, ShieldCheck, User, Wallet,
} from "lucide-react";
import { api, ApiError, registerUnauthorizedHandler } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const PrometheusSheet = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    api
      .get<ChatMessage[]>("/api/chat/history")
      .then((history) => setChat(history.length ? history : [{ role: "assistant", content: "Núcleo Prometheus online." }]))
      .catch(() => setChat([{ role: "assistant", content: "Núcleo Prometheus online." }]));
  }, [isOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setChat((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);
    try {
      const data = await api.post<{ response: string }>("/api/chat", { message: userMsg });
      setChat((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Sinal perdido: backend offline.";
      setChat((prev) => [...prev, { role: "assistant", content: `⚠️ ${message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 text-primary">
            <Bot size={18} /> Prometheus
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
                  {msg.role === "assistant" ? <Bot size={15} /> : <Fingerprint size={15} />}
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
                <Loader2 size={12} className="animate-spin" /> Processando...
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

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Painel", end: true },
  { to: "/tasks", icon: CheckCircle2, label: "Tarefas" },
  { to: "/finance", icon: Wallet, label: "Finanças" },
  { to: "/hive", icon: Globe, label: "The Hive" },
  { to: "/settings", icon: Settings, label: "Sistema" },
];

const Dock = ({ onOpenPrometheus }: { onOpenPrometheus: () => void }) => {
  const isAdmin = useStore((s) => s.user?.role === "admin");
  const items = [...NAV_ITEMS, ...(isAdmin ? [{ to: "/admin", icon: ShieldCheck, label: "Admin" }] : [])];

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-full -translate-x-1/2 px-4 sm:bottom-6 sm:w-auto sm:px-0">
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border bg-card/95 p-1.5 shadow-lg backdrop-blur-sm sm:rounded-full">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : undefined}
            title={item.label}
            className={({ isActive }) =>
              cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )
            }
          >
            <item.icon size={18} />
          </NavLink>
        ))}
        <div className="mx-1 h-6 w-px shrink-0 bg-border" />
        <button
          onClick={onOpenPrometheus}
          title="Prometheus"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
        >
          <Bot size={18} />
        </button>
      </div>
    </div>
  );
};

const TopBar = () => {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="flex shrink-0 items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-sm md:px-6">
      <Logo />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors hover:bg-muted">
            <Avatar className="size-6"><AvatarFallback className="text-[10px]">{user?.username?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
            <span className="hidden max-w-[120px] truncate sm:inline">{user?.username}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
    </div>
  );
};

export const Layout = () => {
  const [isPrometheusOpen, setPrometheusOpen] = useState(false);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      logout();
      navigate("/login", { replace: true });
    });
  }, [logout, navigate]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-x-hidden bg-background">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, color-mix(in oklch, var(--primary) 8%, transparent), transparent 45%)",
        }}
      />
      <div className="relative z-10 flex h-full flex-1 flex-col overflow-hidden">
        <TopBar />
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
      <Dock onOpenPrometheus={() => setPrometheusOpen(true)} />
      <PrometheusSheet isOpen={isPrometheusOpen} onClose={() => setPrometheusOpen(false)} />
    </div>
  );
};
