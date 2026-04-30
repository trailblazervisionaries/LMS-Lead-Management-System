"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types/auth";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuthStore } from "@/store/auth-store";

interface HeaderProps {
  role: UserRole;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ role, isSidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const onLogout = () => {
    setIsProfileOpen(false);
    logout();
    router.replace("/login");
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 md:px-6">
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h10" />
          </svg>
        </button>
        <div className="group hidden h-11 max-w-2xl flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100/60 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-brand-700 dark:focus-within:ring-brand-900/30 sm:flex">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-focus-within:bg-brand-50 group-focus-within:text-brand-600 dark:bg-slate-800 dark:text-slate-300 dark:group-focus-within:bg-brand-900/40 dark:group-focus-within:text-brand-300">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            Deals
          </span>
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 6 6 6-6 6" />
          </svg>
          <input
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-slate-100"
            placeholder="Search deals, customer, ID, or type command..."
            aria-label="Search dashboard"
          />
        </div>
      </div>
      <div className="relative flex items-center gap-2" ref={profileRef}>
        <ThemeToggle />
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Notifications"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 17H5l1.2-1.2A2 2 0 0 0 7 14.4V10a5 5 0 1 1 10 0v4.4a2 2 0 0 0 .8 1.6L19 17h-4" />
            <path d="M10.5 19a1.5 1.5 0 0 0 3 0" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-orange-400" />
        </button>

        <button
          type="button"
          onClick={() => setIsProfileOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full px-1 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800 md:gap-3"
          aria-haspopup="menu"
          aria-expanded={isProfileOpen}
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {user?.name
              ?.split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() ?? "U"}
          </span>
          <span className="hidden text-lg font-semibold text-slate-900 dark:text-slate-100 md:block">{user?.name ?? "User"}</span>
          <svg viewBox="0 0 24 24" className={cn("hidden h-5 w-5 text-slate-600 transition-transform dark:text-slate-300 md:block", isProfileOpen && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {isProfileOpen ? (
          <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-[min(92vw,320px)] rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <div>
              <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{user?.name ?? "User"}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user?.email ?? "randomuser@pimjo.com"}</p>
              <p className="mt-1 text-xs capitalize text-slate-400 dark:text-slate-500">{role}</p>
            </div>
            <div className="mt-5 space-y-1 text-[15px] text-slate-700 dark:text-slate-200">
              <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20a8 8 0 0 1 16 0" />
                  </svg>
                </span>
                Edit profile
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="m19.4 15-.6 1.1 1.2 2.1-2.2 2.2-2.1-1.2-1.1.6-.6 2.4h-3.2l-.6-2.4-1.1-.6-2.1 1.2-2.2-2.2 1.2-2.1L4.6 15 2.2 14.4v-3.2l2.4-.6.6-1.1-1.2-2.1 2.2-2.2 2.1 1.2 1.1-.6.6-2.4h3.2l.6 2.4 1.1.6 2.1-1.2 2.2 2.2-1.2 2.1.6 1.1 2.4.6v3.2z" />
                  </svg>
                </span>
                Account settings
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </span>
                Support
              </button>
            </div>
            <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-slate-800 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </span>
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
