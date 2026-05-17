import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Fingerprint,
  Globe,
  Home,
  Loader2,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { getBackendHealth, sendChatMessage, type BackendHealth } from "./services/api";

type View = "home" | "tasks" | "finance" | "hive";
type Task = { id: string; title: string; due: string; completed: boolean; tag: string };
type Transaction = { id: string; label: string; amount: number; type: "income" | "expense" };
type ChatMessage = { role: "user" | "assistant"; content: string };

const initialTasks: Task[] = [
  { id: "task-1", title: "Revisar o plano do DailyLoop v2", due: "Hoje", completed: false, tag: "core" },
  { id: "task-2", title: "Separar tarefas reais dos mocks", due: "Amanhã", completed: false, tag: "produto" },
  { id: "task-3", title: "Rotacionar chaves expostas", due: "Urgente", completed: false, tag: "segurança" },
];

const initialTransactions: Transaction[] = [
  { id: "tx-1", label: "Freelance", amount: 2500, type: "income" },
  { id: "tx-2", label: "Assinaturas", amount: 150, type: "expense" },
  { id: "tx-3", label: "Infraestrutura", amount: 320, type: "expense" },
];

const stream = [
  { title: "Prometheus backend", body: "IA centralizada no FastAPI, sem chave publica no frontend.", tone: "text-purple-300" },
  { title: "Segurança", body: "Ambientes locais, banco e caches sairam do Git.", tone: "text-emerald-300" },
  { title: "Próximo passo", body: "Conectar tarefas, finanças e clima em dados reais persistidos.", tone: "text-sky-300" },
];

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return undefined;
    const id = window.setInterval(() => savedCallback.current(), delay);
    return () => window.clearInterval(id);
  }, [delay]);
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
      <div className="mb-6 flex items-center justify-between text-gray-400">
        <span className="text-[10px] font-bold uppercase tracking-[0.28em]">{label}</span>
        <Icon size={18} className="text-white/70" />
      </div>
      <div className="text-3xl font-black tracking-tight text-white">{value}</div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">{detail}</p>
    </div>
  );
}

function StatusBar({ health }: { health: BackendHealth | null }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-gray-400">
        <Clock3 size={14} className="text-white" />
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">
        <span className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1 md:flex">
          <Wifi size={12} /> Local
        </span>
        <span className={`rounded-full border px-3 py-1 ${health ? "border-emerald-500/30 text-emerald-300" : "border-yellow-500/30 text-yellow-300"}`}>
          API {health ? "online" : "offline"}
        </span>
      </div>
    </div>
  );
}

function AuthPortal({ onLogin }: { onLogin: () => void }) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onLogin();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl"
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-blue-300">DailyLoop</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Acesso local</h1>
          </div>
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-blue-200">
            <Fingerprint size={30} />
          </div>
        </div>
        <div className="space-y-3">
          <input className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-blue-400/60" placeholder="Identificador" />
          <input className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-blue-400/60" placeholder="Token local" type="password" />
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.24em] text-black transition hover:bg-gray-200">
            Entrar <LockKeyhole size={16} />
          </button>
        </div>
      </motion.form>
    </div>
  );
}

function HomeView({ mission, setMission, startFocus, health }: { mission: string; setMission: (mission: string) => void; startFocus: () => void; health: BackendHealth | null }) {
  const [draft, setDraft] = useState("");
  const [seconds, setSeconds] = useState(45 * 60);
  const [running, setRunning] = useState(false);

  useInterval(
    () => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    },
    running ? 1000 : null,
  );

  const submitMission = (event: FormEvent) => {
    event.preventDefault();
    const nextMission = draft.trim();
    if (!nextMission) return;
    setMission(nextMission);
    setSeconds(45 * 60);
    setRunning(true);
  };

  return (
    <div className="custom-scrollbar h-full overflow-y-auto pb-28">
      <div className="mx-auto grid w-full max-w-7xl gap-5 p-4 md:grid-cols-12 md:p-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0b] p-6 shadow-2xl shadow-black/30 md:col-span-8 md:p-10">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/90 to-[#050505]/20" />
          <div className="relative max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-blue-200">
              <Sparkles size={14} /> Reconstrução v2
            </div>
            <h2 className="text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
              {mission || "Qual é o próximo ciclo?"}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
              DailyLoop agora está com base mais segura: segredos fora do Git, IA passando pelo backend e um cockpit pronto para dados reais.
            </p>

            {!mission ? (
              <form onSubmit={submitMission} className="mt-8 flex max-w-2xl gap-3">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-400/60"
                  placeholder="Digite sua missão principal"
                />
                <button className="rounded-2xl bg-white px-5 text-black transition hover:bg-gray-200">
                  <ArrowRight size={20} />
                </button>
              </form>
            ) : (
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <div className="font-mono text-6xl font-light tracking-tighter text-white md:text-7xl">{formatSeconds(seconds)}</div>
                <button onClick={() => setRunning((value) => !value)} className="rounded-2xl bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-black transition hover:bg-gray-200">
                  {running ? "Pausar" : "Retomar"}
                </button>
                <button onClick={startFocus} className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/15">
                  Reforçar foco
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-5 md:col-span-4">
          <MetricCard icon={ShieldCheck} label="Segurança" value="Limpo" detail="Segredos, banco local e caches removidos do versionamento." />
          <MetricCard icon={Bot} label="Prometheus" value={health?.ai_configured ? "IA pronta" : "Offline"} detail="A chave Gemini fica apenas no backend local." />
        </section>

        <section className="grid gap-5 md:col-span-12 md:grid-cols-3">
          <MetricCard icon={CheckCircle2} label="Fila" value="3 tarefas" detail="Base pronta para conectar com SQLite e agenda real." />
          <MetricCard icon={Wallet} label="Finanças" value="R$ 2.030" detail="Resumo local enquanto a API financeira é consolidada." />
          <MetricCard icon={Activity} label="Bio-Sync" value="85%" detail="Indicador visual preservado para futura integração real." />
        </section>
      </div>
    </div>
  );
}

function TasksView({ tasks, setTasks }: { tasks: Task[]; setTasks: (tasks: Task[]) => void }) {
  const [title, setTitle] = useState("");

  const addTask = (event: FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setTasks([...tasks, { id: crypto.randomUUID(), title: cleanTitle, due: "Hoje", completed: false, tag: "manual" }]);
    setTitle("");
  };

  return (
    <div className="custom-scrollbar h-full overflow-y-auto pb-28">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-blue-300">Eventos e metas</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight text-white">Priority Queue</h2>
          </div>
          <CalendarDays className="text-white/50" />
        </div>

        <form onSubmit={addTask} className="mb-5 flex gap-3">
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white outline-none focus:border-blue-400/60" placeholder="Nova tarefa" />
          <button className="rounded-2xl bg-white px-5 text-black transition hover:bg-gray-200">
            <Plus size={20} />
          </button>
        </form>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <button
                onClick={() => setTasks(tasks.map((item) => (item.id === task.id ? { ...item, completed: !item.completed } : item)))}
                className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${task.completed ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/15 text-gray-500"}`}
              >
                <CheckCircle2 size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className={`truncate text-lg font-bold ${task.completed ? "text-gray-500 line-through" : "text-white"}`}>{task.title}</h3>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">{task.due} - {task.tag}</p>
              </div>
              <button onClick={() => setTasks(tasks.filter((item) => item.id !== task.id))} className="rounded-2xl border border-white/10 p-3 text-gray-500 transition hover:border-red-400/40 hover:text-red-300">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinanceView({ transactions, setTransactions }: { transactions: Transaction[]; setTransactions: (transactions: Transaction[]) => void }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<Transaction["type"]>("expense");

  const balance = useMemo(
    () => transactions.reduce((total, transaction) => total + (transaction.type === "income" ? transaction.amount : -transaction.amount), 0),
    [transactions],
  );

  const addTransaction = (event: FormEvent) => {
    event.preventDefault();
    const parsed = Number(amount.replace(",", "."));
    if (!label.trim() || Number.isNaN(parsed)) return;
    setTransactions([...transactions, { id: crypto.randomUUID(), label: label.trim(), amount: parsed, type }]);
    setLabel("");
    setAmount("");
  };

  return (
    <div className="custom-scrollbar h-full overflow-y-auto pb-28">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">Centro financeiro</p>
        <div className="mt-3 rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-8">
          <p className="text-sm text-emerald-100/70">Saldo reconstruído</p>
          <h2 className="mt-2 text-5xl font-black tracking-tight text-white">R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
        </div>

        <form onSubmit={addTransaction} className="mt-5 grid gap-3 md:grid-cols-[1fr_160px_150px_auto]">
          <input value={label} onChange={(event) => setLabel(event.target.value)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white outline-none focus:border-emerald-400/60" placeholder="Descrição" />
          <input value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white outline-none focus:border-emerald-400/60" placeholder="Valor" />
          <select value={type} onChange={(event) => setType(event.target.value as Transaction["type"])} className="rounded-2xl border border-white/10 bg-[#101010] px-5 py-4 text-white outline-none focus:border-emerald-400/60">
            <option value="expense">Gasto</option>
            <option value="income">Entrada</option>
          </select>
          <button className="rounded-2xl bg-white px-5 text-black transition hover:bg-gray-200">Adicionar</button>
        </form>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div>
                <h3 className="font-bold text-white">{transaction.label}</h3>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">{transaction.type === "income" ? "Entrada" : "Gasto"}</p>
              </div>
              <span className={transaction.type === "income" ? "text-emerald-300" : "text-red-300"}>R$ {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HiveView() {
  return (
    <div className="custom-scrollbar h-full overflow-y-auto pb-28">
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">Stream</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-white">Reconstrução em andamento</h2>
        <div className="mt-6 space-y-4">
          {stream.map((item) => (
            <article key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className={`font-black ${item.tone}`}>{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrometheusDrawer({ open, onClose, onNavigate, onStartFocus }: { open: boolean; onClose: () => void; onNavigate: (view: View) => void; onStartFocus: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Prometheus pronto. O backend responde quando o FastAPI estiver rodando." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const applyIntent = (text: string) => {
    const normalized = text.toLowerCase();
    if (normalized.includes("finan") || normalized.includes("dinheiro") || normalized.includes("gasto")) onNavigate("finance");
    if (normalized.includes("tarefa") || normalized.includes("agenda") || normalized.includes("hoje")) onNavigate("tasks");
    if (normalized.includes("foco") || normalized.includes("deep work")) onStartFocus();
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const clean = input.trim();
    if (!clean || loading) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", content: clean }]);
    applyIntent(clean);
    setLoading(true);

    try {
      const data = await sendChatMessage(clean);
      setMessages((current) => [...current, { role: "assistant", content: data.response }]);
    } catch (error) {
      console.error("Prometheus request failed:", error);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "Backend offline. Rode `npm run dev:backend` e configure `backend/.env` para ativar a IA." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed bottom-3 right-3 top-3 z-50 flex w-[440px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0c0d] shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-purple-400/10 p-3 text-purple-200"><Bot size={20} /></div>
                <div>
                  <h2 className="font-black text-white">Prometheus</h2>
                  <p className="text-xs text-gray-500">Copiloto local</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-400 hover:text-white">Fechar</button>
            </header>

            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-2xl p-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-blue-500/20 text-white" : "bg-white/[0.06] text-gray-200"}`}>
                  {message.content}
                </div>
              ))}
              {loading && <div className="flex items-center gap-2 text-xs text-purple-300"><Loader2 size={12} className="animate-spin" /> Pensando...</div>}
              <div ref={endRef} />
            </div>

            <form onSubmit={send} className="flex items-center gap-3 border-t border-white/10 p-4">
              <input value={input} onChange={(event) => setInput(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-purple-400/60" placeholder="Digite um comando" />
              <button disabled={loading} className="rounded-2xl bg-white px-4 py-3 text-black transition hover:bg-gray-200 disabled:opacity-50">Enviar</button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Dock({ active, onChange, onOpenPrometheus }: { active: View; onChange: (view: View) => void; onOpenPrometheus: () => void }) {
  const items: Array<{ id: View; icon: LucideIcon; label: string }> = [
    { id: "home", icon: Home, label: "Home" },
    { id: "tasks", icon: CheckCircle2, label: "Tarefas" },
    { id: "finance", icon: Wallet, label: "Finanças" },
    { id: "hive", icon: Globe, label: "Stream" },
  ];

  return (
    <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-3 shadow-2xl backdrop-blur-2xl">
        {items.map((item) => (
          <button key={item.id} onClick={() => onChange(item.id)} title={item.label} className={`rounded-full p-3 transition ${active === item.id ? "bg-white text-black" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}>
            <item.icon size={20} />
          </button>
        ))}
        <div className="mx-1 h-7 w-px bg-white/10" />
        <button onClick={onOpenPrometheus} title="Prometheus" className="rounded-full p-3 text-purple-300 transition hover:bg-purple-400/10 hover:text-purple-200">
          <Bot size={20} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<View>("home");
  const [prometheusOpen, setPrometheusOpen] = useState(false);
  const [mission, setMission] = useState("");
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  useEffect(() => {
    getBackendHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const startFocus = () => {
    setMission((current) => current || "Ciclo de foco guiado");
    setActiveView("home");
  };

  const content = (() => {
    switch (activeView) {
      case "tasks":
        return <TasksView tasks={tasks} setTasks={setTasks} />;
      case "finance":
        return <FinanceView transactions={transactions} setTransactions={setTransactions} />;
      case "hive":
        return <HiveView />;
      default:
        return <HomeView mission={mission} setMission={setMission} startFocus={startFocus} health={health} />;
    }
  })();

  if (!authenticated) {
    return <AuthPortal onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#050505] text-white">
      <StatusBar health={health} />
      <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
            {content}
          </motion.div>
        </AnimatePresence>
      </main>
      <Dock active={activeView} onChange={setActiveView} onOpenPrometheus={() => setPrometheusOpen(true)} />
      <PrometheusDrawer open={prometheusOpen} onClose={() => setPrometheusOpen(false)} onNavigate={setActiveView} onStartFocus={startFocus} />
    </div>
  );
}
