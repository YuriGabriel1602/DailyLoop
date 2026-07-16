import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { HeaderBack, SpotlightCard } from "../components/ui/primitives";

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
    api
      .get<Task[]>("/api/tasks")
      .then(setTasks)
      .finally(() => setLoading(false));
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
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="w-full h-full flex flex-col bg-transparent overflow-y-auto overflow-x-hidden custom-scrollbar">
      <HeaderBack title="Tarefas" onBack={() => navigate("/")} />
      <div className="flex-1 px-4 md:px-6 pb-40 max-w-4xl mx-auto w-full space-y-6 md:space-y-8">
        <SpotlightCard className="p-2 flex gap-2 items-center focus-within:border-blue-500/50 transition-colors">
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Qual o próximo alvo tático?..."
            className="flex-1 bg-transparent px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-white focus:outline-none placeholder:text-gray-600"
          />
          <button onClick={addTask} className="p-2 md:p-3 bg-white hover:bg-gray-200 text-black rounded-xl transition-colors shrink-0"><Plus size={18} /></button>
        </SpotlightCard>

        {loading ? (
          <p className="text-xs text-gray-500 text-center">Carregando...</p>
        ) : tasks.length === 0 ? (
          <p className="text-xs text-gray-500 text-center">Nenhuma tarefa ainda.</p>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {tasks.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.05, duration: 0.2 }}>
                  <SpotlightCard className={`p-4 md:p-5 flex items-center justify-between transition-all duration-300 group border-transparent hover:border-white/10 ${task.completed ? "opacity-50" : ""}`} noPadding>
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-2">
                      <button onClick={() => toggleTask(task)} className={`w-5 h-5 md:w-6 md:h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? "bg-green-500 border-green-500" : "border-gray-600 hover:border-gray-400"}`}>
                        {task.completed && <CheckCircle2 size={12} className="text-black" />}
                      </button>
                      <div className="min-w-0">
                        <h3 className={`text-xs md:text-sm font-bold transition-all truncate ${task.completed ? "text-gray-500 line-through" : "text-white"}`}>{task.title}</h3>
                        <span className="text-[9px] uppercase tracking-widest text-blue-400/80 mt-1 font-mono">{task.category}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="w-8 h-8 shrink-0 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-600 hover:text-red-500 flex items-center justify-center transition-colors md:opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </SpotlightCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
