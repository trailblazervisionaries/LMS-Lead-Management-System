"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AuthUser } from "@/types/auth";
import { clearAuthCookies, setAuthCookies } from "@/utils/cookies";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  role: AuthUser["role"] | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      setAuth: (user, token) => {
        setAuthCookies(token, user.role);
        set({ user, token, role: user.role });
      },
      logout: () => {
        clearAuthCookies();
        set({ user: null, token: null, role: null });
      }
    }),
    {
      name: "lms-auth",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
