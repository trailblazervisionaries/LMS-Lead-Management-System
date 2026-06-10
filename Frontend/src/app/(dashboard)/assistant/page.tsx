"use client";

import { useMemo, useState } from "react";
import {
  AssistantDashboard,
  type AssistantDashboardFollowUp,
  type AssistantDashboardFollowUpRangeOption,
  type AssistantDashboardLead
} from "@/components/assistants/assistant-dashboard";
import { useAssistantAssignedLeads } from "@/hooks/assistant/use-assigned-leads";
import { useDashboardStats } from "@/hooks/assistant/use-dashboard-stats";
import { useAssistantFollowUps } from "@/hooks/assistant/use-follow-ups";
import type { AssistantFollowUpItem } from "@/types/assistant/follow-ups";

const RECENT_LEADS_SIZE = 10;
const DEFAULT_FOLLOW_UP_RANGE = "today";

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

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function formatDateForFollowUpsApi(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}${month}${year}`;
}

function formatDateRangeLabel(startDate: Date, endDate: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  const startLabel = formatter.format(startDate);
  const endLabel = formatter.format(endDate);

  return startLabel === endLabel ? startLabel : `${startLabel} to ${endLabel}`;
}

function buildFollowUpRangeOptions(referenceDate: Date): AssistantDashboardFollowUpRangeOption[] {
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const ranges = [
    {
      key: "last-month",
      label: "Last Month",
      description: "Past month",
      startDate: addMonths(today, -1),
      endDate: today
    },
    {
      key: "last-week",
      label: "Last Week",
      description: "Past 7 days",
      startDate: addDays(today, -7),
      endDate: today
    },
    {
      key: "past-day",
      label: "Past Day",
      description: "Today and previous day",
      startDate: addDays(today, -1),
      endDate: today
    },
    {
      key: "today",
      label: "Today",
      description: "Current day",
      startDate: today,
      endDate: today
    },
    {
      key: "next-day",
      label: "Next Day",
      description: "Today and next day",
      startDate: today,
      endDate: addDays(today, 1)
    },
    {
      key: "next-week",
      label: "Next Week",
      description: "Next 7 days",
      startDate: today,
      endDate: addDays(today, 7)
    },
    {
      key: "next-month",
      label: "Next Month",
      description: "Next month",
      startDate: today,
      endDate: addMonths(today, 1)
    }
  ];

  return ranges.map((range) => ({
    key: range.key,
    label: range.label,
    description: range.description,
    apiStartDate: formatDateForFollowUpsApi(range.startDate),
    apiEndDate: formatDateForFollowUpsApi(range.endDate),
    displayRange: formatDateRangeLabel(range.startDate, range.endDate)
  }));
}

function mapFollowUp(followUp: AssistantFollowUpItem): AssistantDashboardFollowUp {
  return {
    id: followUp.id,
    leadId: followUp.for_lead?.trim() || followUp.lead_id?.trim() || "-",
    remarks: followUp.remarks?.trim() || "-",
    dueDate: followUp.next_follow_up_date ?? "",
    isCompleted: Boolean(followUp.is_completed),
    createdAt: followUp.created_at ?? ""
  };
}

export default function AssistantDashboardPage() {
  const [selectedFollowUpRange, setSelectedFollowUpRange] = useState(DEFAULT_FOLLOW_UP_RANGE);
  const { data, isLoading, isError } = useDashboardStats();
  const {
    data: assignedLeadsData,
    isLoading: isAssignedLeadsLoading,
    isError: isAssignedLeadsError,
    error: assignedLeadsError
  } = useAssistantAssignedLeads(1, RECENT_LEADS_SIZE);
  const followUpRangeOptions = useMemo(() => buildFollowUpRangeOptions(new Date()), []);
  const activeFollowUpRange =
    followUpRangeOptions.find((option) => option.key === selectedFollowUpRange) ?? followUpRangeOptions[0];
  const {
    data: followUpsData,
    isLoading: isFollowUpsLoading,
    isError: isFollowUpsError,
    error: followUpsError
  } = useAssistantFollowUps(activeFollowUpRange.apiStartDate, activeFollowUpRange.apiEndDate);

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

  const followUps = useMemo<AssistantDashboardFollowUp[]>(() => {
    const items = followUpsData ?? [];
    return items.filter((item) => !item.is_deleted).map(mapFollowUp);
  }, [followUpsData]);

  return (
    <>
      {isLoading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard...</p> : null}
      {isError ? <p className="text-sm text-red-600">Failed to load dashboard data.</p> : null}
      {data ? (
        <AssistantDashboard
          stats={data}
          recentLeads={recentLeads}
          followUps={followUps}
          followUpRangeOptions={followUpRangeOptions}
          selectedFollowUpRange={activeFollowUpRange.key}
          onFollowUpRangeChange={setSelectedFollowUpRange}
          isRecentLeadsLoading={isAssignedLeadsLoading}
          recentLeadsError={
            isAssignedLeadsError
              ? assignedLeadsError instanceof Error
                ? assignedLeadsError.message
                : "Unable to load assigned leads."
              : null
          }
          isFollowUpsLoading={isFollowUpsLoading}
          followUpsError={
            isFollowUpsError
              ? followUpsError instanceof Error
                ? followUpsError.message
                : "Unable to load follow-ups."
              : null
          }
        />
      ) : null}
    </>
  );
}


