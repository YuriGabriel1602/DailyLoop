import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SessionName = "Home" | "Tasks" | "Financial" | "Bio-Sync";

export interface Task {
  id: string;
  title: string;
  time: string;
  done: boolean;
  category: "work" | "personal" | "health";
}

export interface Transaction {
  id: string;
  label: string;
  value: number;
  type: "income" | "expense";
  color: string;
}

export interface BioMetrics {
  heartRate: number;
  stress: number;
  focus: number;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

interface DailyLoopState {
  activeSession: SessionName;
  isListening: boolean;
  isFocusActive: boolean;
  isPrometheusOpen: boolean;
  tasks: Task[];
  finances: Transaction[];
  bio: BioMetrics;
  chatHistory: ChatMessage[];
  setActiveSession: (session: SessionName) => void;
  toggleListening: () => void;
  toggleFocus: () => void;
  togglePrometheus: (open?: boolean) => void;
  addTask: (task: Task) => void;
  toggleTask: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
  addMessage: (role: "user" | "model", text: string) => void;
}

export const useStore = create<DailyLoopState>()(
  persist(
    (set) => ({
      activeSession: "Home",
      isListening: false,
      isFocusActive: false,
      isPrometheusOpen: false,
      tasks: [
        { id: "1", title: "Reunião de alinhamento", time: "10:00", done: false, category: "work" },
        { id: "2", title: "Corrida no parque", time: "18:00", done: false, category: "health" },
      ],
      finances: [
        { id: "1", label: "Freelance", value: 2500, type: "income", color: "#22c55e" },
        { id: "2", label: "Assinaturas", value: 150, type: "expense", color: "#ef4444" },
        { id: "3", label: "Investimentos", value: 500, type: "expense", color: "#38bdf8" },
      ],
      bio: { heartRate: 75, stress: 20, focus: 85 },
      chatHistory: [],
      setActiveSession: (activeSession) => set({ activeSession }),
      toggleListening: () => set((state) => ({ isListening: !state.isListening })),
      toggleFocus: () => set((state) => ({ isFocusActive: !state.isFocusActive })),
      togglePrometheus: (open) =>
        set((state) => ({ isPrometheusOpen: typeof open === "boolean" ? open : !state.isPrometheusOpen })),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
        })),
      addTransaction: (transaction) => set((state) => ({ finances: [...state.finances, transaction] })),
      addMessage: (role, text) =>
        set((state) => ({ chatHistory: [...state.chatHistory, { role, text }].slice(-30) })),
    }),
    {
      name: "daily-loop-master-v2",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
);
