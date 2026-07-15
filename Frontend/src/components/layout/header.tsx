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
  const [profileImage, setProfileImage] = useState<string | null>(null);
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
        if (response.data.profile_image) {
          const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
          setProfileImage(`${base}/${response.data.profile_image.replace(/^\//, "")}`);
        }
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

  const displayEmail = user?.email?.trim() || tokenEmail || "";

  const initials =
    displayName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800/80 dark:bg-slate-950 md:px-5">
      {/* Left — sidebar toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h10" />
          </svg>
        </button>
      </div>

      {/* Right — actions + user */}
      <div className="relative flex items-center gap-2" ref={profileRef}>
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell */}
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Notifications"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 17H5l1.2-1.2A2 2 0 0 0 7 14.4V10a5 5 0 1 1 10 0v4.4a2 2 0 0 0 .8 1.6L19 17h-4" />
            <path d="M10.5 19a1.5 1.5 0 0 0 3 0" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-400 ring-2 ring-white dark:ring-slate-950" />
        </button>

        {/* Thin divider */}
        <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

        {/* User avatar button */}
        <button
          type="button"
          onClick={() => setIsProfileOpen((prev) => !prev)}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-3 transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
          aria-haspopup="menu"
          aria-expanded={isProfileOpen}
        >
          {/* Avatar */}
          {profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profileImage} alt={displayName} className="h-7 w-7 rounded-lg object-cover shadow-sm" />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-[11px] font-extrabold text-white shadow-sm">
              {initials}
            </span>
          )}
          <span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-700 dark:text-slate-200 sm:block">
            {displayName}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={cn(
              "hidden h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform dark:text-slate-500 sm:block",
              isProfileOpen && "rotate-180"
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {/* ── Profile Dropdown ── */}
        {isProfileOpen ? (
          <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(92vw,256px)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-10px_rgba(15,23,42,0.18)] dark:border-slate-700/80 dark:bg-slate-950 dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]">
            {/* Gradient header */}
            <div className="relative bg-gradient-to-br from-brand-600 via-brand-500 to-blue-400 px-5 pb-5 pt-5">
              {/* Subtle grid watermark */}
              <svg
                className="absolute inset-0 h-full w-full opacity-[0.08]"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <defs>
                  <pattern id="header-dropdown-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M28 0H0v28" fill="none" stroke="white" strokeWidth="0.6" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#header-dropdown-grid)" />
              </svg>

              {/* Avatar */}
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImage} alt={displayName} className="h-12 w-12 rounded-2xl border-2 border-white/30 object-cover" />
              ) : (
                <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/20 text-base font-extrabold text-white backdrop-blur-sm">
                  {initials}
                </span>
              )}

              {/* Name + email */}
              <p className="mt-3 truncate font-bold text-white">{displayName}</p>
              {displayEmail && (
                <p className="mt-0.5 truncate text-xs text-white/70">{displayEmail}</p>
              )}

              {/* Role badge */}
              <span className="mt-2 inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                {role}
              </span>
            </div>

            {/* Actions */}
            <div className="p-1.5">
              <button
                type="button"
                onClick={onViewProfile}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/70"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2.1 12a10.7 10.7 0 0 1 19.8 0 10.7 10.7 0 0 1-19.8 0z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                View Profile
              </button>
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/70"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20a8 8 0 0 1 16 0" />
                  </svg>
                </span>
                Edit Profile
              </button>
            </div>

            {/* Divider */}
            <div className="mx-3 h-px bg-slate-100 dark:bg-slate-900" />

            {/* Sign out */}
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => void onLogout()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                </span>
                Sign Out
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

