"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMyActivity } from "@/hooks/assistant/use-my-activity";
import { AuditLogFilters, AuditLogItem } from "@/types/audit/audit-log";

const PAGE_SIZE = 10;

const ENTITY_OPTIONS = [
  { value: "", label: "All Entities" },
  { value: "lead", label: "Lead" },
  { value: "assistant", label: "Assistant" },
  { value: "form", label: "Form" },
  { value: "meeting", label: "Meeting" },
  { value: "assignment", label: "Assignment" },
];

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "ADD", label: "Add" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatTimeAgo(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

function ActionBadge({ action }: { action: string }) {
  const upper = action.toUpperCase();
  const cls =
    upper === "ADD"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400"
      : upper === "UPDATE"
        ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800/40 dark:bg-brand-950/30 dark:text-brand-400"
        : upper === "DELETE"
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400"
          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {action}
    </span>
  );
}

function ActionDot({ action }: { action: string }) {
  const upper = action.toUpperCase();
  const cls =
    upper === "ADD"
      ? "bg-emerald-500 ring-emerald-100 dark:bg-emerald-400 dark:ring-emerald-950/60"
      : upper === "UPDATE"
        ? "bg-brand-500 ring-brand-100 dark:bg-brand-400 dark:ring-brand-950/60"
        : upper === "DELETE"
          ? "bg-red-500 ring-red-100 dark:bg-red-400 dark:ring-red-950/60"
          : "bg-slate-400 ring-slate-100 dark:ring-slate-800";
  return <span className={`h-2.5 w-2.5 rounded-full ring-4 ${cls}`} />;
}

function EntityBadge({ entity }: { entity: string }) {
  const lower = entity.toLowerCase();
  const cls =
    lower === "lead"
      ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/40 dark:bg-indigo-950/30 dark:text-indigo-400"
      : lower === "assistant"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400"
        : lower === "form"
          ? "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/40 dark:bg-cyan-950/30 dark:text-cyan-400"
          : lower === "meeting"
            ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/30 dark:text-violet-400"
            : lower === "assignment"
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-400"
              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase ${cls}`}>
      {entity}
    </span>
  );
}

function DetailModal({ log, onClose }: { log: AuditLogItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-indigo-400 to-brand-500 dark:from-brand-800 dark:via-indigo-700 dark:to-brand-800" />
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Activity Detail</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDate(log.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Entity</p>
              <div className="mt-1.5"><EntityBadge entity={log.entity_name} /></div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Action</p>
              <div className="mt-1.5"><ActionBadge action={log.log_type} /></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Entity ID</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-300">{log.entity_id}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Description</p>
            <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{log.description ?? "—"}</p>
          </div>
          {log.metadata && Object.keys(log.metadata).length > 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Metadata</p>
              <pre className="mt-1.5 overflow-x-auto rounded-lg bg-slate-100 p-3 text-[11px] leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssistantAllLogsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState<AuditLogFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>({});
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const activityQuery = useMyActivity(currentPage, PAGE_SIZE, appliedFilters);

  const logs = activityQuery.data?.items ?? [];
  const totalCount = activityQuery.data?.total_count ?? 0;
  const totalPages = activityQuery.data?.total_pages ?? 1;
  const isPaginationDisabled = activityQuery.isLoading || activityQuery.isFetching;

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, totalCount);

  const addCount = logs.filter((l) => l.log_type?.toUpperCase() === "ADD").length;
  const updateCount = logs.filter((l) => l.log_type?.toUpperCase() === "UPDATE").length;
  const deleteCount = logs.filter((l) => l.log_type?.toUpperCase() === "DELETE").length;

  const applyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setCurrentPage(1);
    setDraftFilters({});
    setAppliedFilters({});
  };

  return (
    <>
      <section className="mx-auto w-full space-y-5 lg:space-y-6">

        {/* ── PAGE HEADER ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-indigo-400 to-brand-500 dark:from-brand-800 dark:via-indigo-700 dark:to-brand-800" />
          <div className="px-6 py-6 sm:px-7 sm:py-7">
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-300">
              Assistant Portal
            </span>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                  My Activity
                </h1>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  A complete history of actions you have performed in the system.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total</p>
                <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{totalCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Actions taken</p>
              </div>
              <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Add</p>
                <p className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{addCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">This page</p>
              </div>
              <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">Update</p>
                <p className="text-3xl font-semibold tabular-nums text-brand-700 dark:text-brand-300">{updateCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">This page</p>
              </div>
              <div className="flex flex-col gap-1 px-6 py-4 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">Delete</p>
                <p className="text-3xl font-semibold tabular-nums text-red-700 dark:text-red-300">{deleteCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">This page</p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── FILTERS ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Filter Activity</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Search your history by entity, action, or date range.</p>
          </div>
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Entity Type
                </label>
                <select
                  value={draftFilters.entity_name ?? ""}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, entity_name: e.target.value || undefined }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-brand-600 dark:focus:ring-brand-900/40"
                >
                  {ENTITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Action
                </label>
                <select
                  value={draftFilters.log_type ?? ""}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, log_type: e.target.value || undefined }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-brand-600 dark:focus:ring-brand-900/40"
                >
                  {ACTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  From Date
                </label>
                <Input
                  type="date"
                  value={draftFilters.from_date ?? ""}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, from_date: e.target.value || undefined }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  To Date
                </label>
                <Input
                  type="date"
                  value={draftFilters.to_date ?? ""}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, to_date: e.target.value || undefined }))}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                Apply Filters
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Reset
              </button>
            </div>
          </div>
        </Card>

        {/* ── TIMELINE / ACTIVITY FEED ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Activity Timeline</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Your recent actions, newest first</p>
            </div>
            {activityQuery.isFetching && !activityQuery.isLoading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800/40 dark:bg-brand-950/30 dark:text-brand-300">
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Refreshing
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {totalCount} total
              </span>
            )}
          </div>

          {activityQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16">
              <svg className="h-5 w-5 animate-spin text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading activity…</p>
            </div>
          ) : activityQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30">
                <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </span>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {activityQuery.error instanceof Error ? activityQuery.error.message : "Unable to load activity"}
              </p>
            </div>
          ) : !logs.length ? (
            <div className="flex flex-col items-center gap-2.5 py-16">
              <svg className="h-9 w-9 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No activity found.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Timestamp</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Entity</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Action</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Description</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Entity ID</th>
                      <th className="px-5 py-3.5 sm:px-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {logs.map((log) => (
                      <tr key={log.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60">
                        <td className="px-5 py-3.5 sm:px-6">
                          <p className="whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300">{formatDate(log.created_at)}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">{formatTimeAgo(log.created_at)}</p>
                        </td>
                        <td className="px-5 py-3.5 sm:px-6">
                          <EntityBadge entity={log.entity_name} />
                        </td>
                        <td className="px-5 py-3.5 sm:px-6">
                          <ActionBadge action={log.log_type} />
                        </td>
                        <td className="max-w-[240px] px-5 py-3.5 sm:px-6">
                          <p className="truncate text-xs text-slate-600 dark:text-slate-300">{log.description ?? "—"}</p>
                        </td>
                        <td className="px-5 py-3.5 sm:px-6">
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {log.entity_id?.length > 12 ? `${log.entity_id.slice(0, 8)}…` : log.entity_id}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 sm:px-6">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile timeline */}
              <div className="px-5 py-5 lg:hidden sm:px-6">
                <div className="relative space-y-0">
                  {logs.map((log, idx) => (
                    <div key={log.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Timeline line */}
                      {idx < logs.length - 1 ? (
                        <div className="absolute left-[13px] top-5 h-full w-px bg-slate-200 dark:bg-slate-800" />
                      ) : null}
                      {/* Dot */}
                      <div className="relative z-10 mt-1 flex-shrink-0">
                        <ActionDot action={log.log_type} />
                      </div>
                      {/* Content */}
                      <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            <EntityBadge entity={log.entity_name} />
                            <ActionBadge action={log.log_type} />
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{formatTimeAgo(log.created_at)}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{log.description ?? "—"}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            {log.entity_id?.length > 12 ? `${log.entity_id.slice(0, 8)}…` : log.entity_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex h-6 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Pagination */}
          {!activityQuery.isLoading && !activityQuery.isError && logs.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {startItem}–{endItem} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1 || isPaginationDisabled}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  ← Previous
                </button>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {currentPage} / {Math.max(totalPages, 1)}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, Math.max(totalPages, 1)))}
                  disabled={currentPage >= Math.max(totalPages, 1) || isPaginationDisabled}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next →
                </button>
              </div>
            </div>
          ) : null}
        </Card>
      </section>

      {/* ── DETAIL MODAL ── */}
      {selectedLog ? (
        <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      ) : null}
    </>
  );
}
