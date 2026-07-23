import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  is_active: boolean;
  phone_number: string | null;
  phone_verified: boolean;
  whatsapp_opted_in: boolean;
  dashboard_layout: string | null;
  ai_provider_personal: 'gemini' | 'openai' | 'anthropic';
  ai_provider_business: 'gemini' | 'openai' | 'anthropic';
}

export type WorldMode = 'personal' | 'business';
export type HomeViewStyle = 'carta' | 'terminal' | 'heatmap' | 'capsula';

interface DailyLoopState {
  user: AuthUser | null;
  token: string | null;
  mode: WorldMode;
  homeViewStyle: HomeViewStyle;
  setAuth: (user: AuthUser, token: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
  setMode: (mode: WorldMode) => void;
  setHomeViewStyle: (style: HomeViewStyle) => void;
}

export const useStore = create<DailyLoopState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      mode: 'personal',
      homeViewStyle: 'carta',
      setAuth: (user, token) => set({ user, token }),
      updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),
      logout: () => set({ user: null, token: null }),
      setMode: (mode) => set({ mode }),
      setHomeViewStyle: (homeViewStyle) => set({ homeViewStyle }),
    }),
    { name: 'dailyloop-auth', storage: createJSONStorage(() => localStorage) }
  )
);
