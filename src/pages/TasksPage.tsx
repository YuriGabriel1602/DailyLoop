import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  category: string;
  completed: boolean;
  created_at: string;
}

export default function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTasks = () => {
    api.get<Task[]>("/api/tasks").then(setTasks).finally(() => setLoading(false));
  };

  useEffect(loadTasks, []);

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const created = await api.post<Task>("/api/tasks", { title: newTaskTitle, category: "Geral" });
    setTasks((prev) => [created, ...prev]);
    setNewTaskTitle("");
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
      <PageHeader title="Tarefas" onBack={() => navigate("/")} />
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 md:px-6">
        <Card className="flex-row items-center gap-2 p-2">
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
        </Card>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Carregando...</p>
        ) : tasks.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id} className={cn("flex-row items-center justify-between gap-3 p-3", task.completed && "opacity-60")}>
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
                    <p className={cn("truncate text-sm font-medium", task.completed && "line-through")}>{task.title}</p>
                    <Badge variant="outline" className="mt-0.5">{task.category}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => deleteTask(task.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
