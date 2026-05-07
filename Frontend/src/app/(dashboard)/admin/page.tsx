"use client";

import { TailAdminDashboard } from "@/components/admin/tailadmin-dashboard";
import { useDashboardStats } from "@/hooks/admin/use-dashboard-stats";

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useDashboardStats();

  return (
    <>
      {isLoading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard...</p> : null}
      {isError ? <p className="text-sm text-red-600">Failed to load dashboard data.</p> : null}
      {data ? <TailAdminDashboard stats={data} /> : null}
    </>
  );
}


