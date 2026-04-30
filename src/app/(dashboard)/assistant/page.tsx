"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AssistantDashboard } from "@/components/dashboard/assistant-dashboard";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

export default function AssistantDashboardPage() {
  const { data, isLoading, isError } = useDashboardStats("assistant");

  return (
    <DashboardLayout role="assistant">
      {isLoading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard...</p> : null}
      {isError ? <p className="text-sm text-red-600">Failed to load dashboard data.</p> : null}
      {data ? <AssistantDashboard stats={data} /> : null}
    </DashboardLayout>
  );
}
