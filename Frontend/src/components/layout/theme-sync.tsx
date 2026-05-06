"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/ui-store";

export function ThemeSync() {
  const theme = useUiStore((state) => state.theme);
  const hydrateThemeFromCookie = useUiStore((state) => state.hydrateThemeFromCookie);

  useEffect(() => {
    hydrateThemeFromCookie();
  }, [hydrateThemeFromCookie]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return null;
}
