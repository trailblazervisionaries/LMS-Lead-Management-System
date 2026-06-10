"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardStat } from "@/types/dashboard";
import api from "@/api/axios";
import { Card } from "@/components/ui/card";
import { getApiErrorMessage } from "@/utils/api-error";

interface TailAdminDashboardProps {
  stats: DashboardStat[];
}

const DEFAULT_FOLLOW_UP_RANGE = "today";

interface RecentLeadItem {
  id: string;
  submitted_data?: Record<string, unknown> | null;
  created_at?: string | null;
  created_by?: {
    name?: string;
    email?: string;
    role?: string;
  } | null;
  added_by?: {
    name?: string;
    email?: string;
    role?: string;
  } | null;
  assigned_assistant?: {
    name?: string;
    email?: string;
  } | null;
}

interface RecentLeadsResponse {
  items: RecentLeadItem[];
}

interface RecentLeadRecord {
  id: string;
  name: string;
  email: string;
  addedBy: string;
  createdAt: string;
  createdAtTime: number;
  status: string;
}

interface AdminFollowUpItem {
  id: string;
  for_lead?: string | null;
  lead_id?: string | null;
  remarks?: string | null;
  next_follow_up_date?: string | null;
  is_completed?: boolean;
  is_deleted?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

interface AdminFollowUpsResponse {
  items?: AdminFollowUpItem[];
  followups?: AdminFollowUpItem[];
  follow_ups?: AdminFollowUpItem[];
  data?: AdminFollowUpItem[];
  results?: AdminFollowUpItem[];
  total_followups?: number;
  current_page?: number;
  next_page?: number | null;
}

interface AdminFollowUpRecord {
  id: string;
  leadId: string;
  remarks: string;
  dueDate: string;
  isCompleted: boolean;
  createdAt: string;
}

interface FollowUpRangeOption {
  key: string;
  label: string;
  description: string;
  apiStartDate: string;
  apiEndDate: string;
  displayRange: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function getDashboardToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token=") || cookie.startsWith("auth="))
    ?.split("=")[1];

  return tokenFromCookie ? decodeURIComponent(tokenFromCookie) : null;
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getSubmittedValue(data: Record<string, unknown>, aliases: string[]) {
  const normalized = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [normalizeKey(key), String(value ?? "").trim()])
  ) as Record<string, string>;

  for (const alias of aliases) {
    const match = normalized[normalizeKey(alias)];
    if (match) return match;
  }

  return "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

function resolveAddedBy(lead: RecentLeadItem) {
  const creator = lead.added_by ?? lead.created_by;
  const creatorName = creator?.name?.trim();
  const creatorEmail = creator?.email?.trim();
  const assistantName = lead.assigned_assistant?.name?.trim();
  const assistantEmail = lead.assigned_assistant?.email?.trim();

  return creatorName || creatorEmail || assistantName || assistantEmail || "Admin";
}

function mapRecentLead(lead: RecentLeadItem): RecentLeadRecord {
  const submittedData = lead.submitted_data && typeof lead.submitted_data === "object" ? lead.submitted_data : {};
  const createdAtTime = lead.created_at ? new Date(lead.created_at).getTime() : 0;

  return {
    id: lead.id,
    name: getSubmittedValue(submittedData, ["name", "full name", "lead name", "customer name"]),
    email: getSubmittedValue(submittedData, ["email", "email address", "mail"]),
    addedBy: resolveAddedBy(lead),
    createdAt: formatDate(lead.created_at),
    createdAtTime: Number.isNaN(createdAtTime) ? 0 : createdAtTime,
    status: getSubmittedValue(submittedData, ["status", "stage", "lead status"])
  };
}

function getPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function normalizeFollowUpsResponse(data: unknown): AdminFollowUpItem[] {
  if (Array.isArray(data)) {
    return data as AdminFollowUpItem[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const response = data as AdminFollowUpsResponse;
  const followUps = response.items ?? response.followups ?? response.follow_ups ?? response.data ?? response.results ?? [];
  return Array.isArray(followUps) ? followUps : [];
}

function mapFollowUp(followUp: AdminFollowUpItem): AdminFollowUpRecord {
  return {
    id: followUp.id,
    leadId: followUp.for_lead?.trim() || followUp.lead_id?.trim() || "-",
    remarks: followUp.remarks?.trim() || "-",
    dueDate: followUp.next_follow_up_date ?? "",
    isCompleted: Boolean(followUp.is_completed),
    createdAt: followUp.created_at ?? ""
  };
}

const adminStatCardStyles = [
  {
    card: "border-indigo-200/70 bg-indigo-50/80 dark:border-indigo-500/20 dark:bg-indigo-500/10",
    icon: "bg-indigo-600 text-white dark:bg-indigo-500/20 dark:text-indigo-200",
    value: "text-indigo-700 dark:text-indigo-100",
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
  },
  {
    card: "border-blue-200/70 bg-blue-50/80 dark:border-blue-500/20 dark:bg-blue-500/10",
    icon: "bg-blue-600 text-white dark:bg-blue-500/20 dark:text-blue-200",
    value: "text-blue-700 dark:text-blue-100",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
  },
  {
    card: "border-cyan-200/70 bg-cyan-50/80 dark:border-cyan-500/20 dark:bg-cyan-500/10",
    icon: "bg-cyan-600 text-white dark:bg-cyan-500/20 dark:text-cyan-200",
    value: "text-cyan-700 dark:text-cyan-100",
    chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200"
  },
  {
    card: "border-amber-200/80 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10",
    icon: "bg-amber-500 text-white dark:bg-amber-500/20 dark:text-amber-200",
    value: "text-amber-700 dark:text-amber-100",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
  },
  {
    card: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10",
    icon: "bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-200",
    value: "text-emerald-700 dark:text-emerald-100",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
  }
];

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number) {
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

function buildFollowUpRangeOptions(referenceDate: Date): FollowUpRangeOption[] {
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

export function TailAdminDashboard({ stats }: TailAdminDashboardProps) {
  const [dealSearch, setDealSearch] = useState("");
  const [recentLeads, setRecentLeads] = useState<RecentLeadRecord[]>([]);
  const [isRecentLeadsLoading, setIsRecentLeadsLoading] = useState(false);
  const [recentLeadsError, setRecentLeadsError] = useState<string | null>(null);
  const [selectedFollowUpRange, setSelectedFollowUpRange] = useState(DEFAULT_FOLLOW_UP_RANGE);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [followUps, setFollowUps] = useState<AdminFollowUpRecord[]>([]);
  const [totalFollowUps, setTotalFollowUps] = useState(0);
  const [currentFollowUpPage, setCurrentFollowUpPage] = useState(1);
  const [nextFollowUpPage, setNextFollowUpPage] = useState<number | null>(null);
  const [isFollowUpsLoading, setIsFollowUpsLoading] = useState(false);
  const [followUpsError, setFollowUpsError] = useState<string | null>(null);
  const filteredRecentLeads = useMemo(() => {
    const query = dealSearch.trim().toLowerCase();
    if (!query) return recentLeads;

    return recentLeads.filter((lead) =>
      [lead.id, lead.name, lead.email, lead.addedBy, lead.createdAt, lead.status].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [dealSearch, recentLeads]);
  const followUpRangeOptions = useMemo(() => buildFollowUpRangeOptions(new Date()), []);
  const activeFollowUpRange =
    followUpRangeOptions.find((option) => option.key === selectedFollowUpRange) ?? followUpRangeOptions[0];
  const totalLeadStat = stats.find((item) => ["Total Leads", "Total Created"].includes(item.label));
  const contactedLeadStat = stats.find((item) => item.label === "Total Contacted");
  const convertedLeadStat = stats.find((item) => item.label === "Total Converted");
  const interestedLeadStat = stats.find((item) => item.label === "Total Interested");
  const goalTarget = totalLeadStat?.value ?? 0;
  const goalAchieved = convertedLeadStat?.value ?? 0;
  const goalPercent = getPercent(goalAchieved, goalTarget);
  const interestedPercent = getPercent(interestedLeadStat?.value ?? 0, goalTarget);
  const contactedPercent = getPercent(contactedLeadStat?.value ?? 0, goalTarget);
  const leadCategoryItems = [
    { label: "Total Interested", value: interestedLeadStat?.value ?? 0, percent: interestedPercent, color: "#3158E8" },
    { label: "Total Converted", value: convertedLeadStat?.value ?? 0, percent: goalPercent, color: "#6F88F6" },
    { label: "Total Contacted", value: contactedLeadStat?.value ?? 0, percent: contactedPercent, color: "#CBD5E1" }
  ];
  let leadCategoryStart = 0;
  const leadCategoryGradient = [
    ...leadCategoryItems.map((item) => {
      const start = leadCategoryStart;
      const end = Math.min(100, start + item.percent);
      leadCategoryStart = end;
      return `${item.color} ${start}% ${end}%`;
    }),
    `#E2E8F0 ${leadCategoryStart}% 100%`
  ].join(",");
  const goalAngle = Math.PI * (1 - goalPercent / 100);
  const goalMarkerX = 120 + 100 * Math.cos(goalAngle);
  const goalMarkerY = 120 - 100 * Math.sin(goalAngle);

  useEffect(() => {
    const loadRecentLeads = async () => {
      const token = getDashboardToken();
      if (!token) {
        setRecentLeadsError("Admin authentication required. Please log in again.");
        return;
      }

      setIsRecentLeadsLoading(true);
      setRecentLeadsError(null);

      try {
        const response = await api.get<RecentLeadsResponse>("/api/lead/admin/leads", {
          params: { page: 1, size: 5 },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const items = Array.isArray(response.data.items) ? response.data.items : [];
        const mappedLeads = items
          .map(mapRecentLead)
          .sort((a, b) => b.createdAtTime - a.createdAtTime);
        setRecentLeads(mappedLeads);
      } catch (error) {
        setRecentLeadsError(getApiErrorMessage(error, "Unable to load recent leads."));
      } finally {
        setIsRecentLeadsLoading(false);
      }
    };

    void loadRecentLeads();
  }, []);

  useEffect(() => {
    const loadFollowUps = async () => {
      const token = getDashboardToken();
      if (!token) {
        setFollowUpsError("Admin authentication required. Please log in again.");
        return;
      }

      setIsFollowUpsLoading(true);
      setFollowUpsError(null);

      try {
        const response = await api.get<AdminFollowUpsResponse>(
          `/api/remark/assistant/followups/${encodeURIComponent(activeFollowUpRange.apiStartDate)}/${encodeURIComponent(activeFollowUpRange.apiEndDate)}`,
          {
            params: { page: followUpPage },
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        const items = normalizeFollowUpsResponse(response.data)
          .filter((item) => !item.is_deleted)
          .map(mapFollowUp);
        setFollowUps(items);
        setTotalFollowUps(response.data.total_followups ?? items.length);
        setCurrentFollowUpPage(response.data.current_page ?? followUpPage);
        setNextFollowUpPage(response.data.next_page ?? null);
      } catch (error) {
        setFollowUpsError(getApiErrorMessage(error, "Unable to load follow-ups."));
      } finally {
        setIsFollowUpsLoading(false);
      }
    };

    void loadFollowUps();
  }, [activeFollowUpRange.apiEndDate, activeFollowUpRange.apiStartDate, followUpPage]);

  const onFollowUpRangeChange = (range: string) => {
    setSelectedFollowUpRange(range);
    setFollowUpPage(1);
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((item, index) => {
          const styles = adminStatCardStyles[index % adminStatCardStyles.length];

          return (
            <Card
              key={item.label}
              className={`min-h-[168px] rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.card}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label}</p>
                  <p className={`mt-4 text-4xl font-semibold tracking-tight ${styles.value}`}>
                    {formatNumber(item.value)}
                  </p>
                </div>
                <div
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${styles.icon}`}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19h16" />
                    <path d="M7 15V9" />
                    <path d="M12 15V5" />
                    <path d="M17 15v-3" />
                  </svg>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/70 pt-4 dark:border-white/10">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.chip}`}>{item.trend}</span>
                <span className="h-2 w-2 rounded-full bg-current text-slate-300 dark:text-slate-600" />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        <Card className="overflow-hidden rounded-2xl border-slate-200/80 p-0 shadow-sm dark:border-slate-800">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
                Follow-up Planner
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Admin Follow-ups</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {activeFollowUpRange?.displayRange ?? "Select a date range"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {followUpRangeOptions.map((option) => {
                const isActive = option.key === selectedFollowUpRange;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => onFollowUpRangeChange(option.key)}
                    className={
                      isActive
                        ? "rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm dark:bg-brand-500"
                        : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-900 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[230px_1fr]">
            <div className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/30 xl:border-b-0 xl:border-r">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Follow-ups in range</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {formatNumber(totalFollowUps)}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                {activeFollowUpRange?.description ?? "Selected range"}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Page {currentFollowUpPage}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-white text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Lead ID</th>
                    <th className="px-5 py-3">Remark</th>
                    <th className="px-5 py-3">Follow-up Date</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isFollowUpsLoading ? (
                    <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                        Loading follow-ups...
                      </td>
                    </tr>
                  ) : null}
                  {!isFollowUpsLoading && followUpsError ? (
                    <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                      <td colSpan={4} className="px-5 py-8 text-center text-red-600 dark:text-red-300">
                        {followUpsError}
                      </td>
                    </tr>
                  ) : null}
                  {!isFollowUpsLoading && !followUpsError
                    ? followUps.map((followUp) => (
                        <tr key={followUp.id} className="border-t border-slate-200 text-sm dark:border-slate-800">
                          <td className="px-5 py-4 font-medium text-brand-700 dark:text-brand-300">{followUp.leadId}</td>
                          <td className="max-w-md px-5 py-4 text-slate-700 dark:text-slate-200">
                            <p className="line-clamp-2">{followUp.remarks}</p>
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                              Added {formatDateTime(followUp.createdAt)}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-slate-700 dark:text-slate-200">
                            {formatDateTime(followUp.dueDate)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                followUp.isCompleted
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              }`}
                            >
                              {followUp.isCompleted ? "Completed" : "Open follow-up"}
                            </span>
                          </td>
                        </tr>
                      ))
                    : null}
                  {!isFollowUpsLoading && !followUpsError && !followUps.length ? (
                    <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                        No follow-ups found for this range.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Page {currentFollowUpPage}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFollowUpPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentFollowUpPage <= 1 || isFollowUpsLoading}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpPage(nextFollowUpPage ?? currentFollowUpPage + 1)}
                    disabled={!nextFollowUpPage || isFollowUpsLoading}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex min-h-[360px] flex-col rounded-2xl p-4 sm:p-5 lg:p-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">Lead Category</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Lead status distribution</p>
          </div>
          <div className="mt-5 grid flex-1 items-center gap-6 md:grid-cols-[minmax(180px,240px)_1fr]">
            <div
              className="relative mx-auto aspect-square w-full max-w-[220px] rounded-full shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700"
              style={{ background: `conic-gradient(${leadCategoryGradient})` }}
            >
              <div className="absolute inset-[18%] rounded-full bg-white shadow-inner dark:bg-slate-900" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {formatNumber(contactedLeadStat?.value ?? 0)}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Total Contacted</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              {leadCategoryItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-3 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{item.label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatNumber(item.value)} leads</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-base font-semibold text-slate-900 dark:text-slate-100">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="flex min-h-[360px] flex-col rounded-2xl p-4 sm:p-5 lg:p-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">Lead Goal Progress</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Target leads for current month</p>
          </div>
          <div className="mt-6 flex flex-1 flex-col justify-center">
            <div className="relative mx-auto w-full max-w-[320px]">
              <svg width="320" height="190" viewBox="0 0 240 140" className="h-auto w-full">
                <path
                  d="M 20 120 A 100 100 0 0 1 220 120"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M 20 120 A 100 100 0 0 1 220 120"
                  fill="none"
                  stroke="#3158E8"
                  strokeWidth="14"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={`${goalPercent} 100`}
                />
                <circle cx={goalMarkerX} cy={goalMarkerY} r="5.5" fill="#3158E8" stroke="white" strokeWidth="2.5" />
              </svg>
              <div className="absolute inset-x-0 bottom-2 text-center">
                <p className="text-5xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl">
                  {goalPercent}%
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {formatNumber(goalAchieved)} / {formatNumber(goalTarget)} leads
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-4 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div>
              <div className="mb-2 flex justify-between gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span>Leads Converted</span>
                <span className="shrink-0">{goalPercent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-2.5 rounded-full bg-brand-600" style={{ width: `${goalPercent}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span>Total Interested</span>
                <span className="shrink-0">{interestedPercent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${interestedPercent}%` }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto rounded-2xl p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Recent Leads
          </h3>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 sm:w-auto">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                value={dealSearch}
                onChange={(event) => setDealSearch(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 sm:w-56"
                placeholder="Search leads..."
                aria-label="Search leads"
              />
            </div>
            <Link
              href="/admin/assigned-leads"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-100"
            >
              More
            </Link>
          </div>
        </div>
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3">Lead ID</th>
              <th className="px-6 py-3">Lead Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Assigned To</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isRecentLeadsLoading ? (
              <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  Loading recent leads...
                </td>
              </tr>
            ) : null}
            {!isRecentLeadsLoading && recentLeadsError ? (
              <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td colSpan={6} className="px-6 py-8 text-center text-red-600">
                  {recentLeadsError}
                </td>
              </tr>
            ) : null}
            {!isRecentLeadsLoading && !recentLeadsError ? filteredRecentLeads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td className="px-6 py-4 font-medium text-brand-700 dark:text-brand-300">{lead.id}</td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.name}</p>
                </td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.email}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.addedBy}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.createdAt}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {lead.status}
                  </span>
                </td>
              </tr>
            )) : null}
            {!isRecentLeadsLoading && !recentLeadsError && !filteredRecentLeads.length ? (
              <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  {recentLeads.length ? `No leads found for "${dealSearch}".` : "No recent leads found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
