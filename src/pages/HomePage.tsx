import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, AlertTriangle, ArrowRight, Car, CheckCircle2, Droplets, ListTodo, MapPin, Pause, Play,
  RefreshCw, Send, Server, Star, Sun, Terminal, ThermometerSun, Wallet, Wind,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useBackendStatus, useInterval, useTimeFormat } from "@/components/ui/primitives";
import { PageHeader } from "@/components/PageHeader";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskLite {
  id: number;
  completed: boolean;
  due_at: string | null;
}

interface FinanceLite {
  balance: string;
  budgets: { category: string; over_budget: boolean }[];
}

const formatBRL = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function TasksSummaryCard({ tasks, onClick }: { tasks: TaskLite[] | null; onClick: () => void }) {
  if (!tasks) {
    return (
      <Card className="gap-3">
        <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Tarefas</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-8 w-24" /></CardContent>
      </Card>
    );
  }

  const now = new Date();
  const pending = tasks.filter((t) => !t.completed);
  const overdue = pending.filter((t) => t.due_at && new Date(t.due_at) < now);

  return (
    <Card onClick={onClick} className="cursor-pointer gap-3 transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5"><ListTodo size={14} /> Tarefas</span>
          {overdue.length > 0 && (
            <span className="flex items-center gap-1 text-destructive"><AlertTriangle size={11} /> {overdue.length} atrasada{overdue.length > 1 ? "s" : ""}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{pending.length}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {pending.length === 0 ? "Tudo em dia. Nenhuma pendência." : `pendente${pending.length > 1 ? "s" : ""} em aberto`}
        </p>
      </CardContent>
    </Card>
  );
}

function FinanceSummaryCard({ finance, onClick }: { finance: FinanceLite | null; onClick: () => void }) {
  if (!finance) {
    return (
      <Card className="gap-3">
        <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Finanças</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-8 w-28" /></CardContent>
      </Card>
    );
  }

  const overBudget = finance.budgets.filter((b) => b.over_budget);

  return (
    <Card onClick={onClick} className="cursor-pointer gap-3 transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5"><Wallet size={14} /> Saldo</span>
          {overBudget.length > 0 && (
            <span className="flex items-center gap-1 text-destructive"><AlertTriangle size={11} /> orçamento estourado</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums"><AnimatedNumber value={Number(finance.balance)} formatter={formatBRL} /></div>
        <p className="mt-1 text-xs text-muted-foreground">
          {overBudget.length === 0 ? "Dentro do planejado este mês." : `${overBudget.length} categoria${overBudget.length > 1 ? "s" : ""} acima do limite`}
        </p>
      </CardContent>
    </Card>
  );
}

function UberCard() {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="cursor-pointer gap-3" onClick={() => setExpanded((v) => !v)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5"><Car size={14} /> Uber</span>
          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">Prévia</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">4 min</div>
        <p className="mt-1 text-xs text-muted-foreground">Viagem para o Escritório</p>
        {expanded && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">JS</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs font-medium">
                João Silva <span className="flex items-center gap-0.5 text-amber-500"><Star size={10} fill="currentColor" /> 4.9</span>
              </div>
              <p className="text-xs text-muted-foreground">Tesla Model 3 • DXS-9090</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeatherCard() {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5"><ThermometerSun size={14} /> Clima Hoje</span>
          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">Prévia</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">24°</div>
        <p className="mt-1 text-xs text-muted-foreground">Parcialmente nublado</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /> Porto Alegre, BR</p>
        <div className="mt-3 flex gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Droplets size={11} /> 62%</span>
          <span className="flex items-center gap-1"><Wind size={11} /> 14km/h</span>
          <span className="flex items-center gap-1"><Sun size={11} /> UV 6</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const isBackendOnline = useBackendStatus();
  const [clock, setClock] = useState(new Date());
  useInterval(() => setClock(new Date()), 1000);

  const [tasks, setTasks] = useState<TaskLite[] | null>(null);
  const [finance, setFinance] = useState<FinanceLite | null>(null);

  useEffect(() => {
    api.get<TaskLite[]>("/api/tasks").then(setTasks).catch(() => setTasks([]));
    api.get<FinanceLite>("/api/finance/stats").then(setFinance).catch(() => setFinance(null));
  }, []);

  const [mission, setMission] = useState("");
  const [localInput, setLocalInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [quickNote, setQuickNote] = useState("");
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  useInterval(() => {
    if (timeLeft > 0) setTimeLeft(timeLeft - 1);
    else setIsTimerRunning(false);
  }, isTimerRunning ? 1000 : null);

  const handleSetMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (localInput.trim()) {
      setMission(localInput);
      setIsTimerRunning(true);
    }
  };

  const handleSaveNote = async () => {
    if (!quickNote.trim() || !isBackendOnline) return;
    setNoteStatus("saving");
    try {
      await api.post("/api/notes", { content: quickNote });
      setQuickNote("");
      setNoteStatus("success");
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setNoteStatus("error");
    } finally {
      setTimeout(() => setNoteStatus("idle"), 2500);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Painel"
        description={`Olá, ${user?.username ?? "Arquiteto"}. Aqui está o seu dia.`}
        actions={
          <>
            <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">
              {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <Badge variant={isBackendOnline ? "secondary" : "destructive"} className="gap-1.5">
              <Server size={11} /> {isBackendOnline ? "Online" : "Offline"}
            </Badge>
          </>
        }
      />

      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:space-y-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          <Card className="flex min-h-[240px] flex-col justify-center p-6 md:col-span-2 md:p-10">
            {!mission ? (
              <div className="space-y-5">
                <Badge variant="secondary">Sistema pronto</Badge>
                <h1 className="text-2xl leading-tight font-semibold tracking-tight md:text-3xl">
                  Qual o seu próximo objetivo?
                </h1>
                <form onSubmit={handleSetMission} className="relative max-w-lg">
                  <input
                    autoFocus
                    type="text"
                    value={localInput}
                    onChange={(e) => setLocalInput(e.target.value)}
                    placeholder="Descreva a tarefa em foco..."
                    className="w-full rounded-xl border border-input bg-background py-3 pr-14 pl-4 text-sm outline-none focus:border-ring"
                  />
                  <Button type="submit" size="icon-sm" className="absolute top-1/2 right-1.5 -translate-y-1/2">
                    <ArrowRight size={16} />
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Badge className="animate-pulse">Em execução</Badge>
                  <button
                    onClick={() => { setMission(""); setIsTimerRunning(false); setTimeLeft(45 * 60); }}
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
                <h1 className="max-w-xl text-2xl leading-tight font-semibold break-words md:text-3xl">{mission}</h1>
                <div className="flex items-center gap-4">
                  <div className="font-mono text-5xl font-light tabular-nums">{useTimeFormat(timeLeft)}</div>
                  <Button size="icon-lg" onClick={() => setIsTimerRunning((v) => !v)}>
                    {isTimerRunning ? <Pause size={20} /> : <Play size={20} />}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="relative flex flex-col gap-3">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5"><Terminal size={14} /> Captura Rápida</span>
                {!isBackendOnline && <span className="flex items-center gap-1 text-xs text-destructive"><AlertCircle size={11} /> Offline</span>}
                {noteStatus === "saving" && <span className="text-xs text-muted-foreground">Salvando...</span>}
                {noteStatus === "success" && <span className="flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 size={11} /> Salvo</span>}
                {noteStatus === "error" && <span className="flex items-center gap-1 text-xs text-destructive"><RefreshCw size={11} /> Falha</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {isBackendOnline ? (
                <>
                  <textarea
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && handleSaveNote()}
                    placeholder="Descarregue uma ideia..."
                    className="min-h-[80px] flex-1 resize-none border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                  <Button size="icon-sm" variant="secondary" className="self-end" onClick={handleSaveNote} disabled={!quickNote.trim()}>
                    <Send size={14} />
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Servidor Python inacessível.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <p className="mb-2 px-0.5 text-xs font-medium text-muted-foreground">Hoje</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
            <TasksSummaryCard tasks={tasks} onClick={() => navigate("/tasks")} />
            <FinanceSummaryCard finance={finance} onClick={() => navigate("/finance")} />
          </div>
        </div>

        <div>
          <p className="mb-2 px-0.5 text-xs font-medium text-muted-foreground">Em breve</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
            <UberCard />
            <WeatherCard />
          </div>
        </div>
      </div>
    </div>
  );
}
