"use client";

import { create } from "zustand";
import { getUiThemeCookie, setUiThemeCookie } from "@/utils/cookies";

export type ThemeMode = "light" | "dark";

interface UiState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  hydrateThemeFromCookie: () => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  theme: "light",
  setTheme: (theme) => {
    setUiThemeCookie(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme = get().theme === "light" ? "dark" : "light";
    setUiThemeCookie(nextTheme);
    set({ theme: nextTheme });
  },
  hydrateThemeFromCookie: () => {
    const cookieTheme = getUiThemeCookie();
    const nextTheme: ThemeMode = cookieTheme === "dark" ? "dark" : "light";
    set({ theme: nextTheme });
  }
}));
