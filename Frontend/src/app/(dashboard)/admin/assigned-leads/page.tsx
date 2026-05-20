"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";

const PAGE_SIZE = 10;

interface AdminLeadItem {
  id: string;
  submitted_data?: Record<string, unknown> | null;
  created_at?: string | null;
  assigned_assistant?: {
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
  assignedAssistantName: string;
  assignedAssistantEmail: string;
  createdAt: string;
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

function mapAssignedLead(lead: AdminLeadItem): AssignedLeadRecord {
  const submittedData = lead.submitted_data && typeof lead.submitted_data === "object" ? lead.submitted_data : {};

  return {
    id: lead.id,
    name: getSubmittedValue(submittedData, ["name", "full name", "lead name", "customer name"]),
    email: getSubmittedValue(submittedData, ["email", "email address", "mail"]),
    phone: getSubmittedValue(submittedData, ["phone", "phone number", "mobile", "contact", "phone_number"]),
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
  const [error, setError] = useState("");
  const [assignedLeads, setAssignedLeads] = useState<AssignedLeadRecord[]>([]);

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
        headers: {
          Authorization: `Bearer ${token}`
        }
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

  useEffect(() => {
    void loadAssignedLeads(currentPage);
  }, [currentPage, loadAssignedLeads]);

  const assignedCountInPage = useMemo(() => assignedLeads.length, [assignedLeads]);

  return (
    <section className="space-y-6 lg:space-y-8">
      <Card className="overflow-hidden rounded-3xl border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-0 shadow-md dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Lead Operations
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Assigned Leads</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              View only leads that are assigned to assistants.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Leads</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{totalCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-center shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Assigned In Page</p>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{assignedCountInPage}</p>
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <Card className="rounded-3xl border-slate-200/80 p-0 shadow-sm dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-slate-700 sm:px-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Leads List</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Only assigned leads are shown here.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Assigned shown: {assignedCountInPage}
          </span>
        </div>

        <div className="p-5 sm:p-6">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Lead ID</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Email</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Phone</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Assigned Assistant</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      Loading assigned leads...
                    </td>
                  </tr>
                ) : null}
                {!isLoading &&
                  assignedLeads.map((lead) => (
                    <tr key={lead.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{lead.id}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{lead.name}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{lead.email}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{lead.phone}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{lead.assignedAssistantName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{lead.assignedAssistantEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{lead.createdAt}</td>
                    </tr>
                  ))}
                {!isLoading && !assignedLeads.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No assigned leads found on this page.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage <= 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.max(totalPages, 1)))}
                disabled={currentPage >= Math.max(totalPages, 1) || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
