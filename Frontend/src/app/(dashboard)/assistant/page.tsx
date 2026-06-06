"use client";

import { useMemo } from "react";
import { AssistantDashboard, type AssistantDashboardLead } from "@/components/assistants/assistant-dashboard";
import { useAssistantAssignedLeads } from "@/hooks/assistant/use-assigned-leads";
import { useDashboardStats } from "@/hooks/assistant/use-dashboard-stats";

const RECENT_LEADS_SIZE = 10;

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getSubmittedValue(data: Record<string, unknown>, aliases: string[]): string {
  const normalized = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [normalizeKey(key), String(value ?? "").trim()])
  ) as Record<string, string>;

  for (const alias of aliases) {
    const match = normalized[normalizeKey(alias)];
    if (match) return match;
  }

  return "-";
}

export default function AssistantDashboardPage() {
  const { data, isLoading, isError } = useDashboardStats();
  const {
    data: assignedLeadsData,
    isLoading: isAssignedLeadsLoading,
    isError: isAssignedLeadsError,
    error: assignedLeadsError
  } = useAssistantAssignedLeads(1, RECENT_LEADS_SIZE);

  const recentLeads = useMemo<AssistantDashboardLead[]>(() => {
    const items = assignedLeadsData?.items ?? [];

    return items.map((lead) => {
      const submittedData = lead.submitted_data && typeof lead.submitted_data === "object" ? lead.submitted_data : {};

      return {
        id: lead.id,
        name: getSubmittedValue(submittedData, ["name", "full name", "lead name", "customer name"]),
        email: getSubmittedValue(submittedData, ["email", "email address", "mail"]),
        source: getSubmittedValue(submittedData, ["source", "lead source", "channel"]),
        priority: getSubmittedValue(submittedData, ["priority", "lead priority"]),
        stage: lead.status?.trim() || "-",
        assignedOn: lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"
      };
    });
  }, [assignedLeadsData]);

  return (
    <>
      {isLoading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard...</p> : null}
      {isError ? <p className="text-sm text-red-600">Failed to load dashboard data.</p> : null}
      {data ? (
        <AssistantDashboard
          stats={data}
          recentLeads={recentLeads}
          isRecentLeadsLoading={isAssignedLeadsLoading}
          recentLeadsError={
            isAssignedLeadsError
              ? assignedLeadsError instanceof Error
                ? assignedLeadsError.message
                : "Unable to load assigned leads."
              : null
          }
        />
      ) : null}
    </>
  );
}


