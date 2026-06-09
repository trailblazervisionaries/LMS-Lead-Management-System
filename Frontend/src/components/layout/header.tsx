"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types/auth/auth";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuthStore } from "@/store/auth-store";
import { decodeToken, logoutUser } from "@/features/auth/services/auth-service";
import api from "@/api/axios";
import { AdminProfileResponse } from "@/types/admin/admin-profile";

interface HeaderProps {
  role: UserRole;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

function getAuthTokenFromCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token="))
    ?.split("=")[1];

  if (!tokenFromCookie) {
    return null;
  }

  return decodeURIComponent(tokenFromCookie);
}

export function Header({ role, isSidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
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

  useEffect(() => {
    if (role !== "admin" && role !== "assistant") {
      return;
    }

    const token = getAuthTokenFromCookie();
    if (!token) {
      return;
    }

    const currentName = user?.name?.trim() ?? "";
    const currentEmailPrefix = user?.email?.split("@")[0] ?? "";
    const hasLoadedDisplayName = Boolean(currentName && currentName !== currentEmailPrefix);

    if (hasLoadedDisplayName) {
      return;
    }

    let isMounted = true;

    const profileUrl = role === "admin" ? "/api/admin/me" : "/api/assistant/me";

    const hydrateCurrentUser = async () => {
      try {
        const response = await api.get<AdminProfileResponse>(profileUrl, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!isMounted) {
          return;
        }

        setAuth(
          {
            id: response.data.user_id,
            name: response.data.name,
            email: response.data.email,
            role: response.data.role
          },
          token
        );
      } catch {
        // Keep existing fallback display when profile hydration fails.
      }
    };

    void hydrateCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [role, user?.name, user?.email, setAuth]);

  const onLogout = async () => {
    setIsProfileOpen(false);
    try {
      await logoutUser();
    } catch {
      // Continue with local logout even if server logout fails.
    }
    logout();
    router.replace("/login");
  };

  const onOpenProfile = () => {
    setIsProfileOpen(false);
    router.push(role === "admin" ? "/admin/profile/edit" : `/${role}/profile/edit`);
  };

  const onViewProfile = () => {
    setIsProfileOpen(false);
    router.push(role === "admin" ? "/admin/profile" : `/${role}/profile`);
  };

  const token = getAuthTokenFromCookie();
  let tokenName = "";
  let tokenEmail = "";

  if (token) {
    try {
      const payload = decodeToken(token);
      tokenName = payload.name?.trim() ?? "";
      tokenEmail = payload.email?.trim() ?? "";
    } catch {
      tokenName = "";
      tokenEmail = "";
    }
  }

  const displayName =
    user?.name?.trim() || tokenName || user?.email?.split("@")[0] || tokenEmail.split("@")[0] || "User";

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
            {displayName
              ?.split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() ?? "U"}
          </span>
          <span className="hidden text-lg font-semibold text-slate-900 dark:text-slate-100 md:block">{displayName}</span>
          <svg viewBox="0 0 24 24" className={cn("hidden h-5 w-5 text-slate-600 transition-transform dark:text-slate-300 md:block", isProfileOpen && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {isProfileOpen ? (
          <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-[min(92vw,320px)] rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <div>
              <p className="max-w-full truncate text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">{displayName}</p>
              <p className="mt-1 text-xs capitalize text-slate-400 dark:text-slate-500">{role}</p>
            </div>
            <div className="mt-5 space-y-1 text-[15px] text-slate-700 dark:text-slate-200">
              <button type="button" onClick={onViewProfile} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2.1 12a10.7 10.7 0 0 1 19.8 0 10.7 10.7 0 0 1-19.8 0z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                View profile
              </button>
              <button type="button" onClick={onOpenProfile} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20a8 8 0 0 1 16 0" />
                  </svg>
                </span>
                Edit profile
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

