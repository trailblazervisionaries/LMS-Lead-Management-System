"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";

const PAGE_SIZE = 10;

interface AdminLeadItem {
  id: string;
  submitted_data?: Record<string, unknown> | null;
  created_at?: string | null;
  assigned_assistant?: {
    assistant_id?: string;
    name?: string;
    email?: string;
  } | null;
}

interface AdminLeadsResponse {
  items: AdminLeadItem[];
  total_count: number;
  page: number;
  size: number;
  total_pages: number;
}

interface AssignedLeadRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedAssistantId: string;
  assignedAssistantName: string;
  assignedAssistantEmail: string;
  createdAt: string;
}

interface AssistantListItem {
  user_id: string;
  name: string;
  email?: string;
  is_active?: boolean;
  is_deleted?: boolean;
}

interface AssistantNameIdResponseItem {
  user_id: string;
  name: string;
}

interface AssistantListResponse {
  items: AssistantListItem[];
  total_count: number;
  page: number;
  size: number;
  total_pages: number;
}

interface AuthTokenPayload {
  sub?: string;
  user_id?: string;
  id?: string;
  email?: string;
}

function getAuthToken() {
  if (typeof document === "undefined") {
    return null;
  }
  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token=") || cookie.startsWith("auth="))
    ?.split("=")[1];
  return tokenFromCookie ? decodeURIComponent(tokenFromCookie) : null;
}

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

function getAdminUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as AuthTokenPayload;
    const userId = payload.user_id?.trim() || payload.id?.trim();
    if (userId) return userId;
    const sub = payload.sub?.trim();
    if (sub && !sub.includes("@")) return sub;
    return null;
  } catch {
    return null;
  }
}

function mapAssignedLead(lead: AdminLeadItem): AssignedLeadRecord {
  const submittedData = lead.submitted_data && typeof lead.submitted_data === "object" ? lead.submitted_data : {};
  return {
    id: lead.id,
    name: getSubmittedValue(submittedData, ["name", "full name", "lead name", "customer name"]),
    email: getSubmittedValue(submittedData, ["email", "email address", "mail"]),
    phone: getSubmittedValue(submittedData, ["phone", "phone number", "mobile", "contact", "phone_number"]),
    assignedAssistantId: lead.assigned_assistant?.assistant_id?.trim() || "",
    assignedAssistantName: lead.assigned_assistant?.name?.trim() || "Unassigned",
    assignedAssistantEmail: lead.assigned_assistant?.email?.trim() || "-",
    createdAt: lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"
  };
}

export default function AdminAssignedLeadsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAssistants, setIsLoadingAssistants] = useState(false);
  const [isAssigningLeads, setIsAssigningLeads] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState("");
  const [isForceAssigningLeadId, setIsForceAssigningLeadId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [assignedLeads, setAssignedLeads] = useState<AssignedLeadRecord[]>([]);
  const [assistantOptions, setAssistantOptions] = useState<AssistantListItem[]>([]);
  const [leadAssignmentDraft, setLeadAssignmentDraft] = useState<Record<string, string>>({});
  const [searchField, setSearchField] = useState<"name" | "email" | "phone">("name");
  const [searchQuery, setSearchQuery] = useState("");

  const activeAssistantOptions = useMemo(
    () => assistantOptions.filter((assistant) => assistant.is_active !== false && !assistant.is_deleted),
    [assistantOptions]
  );
  const hasAssistantOptions = activeAssistantOptions.length > 0;

  const loadAssignedLeads = useCallback(async (page: number) => {
    const token = getAuthToken();
    if (!token) {
      setError("Admin authentication required. Please log in again.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await api.get<AdminLeadsResponse>("/api/lead/admin/leads", {
        params: { page, size: PAGE_SIZE },
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = response.data;
      const items = Array.isArray(payload.items) ? payload.items : [];
      const onlyAssigned = items.filter((lead) => Boolean(lead.assigned_assistant));
      setAssignedLeads(onlyAssigned.map(mapAssignedLead));
      setTotalCount(payload.total_count ?? 0);
      setTotalPages(Math.max(payload.total_pages ?? 1, 1));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Unable to load assigned leads."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAssistants = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Admin authentication required. Please log in again.");
      return;
    }
    setIsLoadingAssistants(true);
    try {
      const adminUserId = getAdminUserIdFromToken(token);
      let mappedAssistants: AssistantListItem[] = [];
      if (adminUserId) {
        const response = await api.get<AssistantNameIdResponseItem[]>(
          `/api/assistant/allassistant/name/id/${encodeURIComponent(adminUserId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const assistantItems = Array.isArray(response.data) ? response.data : [];
        mappedAssistants = assistantItems.map((assistant) => ({
          user_id: assistant.user_id,
          name: assistant.name,
          email: "",
          is_active: true,
          is_deleted: false
        }));
      }
      if (!mappedAssistants.length) {
        const fallbackResponse = await api.get<AssistantListResponse>("/api/assistant/all", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const fallbackItems = Array.isArray(fallbackResponse.data.items) ? fallbackResponse.data.items : [];
        mappedAssistants = fallbackItems.filter((assistant) => !assistant.is_deleted);
      }
      setAssistantOptions(mappedAssistants);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Unable to fetch assistants."));
    } finally {
      setIsLoadingAssistants(false);
    }
  }, []);

  const deleteAssignedLead = useCallback(
    async (leadId: string) => {
      const token = getAuthToken();
      if (!token) {
        setError("Admin authentication required. Please log in again.");
        return;
      }
      const confirmed = window.confirm("Delete this assigned lead?");
      if (!confirmed) return;
      setDeletingLeadId(leadId);
      setError("");
      try {
        await api.delete(`/api/lead/assistant/${leadId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await loadAssignedLeads(currentPage);
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, "Unable to delete assigned lead."));
      } finally {
        setDeletingLeadId("");
      }
    },
    [currentPage, loadAssignedLeads]
  );

  const forceAssignLead = async (leadId: string) => {
    setError("");
    setMessage("");
    const assistantId = leadAssignmentDraft[leadId]?.trim() ?? "";
    if (!assistantId) {
      setError("Please select an assistant before assigning this lead.");
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setError("Admin authentication required. Please log in again.");
      return;
    }
    setIsForceAssigningLeadId(leadId);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const assignmentPayloadCandidates = [
        { assistant_id: assistantId, lead_id: leadId },
        { assistant_user_id: assistantId, lead_id: leadId },
        { assistantId, leadId }
      ];
      let assignmentUpdated = false;
      let lastError: unknown = null;
      for (const payload of assignmentPayloadCandidates) {
        try {
          await api.post("/api/lead/admin/force-assign", payload, { headers });
          assignmentUpdated = true;
          break;
        } catch (apiError) {
          lastError = apiError;
        }
      }
      if (!assignmentUpdated) {
        throw lastError ?? new Error("Unable to update lead assignment.");
      }
      await loadAssignedLeads(currentPage);
      setMessage("Lead assistant updated successfully.");
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Unable to update lead assignment."));
    } finally {
      setIsForceAssigningLeadId("");
    }
  };

  const assignUnassignedLeads = async () => {
    setError("");
    setMessage("");
    const token = getAuthToken();
    if (!token) {
      setError("Admin authentication required. Please log in again.");
      return;
    }
    setIsAssigningLeads(true);
    try {
      await api.post("/api/lead/admin/assign-unassigned", null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadAssignedLeads(currentPage);
      setMessage("Unassigned leads have been assigned successfully.");
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Unable to assign unassigned leads."));
    } finally {
      setIsAssigningLeads(false);
    }
  };

  useEffect(() => {
    void loadAssignedLeads(currentPage);
  }, [currentPage, loadAssignedLeads]);

  useEffect(() => {
    void loadAssistants();
  }, [loadAssistants]);

  useEffect(() => {
    setLeadAssignmentDraft((prev) => {
      const next: Record<string, string> = { ...prev };
      assignedLeads.forEach((lead) => {
        next[lead.id] = lead.assignedAssistantId;
      });
      return next;
    });
  }, [assignedLeads]);

  const filteredAssignedLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return assignedLeads;
    return assignedLeads.filter((lead) => String(lead[searchField] ?? "").toLowerCase().includes(query));
  }, [assignedLeads, searchField, searchQuery]);

  const assignedCountInPage = useMemo(() => filteredAssignedLeads.length, [filteredAssignedLeads]);

  return (
    <section className="mx-auto w-full space-y-5 lg:space-y-6">

      {/* ── PAGE HEADER ── */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-brand-500 dark:from-emerald-800 dark:via-emerald-700 dark:to-brand-800" />
        <div className="px-6 py-6 sm:px-7 sm:py-7">
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
            Lead Operations
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Assigned Leads
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            View and manage leads assigned to your assistants. Reassign or remove assignments as needed.
          </p>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-3">
            <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Leads</p>
              <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{totalCount}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">All pipeline leads</p>
            </div>
            <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Shown</p>
              <p className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{assignedCountInPage}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Assigned this page</p>
            </div>
            <div className="col-span-2 flex flex-col gap-1 px-6 py-4 sm:col-span-1 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">Page</p>
              <p className="text-3xl font-semibold tabular-nums text-brand-700 dark:text-brand-300">
                {currentPage} / {Math.max(totalPages, 1)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Current page</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── NOTIFICATIONS ── */}
      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
          <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
        </div>
      ) : null}
      {message ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{message}</p>
        </div>
      ) : null}

      {/* ── LEADS TABLE ── */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">

        {/* Table header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Leads List</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Only leads assigned to an assistant are shown.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {assignedCountInPage} shown
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void assignUnassignedLeads()}
              disabled={isAssigningLeads}
              className="gap-1.5"
            >
              {isAssigningLeads ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Assigning...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Assign Unassigned
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Search filters */}
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div className="grid gap-3.5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Search By
              </label>
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as "name" | "email" | "phone")}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900/40"
              >
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Search Value
              </label>
              <Input
                placeholder={`Search by ${searchField}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Lead ID</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Name</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Email</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Phone</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Assigned Assistant</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Created</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center sm:px-6">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <svg className="h-4 w-4 animate-spin text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading assigned leads…
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isLoading && filteredAssignedLeads.map((lead) => {
                const selectedAssistantId = leadAssignmentDraft[lead.id] ?? "";
                const hasAssignmentChanged = selectedAssistantId !== (lead.assignedAssistantId ?? "");

                return (
                  <tr key={lead.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60">
                    <td className="px-5 py-4 sm:px-6">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {lead.id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100 sm:px-6">{lead.name}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 sm:px-6">{lead.email}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 sm:px-6">{lead.phone}</td>
                    <td className="px-5 py-4 sm:px-6">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{lead.assignedAssistantName}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{lead.assignedAssistantEmail}</p>
                      <div className="mt-3 flex flex-col gap-2">
                        <select
                          value={selectedAssistantId}
                          onChange={(event) =>
                            setLeadAssignmentDraft((prev) => ({ ...prev, [lead.id]: event.target.value }))
                          }
                          disabled={isLoadingAssistants || !hasAssistantOptions}
                          className="h-9 w-full min-w-[200px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900/40"
                        >
                          <option value="">
                            {isLoadingAssistants ? "Loading…" : hasAssistantOptions ? "Select assistant to change" : "No assistants available"}
                          </option>
                          {activeAssistantOptions.map((assistant) => (
                            <option key={assistant.user_id} value={assistant.user_id}>
                              {assistant.name}{assistant.is_active === false ? " [Inactive]" : ""}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void forceAssignLead(lead.id)}
                          disabled={isLoadingAssistants || !hasAssistantOptions || !selectedAssistantId || !hasAssignmentChanged || isForceAssigningLeadId === lead.id}
                          className="text-xs"
                        >
                          {isForceAssigningLeadId === lead.id ? "Assigning…" : "Change Assistant"}
                        </Button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 sm:px-6">{lead.createdAt}</td>
                    <td className="px-5 py-4 sm:px-6">
                      <button
                        type="button"
                        onClick={() => void deleteAssignedLead(lead.id)}
                        disabled={isLoading || deletingLeadId === lead.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        {deletingLeadId === lead.id ? (
                          <>
                            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            Deleting…
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                            </svg>
                            Delete
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!isLoading && !filteredAssignedLeads.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center sm:px-6">
                    <div className="flex flex-col items-center gap-2.5">
                      <svg className="h-9 w-9 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {searchQuery.trim() ? "No leads match your search." : "No assigned leads found on this page."}
                      </p>
                      {searchQuery.trim() ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          Clear search
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{currentPage}</span>
            {" "}of{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.max(totalPages, 1)}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage <= 1 || isLoading}
            >
              ← Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.max(totalPages, 1)))}
              disabled={currentPage >= Math.max(totalPages, 1) || isLoading}
            >
              Next →
            </Button>
          </div>
        </div>
      </Card>

    </section>
  );
}
