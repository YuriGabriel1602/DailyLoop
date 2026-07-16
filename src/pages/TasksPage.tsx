import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ClipboardList, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Priority = "baixa" | "normal" | "alta";

interface Task {
  id: number;
  title: string;
  category: string;
  priority: Priority;
  completed: boolean;
  created_at: string;
  due_at: string | null;
}

const TASK_CATEGORIES = ["Geral", "Trabalho", "Pessoal", "Saúde", "Estudos", "Casa"];

const PRIORITY_LABELS: Record<Priority, string> = { baixa: "Baixa", normal: "Normal", alta: "Alta" };
const PRIORITY_COLORS: Record<Priority, string> = { baixa: "#8a8a8a", normal: "#3987e5", alta: "#d03b3b" };

const formatDueAt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState(TASK_CATEGORIES[0]);
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("normal");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTasks = () => {
    api.get<Task[]>("/api/tasks").then(setTasks).finally(() => setLoading(false));
  };

  useEffect(loadTasks, []);

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const created = await api.post<Task>("/api/tasks", {
      title: newTaskTitle,
      category: newTaskCategory,
      priority: newTaskPriority,
      due_at: newTaskDueAt ? new Date(newTaskDueAt).toISOString() : null,
    });
    setTasks((prev) => [created, ...prev]);
    setNewTaskTitle("");
    setNewTaskDueAt("");
  };

  const toggleTask = async (task: Task) => {
    const updated = await api.patch<Task>(`/api/tasks/${task.id}`, { completed: !task.completed });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  };

  const deleteTask = async (id: number) => {
    await api.delete(`/api/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader title="Tarefas" description="O que precisa da sua atenção hoje." />
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 md:px-6">
        <Card className="gap-2 p-2">
          <div className="flex items-center gap-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="O que precisa ser feito?"
              className="border-none shadow-none focus-visible:ring-0"
            />
            <Button size="icon" onClick={addTask} className="shrink-0">
              <Plus size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
              <SelectTrigger size="sm" className="w-28 border-none text-xs shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as Priority)}>
              <SelectTrigger size="sm" className="w-24 border-none text-xs shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ background: PRIORITY_COLORS[p] }} />
                      {PRIORITY_LABELS[p]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="datetime-local"
              value={newTaskDueAt}
              onChange={(e) => setNewTaskDueAt(e.target.value)}
              title="Prazo (opcional) — habilita o lembrete"
              className="w-auto shrink-0 border-none text-xs text-muted-foreground shadow-none focus-visible:ring-0"
            />
          </div>
        </Card>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <ClipboardList size={24} className="opacity-40" />
            <p className="text-sm">Nenhuma tarefa ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {tasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.03, duration: 0.2 }}
                >
                  <Card className={cn("flex-row items-center justify-between gap-3 p-3 transition-shadow hover:shadow-md", task.completed && "opacity-60")}>
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        onClick={() => toggleTask(task)}
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          task.completed ? "border-primary bg-primary" : "border-muted-foreground/40 hover:border-muted-foreground"
                        )}
                      >
                        {task.completed && <div className="size-2 rounded-full bg-primary-foreground" />}
                      </button>
                      <div className="min-w-0">
                        <p className={cn("flex items-center gap-1.5 truncate text-sm font-medium", task.completed && "line-through")}>
                          <span
                            title={`Prioridade ${PRIORITY_LABELS[task.priority]}`}
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ background: PRIORITY_COLORS[task.priority] }}
                          />
                          {task.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge variant="outline">{task.category}</Badge>
                          {task.due_at && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Bell size={10} /> {formatDueAt(task.due_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteTask(task.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
