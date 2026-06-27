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

interface NavGroup {
  label: string;
  items: NavItem[];
}

function getDashboardNavGroups(basePath: "/admin" | "/assistant"): NavGroup[] {
  const overview: NavItem[] = [
    {
      label: "Dashboard",
      href: basePath,
      icon: (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="8" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" />
        </svg>
      )
    }
  ];

  const management: NavItem[] = [];
  if (basePath === "/admin") {
    management.push(
      {
        label: "User Management",
        href: `${basePath}/user-management`,
        icon: (
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 18a5.5 5.5 0 0 1 11 0" />
            <path d="M17 11h4M19 9v4" />
          </svg>
        )
      },
      {
        label: "Lead Forms",
        href: `${basePath}/lead-forms`,
        icon: (
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 8h8M8 12h8M8 16h5" />
          </svg>
        )
      },
      {
        label: "Form Snippet",
        href: `${basePath}/form-snippet`,
        icon: (
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 9l-4 3 4 3" />
            <path d="M16 9l4 3-4 3" />
            <path d="M14 5l-4 14" />
          </svg>
        )
      }
    );
  }

  const leads: NavItem[] = [
    {
      label: "Add Leads",
      href: `${basePath}/total-leads`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
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
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      )
    }
  ];

  const tools: NavItem[] = [
    {
      label: "Email Sending",
      href: `${basePath}/email-sending`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )
    },
    {
      label: "All Logs",
      href: `${basePath}/all-logs`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="4" cy="6" r="1" />
          <circle cx="4" cy="12" r="1" />
          <circle cx="4" cy="18" r="1" />
        </svg>
      )
    }
  ];

  const account: NavItem[] = [
    {
      label: "Profile",
      href: `${basePath}/profile`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      )
    }
  ];

  return [
    { label: "Overview", items: overview },
    ...(management.length ? [{ label: "Management", items: management }] : []),
    { label: "Leads", items: leads },
    { label: "Tools", items: tools },
    { label: "Account", items: account }
  ];
}

const NAV_GROUPS: Record<UserRole, NavGroup[]> = {
  admin: getDashboardNavGroups("/admin"),
  assistant: getDashboardNavGroups("/assistant")
};

export function Sidebar({ role, isCollapsed, isMobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      <button
        type="button"
        onClick={onCloseMobile}
        aria-label="Close sidebar overlay"
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity md:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-slate-800/80 dark:bg-slate-950 md:static md:z-auto md:h-screen md:shadow-none md:transition-all md:duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
          isCollapsed ? "md:w-[72px]" : "md:w-[260px]",
          "w-[260px] shadow-xl"
        )}
      >
        {/* ── Logo & Brand ── */}
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-slate-100 dark:border-slate-800/80",
            isCollapsed ? "md:justify-center md:px-0 md:py-5" : "gap-3 px-5 py-5"
          )}
        >
          {/* Logo icon — always visible */}
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-base font-extrabold text-white shadow-sm shadow-brand-300/40 dark:shadow-brand-900/30">
            L
          </span>

          {/* App name + role — hidden when collapsed */}
          <div className={cn("min-w-0 flex-1", isCollapsed && "md:hidden")}>
            <p className="truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
              LeadAdmin
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {role}
            </p>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 md:hidden"
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className={cn("flex-1 overflow-y-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", isCollapsed ? "md:px-2" : "px-3")}>
          {NAV_GROUPS[role].map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-5")}>
              {/* Group label — hidden when collapsed */}
              <p
                className={cn(
                  "mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600",
                  isCollapsed && "md:hidden"
                )}
              >
                {group.label}
              </p>

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center rounded-xl text-[13px] font-semibold transition-all duration-150",
                        isCollapsed ? "md:justify-center md:px-2 md:py-2.5" : "gap-2.5 px-2 py-2.5",
                        active
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
                      )}
                    >
                      {/* Icon wrapper */}
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
                            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                        )}
                      >
                        {item.icon}
                      </span>

                      {/* Label */}
                      <span className={cn("truncate", isCollapsed && "md:hidden")}>
                        {item.label}
                      </span>

                      {/* Active dot indicator */}
                      {active && (
                        <span className={cn("ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500 dark:bg-brand-400", isCollapsed && "md:hidden")} />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Sidebar Footer ── */}
        <div
          className={cn(
            "shrink-0 border-t border-slate-100 dark:border-slate-800/80",
            isCollapsed ? "md:px-2 md:py-3" : "px-4 py-3"
          )}
        >
          <div className={cn("flex items-center gap-2", isCollapsed && "md:justify-center")}>
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <p className={cn("text-[11px] font-medium text-slate-400 dark:text-slate-600", isCollapsed && "md:hidden")}>
              All systems operational
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
