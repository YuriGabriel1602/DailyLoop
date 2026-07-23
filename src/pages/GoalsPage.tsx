import { useEffect, useState } from "react";
import { Compass, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Goal {
  id: number;
  title: string;
  target_date: string | null;
  progress_percent: number;
  area: string | null;
  note: string | null;
  achievement_hit?: boolean;
}

export default function GoalsPage() {
  const username = useStore((s) => s.user?.username) ?? "Você";
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const shareGoal = async (goal: Goal) => {
    try {
      await api.post("/api/hive/posts", {
        content: `${username} atingiu 100% da meta "${goal.title}"`,
        kind: "achievement",
        source_type: "goal_complete",
      });
      toast.success("Compartilhado no Hive!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível compartilhar.");
    }
  };

  const load = () => {
    api.get<Goal[]>("/api/goals").then(setGoals);
  };

  useEffect(load, []);

  const addGoal = async () => {
    if (!newTitle.trim()) return;
    const created = await api.post<Goal>("/api/goals", { title: newTitle });
    setGoals((prev) => [created, ...(prev ?? [])]);
    setNewTitle("");
  };

  const updateProgress = async (goal: Goal, delta: number) => {
    const updated = await api.patch<Goal>(`/api/goals/${goal.id}`, {
      progress_percent: Math.max(0, Math.min(100, goal.progress_percent + delta)),
    });
    setGoals((prev) => (prev ?? []).map((g) => (g.id === goal.id ? updated : g)));

    if (updated.achievement_hit) {
      toast(`Você bateu 100% da meta "${goal.title}"!`, {
        action: { label: "Compartilhar no Hive", onClick: () => shareGoal(updated) },
        duration: 8000,
      });
    }
  };

  const deleteGoal = async (id: number) => {
    await api.delete(`/api/goals/${id}`);
    setGoals((prev) => (prev ?? []).filter((g) => g.id !== id));
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Bússola de Metas"
        description="Metas de verdade, não tarefas — 6 meses a 1 ano."
        help={
          <p>
            Pra objetivos grandes e de longo prazo — não confundir com item de lista. Defina uma data alvo
            e atualize o progresso manualmente conforme avança; não há tarefa nem ritual "puxando" a barra
            sozinho ainda.
          </p>
        }
      />
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 md:px-6">
        <Card className="gap-2 p-2">
          <div className="flex items-center gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
              placeholder="Descreva a meta"
              className="border-none shadow-none focus-visible:ring-0"
            />
            <Button size="icon" onClick={addGoal} className="shrink-0"><Plus size={16} /></Button>
          </div>
        </Card>

        {!goals ? (
          <div className="space-y-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Compass size={24} className="opacity-40" />
            <p className="text-sm">Nenhuma meta definida ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <Card key={goal.id} className="gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{goal.title}</p>
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteGoal(goal.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 size={13} />
                  </Button>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${goal.progress_percent}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{goal.progress_percent}%</span>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => updateProgress(goal, -10)} className="h-6 px-2 text-xs">-10%</Button>
                    <Button variant="outline" size="sm" onClick={() => updateProgress(goal, 10)} className="h-6 px-2 text-xs">+10%</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
