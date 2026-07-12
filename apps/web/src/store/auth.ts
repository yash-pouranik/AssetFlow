import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Role = 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (token: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken, isAuthenticated: true }),
        
      setUser: (user) => set({ user }),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'assetflow-auth',
    }
  )
);
