import { useEffect, useState } from "react";
import { Sparkle } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AreaSummary {
  area: string;
  tasks_pending: number;
  tasks_done: number;
  rituals: { name: string; streak: number }[];
  goals: { title: string; progress_percent: number }[];
  contacts_cold?: number;
}

const AREA_COLORS = ["#5b8ef7", "#34c98e", "#c98af0", "#f0997b", "#4fc4cc", "#e0a94f", "#f47166"];

function scoreFor(area: AreaSummary): number {
  const signals: number[] = [];
  const totalTasks = area.tasks_done + area.tasks_pending;
  if (totalTasks > 0) signals.push(area.tasks_done / totalTasks);
  if (area.rituals.length > 0) {
    signals.push(area.rituals.reduce((sum, r) => sum + Math.min(r.streak / 7, 1), 0) / area.rituals.length);
  }
  if (area.goals.length > 0) {
    signals.push(area.goals.reduce((sum, g) => sum + g.progress_percent / 100, 0) / area.goals.length);
  }
  if (area.contacts_cold !== undefined && area.contacts_cold > 0) signals.push(0.25);
  if (signals.length === 0) return 0.35;
  return signals.reduce((a, b) => a + b, 0) / signals.length;
}

function AreaWheel({ areas }: { areas: AreaSummary[] }) {
  const size = 220;
  const center = size / 2;
  const maxRadius = 85;
  const n = areas.length;

  const points = areas.map((area, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = scoreFor(area) * maxRadius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  });
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {[0.33, 0.66, 1].map((f) => (
        <circle key={f} cx={center} cy={center} r={maxRadius * f} fill="none" stroke="var(--border)" strokeWidth={1} />
      ))}
      <polygon points={polygonPoints} fill="var(--primary)" fillOpacity={0.25} stroke="var(--primary)" strokeWidth={1.5} />
      {areas.map((area, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const labelR = maxRadius + 18;
        const x = center + labelR * Math.cos(angle);
        const y = center + labelR * Math.sin(angle);
        return (
          <text key={area.area} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="var(--muted-foreground)">
            {area.area}
          </text>
        );
      })}
    </svg>
  );
}

export default function AreasPage() {
  const [areas, setAreas] = useState<AreaSummary[] | null>(null);

  useEffect(() => {
    api.get<AreaSummary[]>("/api/insights/life-areas").then(setAreas);
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Áreas da Vida"
        description="Atualizado com base no que você fez essa semana."
        help={
          <p>
            Agrega tudo que você já tem espalhado pelo app — categoria das <strong className="text-foreground">Tarefas</strong>,
            sequência dos <strong className="text-foreground">Rituais</strong> e progresso das <strong className="text-foreground">Metas</strong> —
            num resumo por área da sua vida. Não é uma lista nova pra preencher, é um espelho do que você já registrou.
          </p>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 md:px-6">
        {!areas ? (
          <Skeleton className="mx-auto h-56 w-56 rounded-full" />
        ) : areas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Sparkle size={24} className="opacity-40" />
            <p className="text-sm">Ainda sem dados — crie tarefas, rituais ou metas com uma área pra ver a roda.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center py-4">
              <AreaWheel areas={areas} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {areas.map((area, i) => (
                <Card key={area.area} className="gap-2 border-l-4 p-3.5" style={{ borderLeftColor: AREA_COLORS[i % AREA_COLORS.length] }}>
                  <p className="text-sm font-semibold">{area.area}</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {(area.tasks_pending + area.tasks_done) > 0 && (
                      <p>{area.tasks_done}/{area.tasks_pending + area.tasks_done} tarefas concluídas</p>
                    )}
                    {area.rituals.map((r) => <p key={r.name}>{r.name}: 🔥 {r.streak} dias</p>)}
                    {area.goals.map((g) => <p key={g.title}>{g.title}: {g.progress_percent}%</p>)}
                    {area.contacts_cold !== undefined && area.contacts_cold > 0 && (
                      <p className="text-[var(--warning)]">{area.contacts_cold} pessoa(s) sem contato recente</p>
                    )}
                    {area.tasks_pending + area.tasks_done === 0 && area.rituals.length === 0 && area.goals.length === 0 && !area.contacts_cold && (
                      <p>Sem dados ainda nessa área.</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
