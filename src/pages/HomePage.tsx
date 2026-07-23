import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookHeart, CheckCircle2, Send, Sparkle } from "lucide-react";
import { api } from "@/lib/api";
import { useStore, type HomeViewStyle } from "@/store/useStore";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const VIEW_LABELS: Record<HomeViewStyle, string> = {
  carta: "Carta do Dia",
  terminal: "Terminal",
  heatmap: "Mapa de Calor",
  capsula: "Cápsula do Tempo",
};

function ViewSwitcher() {
  const homeViewStyle = useStore((s) => s.homeViewStyle);
  const setHomeViewStyle = useStore((s) => s.setHomeViewStyle);
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(VIEW_LABELS) as HomeViewStyle[]).map((style) => (
        <button
          key={style}
          onClick={() => setHomeViewStyle(style)}
          className={cn(
            "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
            homeViewStyle === style ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          )}
        >
          {VIEW_LABELS[style]}
        </button>
      ))}
    </div>
  );
}

function QuickCapture() {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const send = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/tasks", { title: value });
      setValue("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder="Descarregue uma ideia — vira tarefa..."
        className="w-full rounded-xl border border-input bg-background py-2.5 pr-11 pl-4 text-sm outline-none focus:border-ring"
      />
      <Button size="icon-sm" onClick={send} disabled={saving || !value.trim()} className="absolute top-1/2 right-1.5 -translate-y-1/2">
        <Send size={14} />
      </Button>
    </div>
  );
}

function CartaDoDiaView() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ text: string }>("/api/insights/daily-briefing").then((r) => setText(r.text));
  }, []);

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="rounded-2xl border bg-card p-6 md:p-8">
      <p className="font-mono text-xs text-muted-foreground uppercase">{today}</p>
      {!text ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ) : (
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed">{text}</p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to="/tasks"><CheckCircle2 size={13} /> Ver tarefas</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/diario"><BookHeart size={13} /> Escrever no diário</Link></Button>
      </div>
    </div>
  );
}

interface DashboardInsights {
  day_progress: { completed: number; total: number };
  streak: { current: number };
}

interface AreaSummary {
  area: string;
  tasks_pending: number;
  tasks_done: number;
  contacts_cold?: number;
}

function TerminalView() {
  const [lines, setLines] = useState<string[] | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<DashboardInsights>("/api/insights/dashboard"),
      api.get<AreaSummary[]>("/api/insights/life-areas"),
    ]).then(([dash, areas]) => {
      const now = new Date();
      const ts = now.toTimeString().slice(0, 8);
      const out: string[] = [
        `[${ts}] boot daily_loop --user=session`,
        `[${ts}] ✓ tasks.pending = ${areas.reduce((s, a) => s + a.tasks_pending, 0)}`,
        `[${ts}] ✓ day_progress = ${dash.day_progress.completed}/${dash.day_progress.total}`,
        `[${ts}] ✓ streak.current = ${dash.streak.current}d`,
      ];
      areas.forEach((a) => {
        if (a.contacts_cold) out.push(`[${ts}] ⚠ area(${a.area}).contacts_cold = ${a.contacts_cold}`);
        else out.push(`[${ts}] ✓ area(${a.area}) ok`);
      });
      setLines(out);
    });
  }, []);

  return (
    <div className="rounded-2xl bg-[#0d1117] p-5 font-mono text-[13px] leading-[1.9] text-[#7ee787] md:p-6">
      {!lines ? (
        <Skeleton className="h-40 w-full bg-white/5" />
      ) : (
        <>
          {lines.map((line, i) => (
            <div key={i} className={line.includes("⚠") ? "text-[#f0997b]" : ""}>{line}</div>
          ))}
          <div>
            <span className="text-[#7ee787]">user@dailyloop</span>
            <span className="text-[#8b949e]">:~$ </span>
            <span className="inline-block h-3.5 w-1.5 animate-pulse bg-[#7ee787] align-text-bottom" />
          </div>
        </>
      )}
    </div>
  );
}

function HeatmapView() {
  const [days, setDays] = useState<{ date: string; count: number }[] | null>(null);

  useEffect(() => {
    api.get<{ date: string; count: number }[]>("/api/insights/activity-heatmap").then(setDays);
  }, []);

  const colorFor = (count: number) => {
    if (count === 0) return "var(--border)";
    if (count === 1) return "color-mix(in oklch, var(--primary) 35%, transparent)";
    if (count === 2) return "color-mix(in oklch, var(--primary) 65%, transparent)";
    return "var(--primary)";
  };

  return (
    <div className="rounded-2xl border bg-card p-5 md:p-6">
      <p className="mb-3 text-sm font-medium">Intensidade dos últimos 6 meses</p>
      {!days ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(26, minmax(0, 1fr))" }}>
          {days.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} atividade(s)`}
              className="aspect-square rounded-[2px]"
              style={{ background: colorFor(d.count) }}
            />
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Tarefas concluídas + entradas de diário + rituais marcados, por dia.</p>
    </div>
  );
}

function CapsulaView() {
  const [capsule, setCapsule] = useState<{ content: string; days_ago: number; mood_score: number | null } | null | undefined>(undefined);

  useEffect(() => {
    api.get<typeof capsule>("/api/insights/time-capsule").then(setCapsule);
  }, []);

  if (capsule === undefined) return <Skeleton className="mx-auto h-40 w-full max-w-md" />;

  return (
    <div className="mx-auto max-w-md rounded-2xl border p-6 text-center">
      <Sparkle size={18} className="mx-auto mb-2 text-primary" />
      {capsule ? (
        <>
          <p className="font-mono text-xs text-primary uppercase">há {capsule.days_ago} dia{capsule.days_ago !== 1 ? "s" : ""}</p>
          <p className="mt-2 text-[15px] leading-relaxed font-medium">"{capsule.content}"</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ainda sem memórias suficientes — escreva no <Link to="/diario" className="text-primary underline underline-offset-2">Diário</Link> pra
          a Cápsula do Tempo ter o que te mostrar depois.
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  const user = useStore((s) => s.user);
  const homeViewStyle = useStore((s) => s.homeViewStyle);

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Painel"
        description={`Olá, ${user?.username ?? "Arquiteto"}.`}
        help={
          <>
            <p>A tela inicial do seu lado Pessoal. Escolha entre 4 formatos de visualização, no botão logo abaixo do título:</p>
            <ul>
              <li><strong className="text-foreground">Carta do Dia</strong> — um resumo narrativo escrito pela IA a partir das suas tarefas, rituais e metas reais.</li>
              <li><strong className="text-foreground">Terminal</strong> — os mesmos dados em formato de log técnico.</li>
              <li><strong className="text-foreground">Mapa de Calor</strong> — sua atividade dos últimos 6 meses (tarefas, diário, rituais).</li>
              <li><strong className="text-foreground">Cápsula do Tempo</strong> — uma entrada antiga do Diário, relembrada aleatoriamente.</li>
            </ul>
            <p>A Captura Rápida logo abaixo vira tarefa assim que você aperta Enter.</p>
          </>
        }
      />
      <div className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
        <ViewSwitcher />
        <QuickCapture />
        {homeViewStyle === "carta" && <CartaDoDiaView />}
        {homeViewStyle === "terminal" && <TerminalView />}
        {homeViewStyle === "heatmap" && <HeatmapView />}
        {homeViewStyle === "capsula" && <CapsulaView />}
      </div>
    </div>
  );
}
