"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardStat } from "@/types/dashboard";
import api from "@/api/axios";
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
    card: "border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-indigo-100/60 dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-indigo-600/5",
    icon: "bg-indigo-600 text-white shadow-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:shadow-none",
    value: "text-indigo-900 dark:text-indigo-100",
    label: "text-indigo-700/80 dark:text-indigo-300/70",
    chip: "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/60 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-500/20",
    bar: "bg-indigo-200/60 dark:bg-indigo-500/20",
    accent: "#6366f1"
  },
  {
    card: "border-blue-200/60 bg-gradient-to-br from-blue-50 to-blue-100/60 dark:border-blue-500/20 dark:from-blue-500/10 dark:to-blue-600/5",
    icon: "bg-blue-600 text-white shadow-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:shadow-none",
    value: "text-blue-900 dark:text-blue-100",
    label: "text-blue-700/80 dark:text-blue-300/70",
    chip: "bg-blue-100 text-blue-700 ring-1 ring-blue-200/60 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/20",
    bar: "bg-blue-200/60 dark:bg-blue-500/20",
    accent: "#3b82f6"
  },
  {
    card: "border-cyan-200/60 bg-gradient-to-br from-cyan-50 to-cyan-100/60 dark:border-cyan-500/20 dark:from-cyan-500/10 dark:to-cyan-600/5",
    icon: "bg-cyan-600 text-white shadow-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-200 dark:shadow-none",
    value: "text-cyan-900 dark:text-cyan-100",
    label: "text-cyan-700/80 dark:text-cyan-300/70",
    chip: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200/60 dark:bg-cyan-500/15 dark:text-cyan-200 dark:ring-cyan-500/20",
    bar: "bg-cyan-200/60 dark:bg-cyan-500/20",
    accent: "#06b6d4"
  },
  {
    card: "border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-100/60 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-amber-600/5",
    icon: "bg-amber-500 text-white shadow-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:shadow-none",
    value: "text-amber-900 dark:text-amber-100",
    label: "text-amber-700/80 dark:text-amber-300/70",
    chip: "bg-amber-100 text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/20",
    bar: "bg-amber-200/60 dark:bg-amber-500/20",
    accent: "#f59e0b"
  },
  {
    card: "border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-emerald-600/5",
    icon: "bg-emerald-600 text-white shadow-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:shadow-none",
    value: "text-emerald-900 dark:text-emerald-100",
    label: "text-emerald-700/80 dark:text-emerald-300/70",
    chip: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/20",
    bar: "bg-emerald-200/60 dark:bg-emerald-500/20",
    accent: "#10b981"
  }
];

function getStatIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("contact")) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.92 12 19.79 19.79 0 0 1 1.87 3.4 2 2 0 0 1 3.85 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91A16 16 0 0 0 12 13.85l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    );
  }
  if (l.includes("convert")) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    );
  }
  if (l.includes("interest")) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

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

function getStatusStyle(status: string) {
  const s = status.toLowerCase();
  if (s === "-" || !s) return "bg-slate-100 text-slate-500 ring-slate-200/60 dark:bg-slate-950 dark:text-slate-400 dark:ring-slate-700";
  if (s.includes("convert") || s.includes("success") || s.includes("won"))
    return "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800";
  if (s.includes("interest"))
    return "bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800";
  if (s.includes("contact"))
    return "bg-indigo-50 text-indigo-700 ring-indigo-200/60 dark:bg-indigo-950/30 dark:text-indigo-300 dark:ring-indigo-800";
  if (s.includes("pending") || s.includes("open") || s.includes("new"))
    return "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800";
  if (s.includes("lost") || s.includes("reject") || s.includes("cancel"))
    return "bg-red-50 text-red-600 ring-red-200/60 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800";
  return "bg-slate-100 text-slate-600 ring-slate-200/60 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700";
}

function getNameInitials(name: string) {
  if (!name || name === "-") return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const nameAvatarColors = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return nameAvatarColors[Math.abs(hash) % nameAvatarColors.length];
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
    <section className="space-y-6 pb-10">

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((item, index) => {
          const styles = adminStatCardStyles[index % adminStatCardStyles.length];

          return (
            <div
              key={item.label}
              className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${styles.card}`}
            >
              {/* Decorative mini bar chart in background */}
              <svg
                className="absolute bottom-0 right-0 h-14 w-20 opacity-[0.07]"
                viewBox="0 0 80 56"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="0" y="32" width="10" height="24" rx="2" />
                <rect x="14" y="20" width="10" height="36" rx="2" />
                <rect x="28" y="10" width="10" height="46" rx="2" />
                <rect x="42" y="24" width="10" height="32" rx="2" />
                <rect x="56" y="6" width="10" height="50" rx="2" />
                <rect x="70" y="16" width="10" height="40" rx="2" />
              </svg>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${styles.label}`}>{item.label}</p>
                  <p className={`mt-3 text-4xl font-bold tracking-tight ${styles.value}`}>
                    {formatNumber(item.value)}
                  </p>
                </div>
                <div
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${styles.icon}`}
                >
                  {getStatIcon(item.label)}
                </div>
              </div>

              <div className={`mt-5 border-t pt-4 ${styles.bar}`}>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${styles.chip}`}>
                  {item.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Follow-up Planner ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">

        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Follow-up Planner
                </p>
                <h3 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">All Follow-ups</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeFollowUpRange?.displayRange ?? "Select a date range"}
                </p>
              </div>
            </div>

            {/* Range tabs */}
            <div className="w-full overflow-x-auto sm:w-auto">
              <div className="flex min-w-max gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/60">
                {followUpRangeOptions.map((option) => {
                  const isActive = option.key === selectedFollowUpRange;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => onFollowUpRangeChange(option.key)}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-950 dark:text-brand-300 dark:ring-slate-700"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          <div className="flex flex-col gap-1 px-6 py-4 sm:px-7">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">In Range</p>
            <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatNumber(totalFollowUps)}</p>
            <p className="text-xs font-medium text-brand-600 dark:text-brand-400">{activeFollowUpRange?.description ?? "Selected range"}</p>
          </div>
          <div className="flex flex-col gap-1 px-6 py-4 sm:px-7">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Current Page</p>
            <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{currentFollowUpPage}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Showing this page</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/20">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lead ID</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Remark</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Follow-up Date</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isFollowUpsLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span className="text-sm">Loading follow-ups...</span>
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isFollowUpsLoading && followUpsError ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-red-500 dark:text-red-400">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                      </svg>
                      <span className="text-sm">{followUpsError}</span>
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isFollowUpsLoading && !followUpsError
                ? followUps.map((followUp) => (
                    <tr
                      key={followUp.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">
                          {followUp.leadId}
                        </span>
                      </td>
                      <td className="max-w-sm px-5 py-4">
                        <p className="line-clamp-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          {followUp.remarks}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                          Added {formatDateTime(followUp.createdAt)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatDateTime(followUp.dueDate)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                            followUp.isCompleted
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800"
                              : "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${followUp.isCompleted ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {followUp.isCompleted ? "Completed" : "Open"}
                        </span>
                      </td>
                    </tr>
                  ))
                : null}

              {!isFollowUpsLoading && !followUpsError && !followUps.length ? (
                <tr>
                  <td colSpan={4} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                      <svg viewBox="0 0 24 24" className="h-9 w-9 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <p className="text-sm font-medium">No follow-ups found for this range.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page <span className="font-semibold text-slate-700 dark:text-slate-200">{currentFollowUpPage}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFollowUpPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentFollowUpPage <= 1 || isFollowUpsLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Previous
            </button>
            <button
              type="button"
              onClick={() => setFollowUpPage(nextFollowUpPage ?? currentFollowUpPage + 1)}
              disabled={!nextFollowUpPage || isFollowUpsLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Lead Category Donut */}
        <div className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                  <path d="M22 12A10 10 0 0 0 12 2v10z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Lead Category</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Status distribution</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-6">
            <div className="grid flex-1 items-center gap-6 md:grid-cols-[minmax(160px,200px)_1fr]">
              {/* Donut */}
              <div
                className="relative mx-auto aspect-square w-full max-w-[200px] rounded-full"
                style={{ background: `conic-gradient(${leadCategoryGradient})` }}
              >
                <div className="absolute inset-[16%] rounded-full bg-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] dark:bg-slate-950" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {formatNumber(contactedLeadStat?.value ?? 0)}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Contacted</p>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3">
                {leadCategoryItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.percent}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{formatNumber(item.value)} leads</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Goal Progress Arc */}
        <div className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Lead Goal Progress</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Target conversion rate</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col px-6 pb-6 pt-4">
            {/* Arc */}
            <div className="relative mx-auto w-full max-w-[300px]">
              <svg width="300" height="178" viewBox="0 0 240 140" className="h-auto w-full overflow-visible">
                <defs>
                  <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6F88F6" />
                    <stop offset="100%" stopColor="#3158E8" />
                  </linearGradient>
                </defs>
                {/* Track */}
                <path
                  d="M 20 120 A 100 100 0 0 1 220 120"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="14"
                  strokeLinecap="round"
                  className="dark:stroke-slate-700"
                />
                {/* Fill */}
                <path
                  d="M 20 120 A 100 100 0 0 1 220 120"
                  fill="none"
                  stroke="url(#goalGradient)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={`${goalPercent} 100`}
                />
                {/* Marker */}
                <circle
                  cx={goalMarkerX}
                  cy={goalMarkerY}
                  r="7"
                  fill="#3158E8"
                  stroke="white"
                  strokeWidth="3"
                  className="dark:stroke-slate-900"
                />
              </svg>

              <div className="absolute inset-x-0 bottom-3 text-center">
                <p className="text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl">
                  {goalPercent}%
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {formatNumber(goalAchieved)} of {formatNumber(goalTarget)} leads converted
                </p>
              </div>
            </div>

            {/* Progress bars */}
            <div className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-600" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Leads Converted</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{goalPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-700"
                    style={{ width: `${goalPercent}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total Interested</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{interestedPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-700"
                    style={{ width: `${interestedPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Leads Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Recent Leads</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest submitted leads</p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            {/* Search */}
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:border-brand-600 dark:focus-within:ring-brand-900/30 sm:w-auto">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                value={dealSearch}
                onChange={(event) => setDealSearch(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 sm:w-52"
                placeholder="Search leads..."
                aria-label="Search leads"
              />
              {dealSearch ? (
                <button
                  type="button"
                  onClick={() => setDealSearch("")}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
            <Link
              href="/admin/assigned-leads"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              View All
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/20">
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Lead ID</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Lead Name</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Email</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Assigned To</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Created</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isRecentLeadsLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span className="text-sm">Loading recent leads...</span>
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isRecentLeadsLoading && recentLeadsError ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-red-500 dark:text-red-400">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                      </svg>
                      <span className="text-sm">{recentLeadsError}</span>
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isRecentLeadsLoading && !recentLeadsError
                ? filteredRecentLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="group/row transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/30"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">
                          {lead.id}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${getAvatarColor(lead.name)}`}
                          >
                            {getNameInitials(lead.name)}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{lead.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{lead.email}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${getAvatarColor(lead.addedBy)}`}
                          >
                            {getNameInitials(lead.addedBy)}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">{lead.addedBy}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{lead.createdAt}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(lead.status)}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))
                : null}

              {!isRecentLeadsLoading && !recentLeadsError && !filteredRecentLeads.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                      <svg viewBox="0 0 24 24" className="h-8 w-8 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      <p className="text-sm font-medium">
                        {recentLeads.length ? `No leads found for "${dealSearch}"` : "No recent leads found."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}


