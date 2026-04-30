"use client";

import { PropsWithChildren, useState } from "react";
import { UserRole } from "@/types/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface DashboardLayoutProps extends PropsWithChildren {
  role: UserRole;
}

export function DashboardLayout({ role, children }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  const onToggleSidebar = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setIsSidebarCollapsed((prev) => !prev);
      return;
    }
    setIsSidebarMobileOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 md:flex md:h-screen md:overflow-hidden">
      <Sidebar
        role={role}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isSidebarMobileOpen}
        onCloseMobile={() => setIsSidebarMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col md:min-h-0">
        <Header
          role={role}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={onToggleSidebar}
        />
        <main className="flex-1 p-4 md:min-h-0 md:overflow-y-auto md:p-6">{children}</main>
      </div>
    </div>
  );
}
