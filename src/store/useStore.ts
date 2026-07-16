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
}

interface DailyLoopState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useStore = create<DailyLoopState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'dailyloop-auth', storage: createJSONStorage(() => localStorage) }
  )
);
