import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Tipos definidos baseados nos seus docs
export interface Task { id: string; title: string; time: string; done: boolean; category: 'work' | 'personal' | 'health'; }
export interface Transaction { id: string; label: string; value: number; type: 'income' | 'expense'; color: string; }
export interface BioMetrics { heartRate: number; stress: number; focus: number; }
export interface ChatMessage { role: 'user' | 'model'; text: string; }

interface DailyLoopState {
  // Estado de Sessão
  activeSession: 'Home' | 'Tasks' | 'Financial' | 'Bio-Sync';
  isListening: boolean;
  isFocusActive: boolean;
  
  // Dados do Usuário (Persistidos)
  tasks: Task[];
  finances: Transaction[];
  bio: BioMetrics;
  chatHistory: ChatMessage[];

  // Ações
  setActiveSession: (s: any) => void;
  toggleListening: () => void;
  toggleFocus: () => void;
  addTask: (t: Task) => void;
  toggleTask: (id: string) => void;
  addTransaction: (t: Transaction) => void;
  addMessage: (role: 'user' | 'model', text: string) => void;
}

export const useStore = create<DailyLoopState>()(
  persist(
    (set) => ({
      activeSession: 'Home',
      isListening: false,
      isFocusActive: false,
      
      // Dados Iniciais (Mockados para você ver funcionando logo de cara)
      tasks: [
        { id: '1', title: 'Reunião de Alinhamento', time: '10:00', done: false, category: 'work' },
        { id: '2', title: 'Corrida no Parque', time: '18:00', done: false, category: 'health' },
      ],
      finances: [
        { id: '1', label: 'Freelance', value: 2500, type: 'income', color: '#4ade80' }, // Green
        { id: '2', label: 'Assinaturas', value: 150, type: 'expense', color: '#f87171' }, // Red
        { id: '3', label: 'Investimento', value: 500, type: 'expense', color: '#60a5fa' }, // Blue
      ],
      bio: { heartRate: 75, stress: 20, focus: 85 },
      chatHistory: [],

      setActiveSession: (activeSession) => set({ activeSession }),
      toggleListening: () => set((s) => ({ isListening: !s.isListening })),
      toggleFocus: () => set((s) => ({ isFocusActive: !s.isFocusActive })),
      addTask: (t) => set((s) => ({ tasks: [...s.tasks, t] })),
      toggleTask: (id) => set((s) => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })),
      addTransaction: (t) => set((s) => ({ finances: [...s.finances, t] })),
      addMessage: (role, text) => set((s) => ({ chatHistory: [...s.chatHistory, { role, text }].slice(-30) })),
    }),
    { name: 'daily-loop-master-v1', storage: createJSONStorage(() => localStorage) }
  )
);