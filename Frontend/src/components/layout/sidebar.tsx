"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/types/auth/auth";
import { cn } from "@/lib/cn";

interface SidebarProps {
  role: UserRole;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: JSX.Element;
}

function getDashboardNav(basePath: "/admin" | "/assistant"): NavItem[] {
  const items: NavItem[] = [
    {
      label: "Dashboard",
      href: basePath,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="8" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" />
        </svg>
      )
    },
    {
      label: "Add Leads",
      href: `${basePath}/total-leads`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19h16" />
          <path d="M7 15V9" />
          <path d="M12 15V5" />
          <path d="M17 15v-3" />
        </svg>
      )
    },
    {
      label: "Assigned Leads",
      href: `${basePath}/assigned-leads`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      )
    },
    {
      label: "All Logs",
      href: `${basePath}/all-logs`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="4" cy="6" r="1" />
          <circle cx="4" cy="12" r="1" />
          <circle cx="4" cy="18" r="1" />
        </svg>
      )
    },
    {
      label: "Profile",
      href: `${basePath}/profile`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      )
    }
  ];

  if (basePath === "/admin") {
    items.splice(1, 0, {
      label: "User Management",
      href: `${basePath}/user-management`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 18a5.5 5.5 0 0 1 11 0" />
          <path d="M17 11h4M19 9v4" />
        </svg>
      )
    });
    items.splice(2, 0, {
      label: "Lead Forms",
      href: `${basePath}/lead-forms`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      )
    });
    items.splice(5, 0, {
      label: "Email Sending",
      href: `${basePath}/email-sending`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )
    });
  }

  return items;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: getDashboardNav("/admin"),
  assistant: getDashboardNav("/assistant")
};

export function Sidebar({ role, isCollapsed, isMobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={onCloseMobile}
        aria-label="Close sidebar overlay"
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/30 transition-opacity md:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 shadow-xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 md:static md:z-auto md:h-screen md:shadow-none md:transition-all md:duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
          isCollapsed ? "md:w-24 md:px-3" : "md:w-72 md:px-6"
        )}
      >
        <div className={cn("mb-6 flex items-center justify-between", isCollapsed ? "md:mb-6 md:justify-center" : "md:mb-8 md:block")}>
          <div className={cn("flex items-center gap-3", isCollapsed && "md:justify-center")}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-semibold text-white">
              L
            </span>
            <p className={cn("text-xl font-semibold text-slate-900 dark:text-slate-100", isCollapsed && "md:hidden")}>LeadAdmin</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 md:hidden dark:border-slate-700 dark:text-slate-200"
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <span
            className={cn(
              "mt-4 hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 sm:inline-flex",
              isCollapsed && "md:hidden"
            )}
          >
            {role}
          </span>
        </div>
        <p className={cn("mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400", isCollapsed && "md:text-center")}>
          {isCollapsed ? "..." : "Menu"}
        </p>
        <nav className="flex flex-col gap-2">
          {NAV_ITEMS[role].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-xl py-3 text-sm font-semibold transition-colors",
                  isCollapsed ? "md:justify-center md:px-3" : "gap-3 px-4",
                  active
                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-100 dark:ring-brand-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                )}
              >
                {item.icon}
                <span className={cn(isCollapsed && "md:hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

