"use client";

import { useMemo, useState } from "react";
import type { DashboardStat } from "@/features/assistant/types/dashboard";
import { Card } from "@/components/ui/card";

interface AssistantDashboardProps {
  stats: DashboardStat[];
}

const ASSISTANT_RECENT_LEADS = [
  { id: "LD-2401", name: "Aarav Mehta", source: "Website", priority: "High", stage: "Follow-up", assignedOn: "2026-04-29" },
  { id: "LD-2402", name: "Priya Sharma", source: "Referral", priority: "Medium", stage: "Qualified", assignedOn: "2026-04-28" },
  { id: "LD-2403", name: "Rahul Verma", source: "Campaign", priority: "Low", stage: "New", assignedOn: "2026-04-28" },
  { id: "LD-2404", name: "Neha Kapoor", source: "Website", priority: "High", stage: "Proposal", assignedOn: "2026-04-27" },
  { id: "LD-2405", name: "Karan Singh", source: "Partner", priority: "Medium", stage: "Follow-up", assignedOn: "2026-04-27" },
  { id: "LD-2406", name: "Isha Nair", source: "Campaign", priority: "Low", stage: "New", assignedOn: "2026-04-26" },
  { id: "LD-2407", name: "Rohan Das", source: "Website", priority: "High", stage: "Qualified", assignedOn: "2026-04-25" },
  { id: "LD-2408", name: "Ananya Rao", source: "Referral", priority: "Medium", stage: "Follow-up", assignedOn: "2026-04-25" },
  { id: "LD-2409", name: "Vikram Jain", source: "Campaign", priority: "Low", stage: "New", assignedOn: "2026-04-24" },
  { id: "LD-2410", name: "Meera Joshi", source: "Website", priority: "Medium", stage: "Qualified", assignedOn: "2026-04-24" }
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function AssistantDashboard({ stats }: AssistantDashboardProps) {
  const [dealSearch, setDealSearch] = useState("");
  const filteredLeads = useMemo(() => {
    const query = dealSearch.trim().toLowerCase();
    if (!query) return ASSISTANT_RECENT_LEADS;

    return ASSISTANT_RECENT_LEADS.filter((lead) =>
      [lead.id, lead.name, lead.source, lead.priority, lead.stage, lead.assignedOn].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [dealSearch]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.slice(0, 4).map((item) => (
          <div key={item.label} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19h16" />
                <path d="M7 15V9" />
                <path d="M12 15V5" />
                <path d="M17 15v-3" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.label}</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{formatNumber(item.value)}</p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{item.trend}</p>
          </div>
        ))}
      </div>

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
              <th className="px-6 py-3">Source</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Stage</th>
              <th className="px-6 py-3">Assigned On</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td className="px-6 py-4 font-medium text-brand-700 dark:text-brand-300">{lead.id}</td>
                <td className="px-6 py-4 text-slate-900 dark:text-slate-100">{lead.name}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.source}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.priority}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.stage}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{lead.assignedOn}</td>
              </tr>
            ))}
            {!filteredLeads.length ? (
              <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  No assigned leads found for &quot;{dealSearch}&quot;.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
