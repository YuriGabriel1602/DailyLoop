import { useEffect, useState } from "react";
import { Flame, Plus, Repeat } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Ritual {
  id: number;
  name: string;
  steps: string[];
  area: string | null;
  completed_today: number[];
  streak: number;
  milestone_hit?: number | null;
}

export default function RitualsPage() {
  const username = useStore((s) => s.user?.username) ?? "Você";
  const [rituals, setRituals] = useState<Ritual[] | null>(null);
  const [newName, setNewName] = useState("");
  const [newSteps, setNewSteps] = useState("");

  const shareStreak = async (ritual: Ritual, streak: number) => {
    try {
      await api.post("/api/hive/posts", {
        content: `${username} completou ${streak} dias de sequência em "${ritual.name}"`,
        kind: "achievement",
        source_type: "ritual_streak",
      });
      toast.success("Compartilhado no Hive!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível compartilhar.");
    }
  };

  const load = () => {
    api.get<Ritual[]>("/api/rituals").then(setRituals);
  };

  useEffect(load, []);

  const addRitual = async () => {
    if (!newName.trim() || !newSteps.trim()) return;
    const steps = newSteps.split(",").map((s) => s.trim()).filter(Boolean);
    const created = await api.post<Ritual>("/api/rituals", { name: newName, steps });
    setRituals((prev) => [...(prev ?? []), created]);
    setNewName("");
    setNewSteps("");
  };

  const toggleStep = async (ritual: Ritual, stepIndex: number) => {
    const completed = ritual.completed_today.includes(stepIndex)
      ? ritual.completed_today.filter((i) => i !== stepIndex)
      : [...ritual.completed_today, stepIndex];
    const updated = await api.post<Ritual>(`/api/rituals/${ritual.id}/log`, { completed_steps: completed });
    setRituals((prev) => (prev ?? []).map((r) => (r.id === ritual.id ? updated : r)));

    if (updated.milestone_hit) {
      const streak = updated.milestone_hit;
      toast(`Você bateu ${streak} dias de sequência em "${ritual.name}"!`, {
        action: { label: "Compartilhar no Hive", onClick: () => shareStreak(ritual, streak) },
        duration: 8000,
      });
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Rituais"
        description="Cadeias de hábito — sequência quebrada é só um dado, não uma falha."
        help={
          <p>
            Cada ritual tem uma lista de passos. Marque os passos do dia e acompanhe sua sequência (streak)
            de dias seguidos com pelo menos um passo concluído. Quebrar a sequência não apaga o histórico —
            é só informação, não punição.
          </p>
        }
      />
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 md:px-6">
        <Card className="gap-2 p-2">
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do ritual (ex: Manhã)"
              className="border-none shadow-none focus-visible:ring-0"
            />
            <Input
              value={newSteps}
              onChange={(e) => setNewSteps(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRitual()}
              placeholder="Passos separados por vírgula"
              className="border-none shadow-none focus-visible:ring-0"
            />
            <Button size="icon" onClick={addRitual} className="shrink-0"><Plus size={16} /></Button>
          </div>
        </Card>

        {!rituals ? (
          <div className="space-y-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : rituals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Repeat size={24} className="opacity-40" />
            <p className="text-sm">Nenhum ritual ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rituals.map((ritual) => (
              <Card key={ritual.id} className="gap-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{ritual.name}</p>
                  <span className="flex items-center gap-1 font-mono text-xs text-[var(--warning)]">
                    <Flame size={13} className={ritual.streak > 0 ? "opacity-100" : "opacity-30"} /> {ritual.streak} dias
                  </span>
                </div>
                <div className="flex gap-2">
                  {ritual.steps.map((step, i) => {
                    const done = ritual.completed_today.includes(i);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleStep(ritual, i)}
                        className="flex flex-1 flex-col items-center gap-1.5 text-center text-xs text-muted-foreground"
                      >
                        <span
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full border-2 text-sm transition-colors",
                            done ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-muted-foreground/30"
                          )}
                        >
                          {done && "✓"}
                        </span>
                        {step}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
