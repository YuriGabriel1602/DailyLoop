import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Home, CheckCircle2, Wallet, Bot, Settings, Globe, ShieldCheck,
  X, ArrowRight, Fingerprint, Loader2,
} from "lucide-react";
import { api, ApiError, registerUnauthorizedHandler } from "../lib/api";
import { useStore } from "../store/useStore";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const PrometheusDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    api
      .get<ChatMessage[]>("/api/chat/history")
      .then((history) => {
        if (history.length) setChat(history);
        else setChat([{ role: "assistant", content: "Núcleo Prometheus online." }]);
      })
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
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "110%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bg-[#0f0f11] border border-white/5 rounded-l-3xl shadow-2xl z-50 flex flex-col overflow-hidden w-[95vw] sm:w-[420px] max-w-full h-[100dvh] sm:h-[calc(100vh-32px)] top-0 sm:top-4 right-0"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-r from-[#1a1a1d] to-[#0f0f11]">
              <div className="flex items-center gap-3 text-purple-500">
                <Bot size={20} />
                <span className="font-black text-xs sm:text-sm tracking-[0.2em] uppercase">Prometheus IA</span>
              </div>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar">
              {chat.map((msg, i) => (
                <div key={i} className={`flex gap-3 sm:gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${
                      msg.role === "assistant"
                        ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    }`}
                  >
                    {msg.role === "assistant" ? <Bot size={16} /> : <Fingerprint size={16} />}
                  </div>
                  <div
                    className={`p-3 sm:p-4 bg-white/[0.03] border border-white/5 text-xs sm:text-sm text-gray-300 leading-relaxed max-w-[85%] rounded-2xl shadow-sm break-words ${
                      msg.role === "assistant" ? "rounded-tl-none" : "rounded-tr-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-gray-500 text-[10px] sm:text-xs ml-10 sm:ml-14 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" /> A processar...
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="p-4 sm:p-6 bg-[#0a0a0b] border-t border-white/5 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Injetar comando neural..."
                className="w-full bg-[#151516] border border-white/10 rounded-2xl py-3 sm:py-4 pl-4 sm:pl-6 pr-12 sm:pr-14 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={loading}
                className="absolute right-6 sm:right-8 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-400 disabled:opacity-50 transition-colors"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const FloatingDock = ({ togglePrometheus }: { togglePrometheus: () => void }) => {
  const isAdmin = useStore((s) => s.user?.role === "admin");
  const items = [
    { to: "/", icon: Home, tooltip: "Painel", end: true },
    { to: "/tasks", icon: CheckCircle2, tooltip: "Tarefas" },
    { to: "/finance", icon: Wallet, tooltip: "Finanças" },
    { to: "/hive", icon: Globe, tooltip: "The Hive" },
    { to: "/settings", icon: Settings, tooltip: "Sistema" },
    ...(isAdmin ? [{ to: "/admin", icon: ShieldCheck, tooltip: "Admin" }] : []),
  ];
  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4 sm:w-auto sm:px-0">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between sm:justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl sm:rounded-full backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-x-auto custom-scrollbar"
      >
        {items.map((item) => (
          <div key={item.to} className="relative group shrink-0">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block p-2.5 sm:p-3 rounded-full transition-all duration-300 ${
                  isActive ? "bg-white text-black scale-105 sm:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.4)]" : "text-gray-400 hover:text-white hover:bg-white/10"
                }`
              }
            >
              <item.icon size={20} className="sm:w-[22px] sm:h-[22px]" />
            </NavLink>
            <div className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {item.tooltip}
            </div>
          </div>
        ))}
        <div className="w-px h-6 bg-white/10 mx-1 sm:mx-2 shrink-0" />
        <div className="relative group shrink-0">
          <button
            onClick={togglePrometheus}
            className="p-2.5 sm:p-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-full transition-all relative"
          >
            <Bot size={20} className="sm:w-[22px] sm:h-[22px]" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-pulse" />
          </button>
          <div className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Prometheus IA
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const Layout = () => {
  const [isPrometheusOpen, setPrometheusOpen] = useState(false);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      logout();
      navigate("/login", { replace: true });
    });
  }, [logout, navigate]);

  return (
    <div className="w-full h-full relative flex flex-col overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center -translate-x-1/2 left-1/2">
        <div className="w-[150vw] h-[150vw] max-w-[1000px] max-h-[1000px] bg-blue-900/5 rounded-full blur-[100px] md:blur-[150px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        <Outlet />
      </div>

      <FloatingDock togglePrometheus={() => setPrometheusOpen(true)} />
      <PrometheusDrawer isOpen={isPrometheusOpen} onClose={() => setPrometheusOpen(false)} />
    </div>
  );
};
