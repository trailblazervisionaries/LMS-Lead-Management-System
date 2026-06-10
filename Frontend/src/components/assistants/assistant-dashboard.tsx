"use client";

import { useMemo, useState } from "react";
import type { DashboardStat } from "@/types/dashboard";
import { Card } from "@/components/ui/card";

export interface AssistantDashboardLead {
  id: string;
  name: string;
  email: string;
  source: string;
  priority: string;
  stage: string;
  assignedOn: string;
}

export interface AssistantDashboardFollowUp {
  id: string;
  leadId: string;
  remarks: string;
  dueDate: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface AssistantDashboardFollowUpRangeOption {
  key: string;
  label: string;
  description: string;
  apiStartDate: string;
  apiEndDate: string;
  displayRange: string;
}

interface AssistantDashboardProps {
  stats: DashboardStat[];
  recentLeads: AssistantDashboardLead[];
  followUps: AssistantDashboardFollowUp[];
  followUpRangeOptions: AssistantDashboardFollowUpRangeOption[];
  selectedFollowUpRange: string;
  onFollowUpRangeChange: (range: string) => void;
  isRecentLeadsLoading?: boolean;
  recentLeadsError?: string | null;
  isFollowUpsLoading?: boolean;
  followUpsError?: string | null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

const statCardStyles = [
  {
    card: "border-blue-200/70 bg-blue-50/80 dark:border-blue-500/20 dark:bg-blue-500/10",
    icon: "bg-blue-600 text-white dark:bg-blue-500/20 dark:text-blue-200",
    value: "text-blue-700 dark:text-blue-100",
    trend: "text-blue-700/70 dark:text-blue-200/70"
  },
  {
    card: "border-cyan-200/70 bg-cyan-50/80 dark:border-cyan-500/20 dark:bg-cyan-500/10",
    icon: "bg-cyan-600 text-white dark:bg-cyan-500/20 dark:text-cyan-200",
    value: "text-cyan-700 dark:text-cyan-100",
    trend: "text-cyan-700/70 dark:text-cyan-200/70"
  },
  {
    card: "border-amber-200/80 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10",
    icon: "bg-amber-500 text-white dark:bg-amber-500/20 dark:text-amber-200",
    value: "text-amber-700 dark:text-amber-100",
    trend: "text-amber-700/70 dark:text-amber-200/70"
  },
  {
    card: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10",
    icon: "bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-200",
    value: "text-emerald-700 dark:text-emerald-100",
    trend: "text-emerald-700/70 dark:text-emerald-200/70"
  }
];

export function AssistantDashboard({
  stats,
  recentLeads,
  followUps,
  followUpRangeOptions,
  selectedFollowUpRange,
  onFollowUpRangeChange,
  isRecentLeadsLoading = false,
  recentLeadsError = null,
  isFollowUpsLoading = false,
  followUpsError = null
}: AssistantDashboardProps) {
  const [dealSearch, setDealSearch] = useState("");
  const filteredLeads = useMemo(() => {
    const query = dealSearch.trim().toLowerCase();
    if (!query) return recentLeads;

    return recentLeads.filter((lead) =>
      [lead.id, lead.name, lead.email, lead.source, lead.priority, lead.stage, lead.assignedOn].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [dealSearch, recentLeads]);
  const selectedFollowUpOption =
    followUpRangeOptions.find((option) => option.key === selectedFollowUpRange) ?? followUpRangeOptions[0];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, index) => {
          const styles = statCardStyles[index % statCardStyles.length];

          return (
            <div
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
                <p className={`text-xs font-semibold uppercase tracking-wide ${styles.trend}`}>{item.trend}</p>
                <span className="h-2 w-2 rounded-full bg-current text-slate-300 dark:text-slate-600" />
              </div>
            </div>
          );
        })}
      </div>

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 p-0 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
              Follow-up Planner
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Assistant Follow-ups</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {selectedFollowUpOption?.displayRange ?? "Select a date range"}
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

        <div className="grid gap-0 xl:grid-cols-[260px_1fr]">
          <div className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/30 xl:border-b-0 xl:border-r">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Follow-ups in range</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {formatNumber(followUps.length)}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              {selectedFollowUpOption?.description ?? "Selected range"}
            </p>
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
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto rounded-2xl p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Recent 10 Assigned Leads
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
                placeholder="Search assigned leads..."
                aria-label="Search assigned leads"
              />
            </div>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-100"
            >
              See all
            </button>
          </div>
        </div>
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3">Lead ID</th>
              <th className="px-6 py-3">Lead Name</th>
               <th className="px-6 py-3">Email</th>
            {/* <th className="px-6 py-3">Priority</th>  */}
              <th className="px-6 py-3">Stage</th>
              <th className="px-6 py-3">Assigned On</th>
            </tr>
          </thead>
          <tbody>
            {isRecentLeadsLoading ? (
              <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  Loading assigned leads...
                </td>
              </tr>
            ) : null}
            {!isRecentLeadsLoading && recentLeadsError ? (
              <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td colSpan={5} className="px-6 py-8 text-center text-red-600 dark:text-red-300">
                  {recentLeadsError}
                </td>
              </tr>
            ) : null}
            {!isRecentLeadsLoading && !recentLeadsError ? filteredLeads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td className="px-6 py-4 font-medium text-brand-700 dark:text-brand-300">{lead.id}</td>
                <td className="px-6 py-4 text-slate-900 dark:text-slate-100">{lead.name}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.email}</td>
                {/* <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.priority}</td> */}
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.stage}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.assignedOn}</td>
              </tr>
            )) : null}
            {!isRecentLeadsLoading && !recentLeadsError && !filteredLeads.length ? (
              <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  {dealSearch ? `No assigned leads found for "${dealSearch}".` : "No assigned leads found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
