"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAssistantAssignedLeads } from "@/hooks/assistant/use-assigned-leads";
import {
  deleteAssistantAssignedLead,
  getAssistantLeadDetails,
  getAssistantLeadHistory,
  getAssistantLeadRemarkDetails,
  updateAssistantLeadRemark,
  updateAssistantLeadStatus
} from "@/services/assistant/assigned-leads-service";
import {
  AssistantAssignedLeadRecord,
  AssistantLeadDetails,
  AssistantLeadHistoryItem,
  AssistantLeadRemarkItem,
  AssistantLeadRemarkDetails
} from "@/types/assistant/assigned-leads";

const PAGE_SIZE = 20;
const LEAD_STATUS_OPTIONS = ["Contacted", "Interested", "Converted"];

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

function formatDateTime(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "-";
}

function getDateTimestamp(value?: string | null): number {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatFollowUpDateForApi(value: string): string {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [hours = "00", minutes = "00", seconds = "00"] = timePart.split(":");
  return `${datePart}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}.000000`;
}

function getValueOrFallback(value: string, fallback: string): string {
  return value === "-" ? fallback : value;
}

function mapAssignedLead(lead: {
  id: string;
  submitted_data?: Record<string, unknown> | null;
  created_at?: string | null;
  status?: string | null;
  assigned_assistant?: string | null;
}): AssistantAssignedLeadRecord {
  const submittedData = lead.submitted_data && typeof lead.submitted_data === "object" ? lead.submitted_data : {};

  return {
    id: lead.id,
    name: getSubmittedValue(submittedData, ["name", "full name", "lead name", "customer name"]),
    email: getSubmittedValue(submittedData, ["email", "email address", "mail"]),
    phone: getSubmittedValue(submittedData, ["phone", "phone number", "mobile", "contact", "phone_number"]),
    status: lead.status?.trim() || "Assigned",
    assignedAssistant: lead.assigned_assistant?.trim() || "You",
    createdAt: lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"
  };
}

export default function AssistantAssignedLeadsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<AssistantAssignedLeadRecord | null>(null);
  const [selectedLeadSummary, setSelectedLeadSummary] = useState<AssistantAssignedLeadRecord | null>(null);
  const [selectedLeadDetails, setSelectedLeadDetails] = useState<AssistantLeadDetails | null>(null);
  const [leadRemarkDetails, setLeadRemarkDetails] = useState<AssistantLeadRemarkDetails | null>(null);
  const [selectedLeadView, setSelectedLeadView] = useState<"details" | "history" | "update" | "remarkUpdate">(
    "details"
  );
  const [selectedRemarkToUpdate, setSelectedRemarkToUpdate] = useState<AssistantLeadRemarkItem | null>(null);
  const [leadHistory, setLeadHistory] = useState<AssistantLeadHistoryItem[]>([]);
  const [leadHistoryCache, setLeadHistoryCache] = useState<Record<string, AssistantLeadHistoryItem[]>>({});
  const [isLeadDetailsLoading, setIsLeadDetailsLoading] = useState(false);
  const [isLeadRemarksLoading, setIsLeadRemarksLoading] = useState(false);
  const [isLeadHistoryLoading, setIsLeadHistoryLoading] = useState(false);
  const [isUpdatingLeadStatus, setIsUpdatingLeadStatus] = useState(false);
  const [isUpdatingRemark, setIsUpdatingRemark] = useState(false);
  const [leadDetailsError, setLeadDetailsError] = useState("");
  const [leadRemarksError, setLeadRemarksError] = useState("");
  const [leadHistoryError, setLeadHistoryError] = useState("");
  const [leadUpdateError, setLeadUpdateError] = useState("");
  const [remarkUpdateError, setRemarkUpdateError] = useState("");
  const [leadUpdateMessage, setLeadUpdateMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [leadStatusForm, setLeadStatusForm] = useState({
    status: "Interested",
    remarks: "",
    nextFollowUpDate: "",
    isCompleted: false
  });
  const [remarkUpdateForm, setRemarkUpdateForm] = useState({
    remarks: "",
    isCompleted: false
  });
  const { data, isLoading, isError, error, refetch } = useAssistantAssignedLeads(currentPage, PAGE_SIZE);

  const assignedLeads = useMemo<AssistantAssignedLeadRecord[]>(() => {
    const items = data?.items ?? [];
    return items.map(mapAssignedLead);
  }, [data]);

  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.max(data?.total_pages ?? 1, 1);
  const assignedCountInPage = assignedLeads.length;
  const selectedSubmittedData =
    selectedLeadDetails?.submitted_data && typeof selectedLeadDetails.submitted_data === "object"
      ? selectedLeadDetails.submitted_data
      : {};
  const selectedLeadName = getValueOrFallback(
    getSubmittedValue(selectedSubmittedData, ["name", "full name", "lead name", "customer name"]),
    selectedLeadSummary?.name || "Lead"
  );
  const selectedLeadEmail = getValueOrFallback(
    getSubmittedValue(selectedSubmittedData, ["email", "email address", "mail"]),
    selectedLeadSummary?.email || "-"
  );
  const selectedLeadPhone = getValueOrFallback(
    getSubmittedValue(selectedSubmittedData, ["phone", "phone number", "mobile", "contact", "phone_number"]),
    selectedLeadSummary?.phone || "-"
  );
  const visibleStatusHistory = useMemo(
    () =>
      (leadRemarkDetails?.status_history ?? [])
        .filter((item) => !item.is_deleted)
        .sort((first, second) => getDateTimestamp(first.created_at) - getDateTimestamp(second.created_at)),
    [leadRemarkDetails]
  );
  const visibleRemarks = useMemo(
    () =>
      (leadRemarkDetails?.remarks ?? [])
        .filter((item) => !item.is_deleted)
        .sort((first, second) => getDateTimestamp(second.created_at) - getDateTimestamp(first.created_at)),
    [leadRemarkDetails]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openDeleteConfirm = (lead: AssistantAssignedLeadRecord) => {
    if (deletingLeadId) {
      return;
    }

    setDeleteError("");
    setLeadToDelete(lead);
  };

  const openLeadDetails = async (lead: AssistantAssignedLeadRecord) => {
    setSelectedLeadSummary(lead);
    setSelectedLeadDetails(null);
    setLeadRemarkDetails(null);
    setSelectedLeadView("details");
    setLeadHistory(leadHistoryCache[lead.id] ?? []);
    setLeadDetailsError("");
    setLeadRemarksError("");
    setLeadHistoryError("");
    setLeadUpdateError("");
    setRemarkUpdateError("");
    setLeadUpdateMessage("");
    setSelectedRemarkToUpdate(null);
    setIsLeadDetailsLoading(true);
    setIsLeadRemarksLoading(true);

    try {
      const details = await getAssistantLeadDetails(lead.id);
      setSelectedLeadDetails(details);
    } catch (apiError) {
      setLeadDetailsError(apiError instanceof Error ? apiError.message : "Unable to load lead details.");
    } finally {
      setIsLeadDetailsLoading(false);
    }

    try {
      const remarkDetails = await getAssistantLeadRemarkDetails(lead.id);
      setLeadRemarkDetails(remarkDetails);
    } catch (apiError) {
      setLeadRemarksError(apiError instanceof Error ? apiError.message : "Unable to load lead remarks.");
    } finally {
      setIsLeadRemarksLoading(false);
    }
  };

  const closeLeadDetails = () => {
    setSelectedLeadSummary(null);
    setSelectedLeadDetails(null);
    setLeadRemarkDetails(null);
    setSelectedLeadView("details");
    setLeadHistory([]);
    setLeadDetailsError("");
    setLeadRemarksError("");
    setLeadHistoryError("");
    setLeadUpdateError("");
    setRemarkUpdateError("");
    setLeadUpdateMessage("");
    setSelectedRemarkToUpdate(null);
    setIsLeadDetailsLoading(false);
    setIsLeadRemarksLoading(false);
    setIsLeadHistoryLoading(false);
    setIsUpdatingLeadStatus(false);
    setIsUpdatingRemark(false);
  };

  const openLeadHistory = async () => {
    if (!selectedLeadSummary) {
      return;
    }

    setSelectedLeadView("history");
    setLeadHistoryError("");

    const cachedHistory = leadHistoryCache[selectedLeadSummary.id];
    if (cachedHistory) {
      setLeadHistory(cachedHistory);
      return;
    }

    setIsLeadHistoryLoading(true);

    try {
      const history = await getAssistantLeadHistory(selectedLeadSummary.id);
      const normalizedHistory = Array.isArray(history) ? history : [];
      setLeadHistory(normalizedHistory);
      setLeadHistoryCache((prev) => ({
        ...prev,
        [selectedLeadSummary.id]: normalizedHistory
      }));
    } catch (apiError) {
      setLeadHistoryError(apiError instanceof Error ? apiError.message : "Unable to load lead history.");
    } finally {
      setIsLeadHistoryLoading(false);
    }
  };

  const showLeadDetails = () => {
    setSelectedLeadView("details");
    setLeadHistoryError("");
    setLeadUpdateError("");
    setRemarkUpdateError("");
    setSelectedRemarkToUpdate(null);
  };

  const openLeadStatusUpdate = () => {
    const currentStatus = selectedLeadDetails?.status?.trim() || selectedLeadSummary?.status?.trim() || "";
    setSelectedLeadView("update");
    setLeadUpdateError("");
    setRemarkUpdateError("");
    setLeadUpdateMessage("");
    setLeadStatusForm((prev) => ({
      ...prev,
      status: LEAD_STATUS_OPTIONS.includes(currentStatus) ? currentStatus : prev.status
    }));
  };

  const setRemarkUpdateDraft = (remark: AssistantLeadRemarkItem) => {
    setSelectedRemarkToUpdate(remark);
    setRemarkUpdateForm({
      remarks: remark.remarks?.trim() || "",
      isCompleted: remark.is_completed
    });
  };

  const openLeadRemarkUpdate = (remark = visibleRemarks[0]) => {
    if (!remark) {
      setLeadUpdateError("No remarks are available to update.");
      return;
    }

    setRemarkUpdateDraft(remark);
    setSelectedLeadView("remarkUpdate");
    setLeadUpdateError("");
    setRemarkUpdateError("");
    setLeadUpdateMessage("");
  };

  const selectRemarkForUpdate = (remarkId: string) => {
    const remark = visibleRemarks.find((item) => item.id === remarkId);
    if (remark) {
      setRemarkUpdateDraft(remark);
    }
  };

  const submitLeadStatusUpdate = async () => {
    if (!selectedLeadSummary) {
      return;
    }

    const remarks = leadStatusForm.remarks.trim();
    if (!remarks) {
      setLeadUpdateError("Remarks are required.");
      return;
    }

    if (!leadStatusForm.nextFollowUpDate) {
      setLeadUpdateError("Next follow-up date is required.");
      return;
    }

    setIsUpdatingLeadStatus(true);
    setLeadUpdateError("");
    setLeadUpdateMessage("");

    try {
      await updateAssistantLeadStatus(selectedLeadSummary.id, {
        status: leadStatusForm.status,
        remarks,
        next_follow_up_date: formatFollowUpDateForApi(leadStatusForm.nextFollowUpDate),
        is_completed: leadStatusForm.isCompleted
      });

      const details = await getAssistantLeadDetails(selectedLeadSummary.id);
      const remarkDetails = await getAssistantLeadRemarkDetails(selectedLeadSummary.id);
      setSelectedLeadDetails(details);
      setLeadRemarkDetails(remarkDetails);
      setLeadHistoryCache((prev) => {
        const next = { ...prev };
        delete next[selectedLeadSummary.id];
        return next;
      });
      await refetch();
      setLeadUpdateMessage("Lead status and remark updated successfully.");
      setSelectedLeadView("details");
    } catch (apiError) {
      setLeadUpdateError(apiError instanceof Error ? apiError.message : "Unable to update lead status.");
    } finally {
      setIsUpdatingLeadStatus(false);
    }
  };

  const submitRemarkUpdate = async () => {
    if (!selectedLeadSummary || !selectedRemarkToUpdate) {
      return;
    }

    const remarks = remarkUpdateForm.remarks.trim();
    if (!remarks) {
      setRemarkUpdateError("Remarks are required.");
      return;
    }

    setIsUpdatingRemark(true);
    setRemarkUpdateError("");
    setLeadUpdateMessage("");

    try {
      await updateAssistantLeadRemark(selectedLeadSummary.id, selectedRemarkToUpdate.id, {
        remarks,
        is_completed: remarkUpdateForm.isCompleted
      });

      const remarkDetails = await getAssistantLeadRemarkDetails(selectedLeadSummary.id);
      setLeadRemarkDetails(remarkDetails);
      setLeadUpdateMessage("Remark updated successfully.");
      setSelectedRemarkToUpdate(null);
      setSelectedLeadView("details");
    } catch (apiError) {
      setRemarkUpdateError(apiError instanceof Error ? apiError.message : "Unable to update remark.");
    } finally {
      setIsUpdatingRemark(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (deletingLeadId) {
      return;
    }

    setLeadToDelete(null);
  };

  const confirmDeleteLead = async () => {
    if (!leadToDelete || deletingLeadId) {
      return;
    }

    setDeleteError("");
    setDeletingLeadId(leadToDelete.id);

    try {
      await deleteAssistantAssignedLead(leadToDelete.id);
      await refetch();
      setLeadToDelete(null);
    } catch (apiError) {
      setDeleteError(apiError instanceof Error ? apiError.message : "Unable to delete assigned lead.");
    } finally {
      setDeletingLeadId(null);
    }
  };

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
              View all leads assigned to you and keep follow-up work organized.
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

      {isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error instanceof Error ? error.message : "Unable to load assigned leads."}
        </p>
      ) : null}
      {deleteError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {deleteError}
        </p>
      ) : null}

      {selectedLeadSummary ? (
        <Card className="rounded-3xl border-slate-200/80 p-0 shadow-sm dark:border-slate-700">
          <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={closeLeadDetails}
                  className="text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  All Leads
                </button>
                <span>&gt;</span>
                {selectedLeadView === "history" || selectedLeadView === "update" || selectedLeadView === "remarkUpdate" ? (
                  <button
                    type="button"
                    onClick={showLeadDetails}
                    className="text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                  >
                    {selectedLeadName}
                  </button>
                ) : (
                  <span className="text-slate-900 dark:text-slate-100">{selectedLeadName}</span>
                )}
                {selectedLeadView === "history" ? (
                  <>
                    <span>&gt;</span>
                    <span className="text-slate-900 dark:text-slate-100">History</span>
                  </>
                ) : null}
                {selectedLeadView === "update" ? (
                  <>
                    <span>&gt;</span>
                    <span className="text-slate-900 dark:text-slate-100">Add remark &amp; Status</span>
                  </>
                ) : null}
                {selectedLeadView === "remarkUpdate" ? (
                  <>
                    <span>&gt;</span>
                    <span className="text-slate-900 dark:text-slate-100">Update remark</span>
                  </>
                ) : null}
              </div>
              {selectedLeadView === "details" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="secondary" onClick={openLeadStatusUpdate}>
                    Add remark &amp; Status
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void openLeadHistory()}>
                    History
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {selectedLeadView === "details" && isLeadDetailsLoading ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                Loading lead details...
              </p>
            ) : null}

            {selectedLeadView === "details" && leadDetailsError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {leadDetailsError}
              </p>
            ) : null}

            {selectedLeadView === "details" && leadUpdateMessage ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                {leadUpdateMessage}
              </p>
            ) : null}

            {selectedLeadView === "details" && !isLeadDetailsLoading && !leadDetailsError ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lead ID</p>
                    <p className="mt-2 break-all text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {selectedLeadDetails?.id ?? selectedLeadSummary.id}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedLeadName}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</p>
                    <p className="mt-2 break-all text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedLeadEmail}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedLeadPhone}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
                    <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                      {selectedLeadDetails?.status?.trim() || selectedLeadSummary.status}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</p>
                    <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                      {formatDateTime(selectedLeadDetails?.created_at) || selectedLeadSummary.createdAt}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Updated</p>
                    <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{formatDateTime(selectedLeadDetails?.updated_at)}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 sm:p-5">
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                        Assistant Activity
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Status &amp; Remarks</h3>
                      {/* <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                        Follow each status change in order, then review the latest assistant remarks and follow-up dates.
                      </p> */}
                    </div>
                    {/* <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Lead {leadRemarkDetails?.lead_id ?? selectedLeadSummary.id}
                    </span> */}
                  </div>

                  {isLeadRemarksLoading ? (
                    <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
                      Loading status and remarks...
                    </p>
                  ) : null}

                  {leadRemarksError ? (
                    <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                      {leadRemarksError}
                    </p>
                  ) : null}

                  {!isLeadRemarksLoading && !leadRemarksError ? (
                    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(420px,1.2fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-950/30 sm:p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Status Flow</h4>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Arrows show how this lead moved between statuses.
                            </p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {visibleStatusHistory.length} updates
                          </span>
                        </div>

                        {visibleStatusHistory.length ? (
                          <div className="mt-4 space-y-2.5">
                            {visibleStatusHistory.map((item, index) => (
                              <div
                                key={item.id}
                                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                              >
                                {index > 0 ? (
                                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                    <span className="h-px flex-1 bg-emerald-200 dark:bg-emerald-900/60" />
                                    <svg
                                      aria-hidden="true"
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                                    </svg>
                                    <span>next change</span>
                                  </div>
                                ) : null}
                                <div className="flex items-start gap-3">
                                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                    {index + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {item.status?.trim() || "-"}
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                      {formatDateTime(item.created_at)}
                                    </p>
                                    <p className="mt-2 break-all text-[11px] text-slate-500 dark:text-slate-400">
                                      Changed by:{" "}
                                      <span className="font-medium text-slate-700 dark:text-slate-200">
                                        {item.changed_by?.trim() || "System"}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            No status changes found for this lead.
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/30">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Remarks</h4>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Latest notes and next follow-up dates from the assistant.
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {visibleRemarks.length} notes
                          </span>
                        </div>

                        {visibleRemarks.length ? (
                          <div className="mt-4 space-y-3">
                            {visibleRemarks.map((remark, index) => (
                              <div
                                key={remark.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {index === 0 ? "Latest remark" : `Remark ${index + 1}`}
                                  </span>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      remark.is_completed
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                    }`}
                                  >
                                    {remark.is_completed ? "Completed" : "Open follow-up"}
                                  </span>
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                                  {remark.remarks?.trim() || "-"}
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/40">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                      Next follow-up
                                    </p>
                                    <p className="mt-1 text-xs font-medium text-slate-900 dark:text-slate-100">
                                      {formatDateTime(remark.next_follow_up_date)}
                                    </p>
                                  </div>
                                  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/40">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                      Added
                                    </p>
                                    <p className="mt-1 text-xs font-medium text-slate-900 dark:text-slate-100">
                                      {formatDateTime(remark.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            No remarks found for this lead.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {selectedLeadView === "history" && isLeadHistoryLoading ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                Loading lead history...
              </p>
            ) : null}

            {selectedLeadView === "history" && leadHistoryError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {leadHistoryError}
              </p>
            ) : null}

            {selectedLeadView === "history" && !isLeadHistoryLoading && !leadHistoryError ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">History ID</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Status</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Changed By</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {leadHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{item.id}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{item.status?.trim() || "-"}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{item.changed_by?.trim() || "-"}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDateTime(item.created_at)}</td>
                      </tr>
                    ))}
                    {!leadHistory.length ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          No history found for this lead.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}

            {selectedLeadView === "update" ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add remark &amp; Status</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Update the lead outcome, add the latest remark, and schedule the next follow-up.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openLeadRemarkUpdate()}
                    disabled={isLeadRemarksLoading || !visibleRemarks.length}
                  >
                    Update Remark
                  </Button>
                </div>

                {leadUpdateError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                    {leadUpdateError}
                  </p>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Status
                    <select
                      value={leadStatusForm.status}
                      onChange={(event) =>
                        setLeadStatusForm((prev) => ({
                          ...prev,
                          status: event.target.value
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {LEAD_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Next follow-up date
                    <input
                      type="datetime-local"
                      value={leadStatusForm.nextFollowUpDate}
                      onChange={(event) =>
                        setLeadStatusForm((prev) => ({
                          ...prev,
                          nextFollowUpDate: event.target.value
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Remarks
                  <textarea
                    value={leadStatusForm.remarks}
                    onChange={(event) =>
                      setLeadStatusForm((prev) => ({
                        ...prev,
                        remarks: event.target.value
                      }))
                    }
                    placeholder="Add the latest conversation note..."
                    className="min-h-[160px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={leadStatusForm.isCompleted}
                    onChange={(event) =>
                      setLeadStatusForm((prev) => ({
                        ...prev,
                        isCompleted: event.target.checked
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
                  />
                  Mark this follow-up as completed
                </label>

                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <Button type="button" variant="secondary" onClick={showLeadDetails} disabled={isUpdatingLeadStatus}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void submitLeadStatusUpdate()} disabled={isUpdatingLeadStatus}>
                    {isUpdatingLeadStatus ? "Saving..." : "Save Remarks & Status"}
                  </Button>
                </div>
              </div>
            ) : null}

            {selectedLeadView === "remarkUpdate" ? (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Update remark</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Edit the assistant remark text and completion status for this lead.
                  </p>
                </div>

                {remarkUpdateError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                    {remarkUpdateError}
                  </p>
                ) : null}

                {visibleRemarks.length ? (
                  <>
                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Remark
                      <select
                        value={selectedRemarkToUpdate?.id ?? ""}
                        onChange={(event) => selectRemarkForUpdate(event.target.value)}
                        disabled={isUpdatingRemark}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {visibleRemarks.map((remark, index) => (
                          <option key={remark.id} value={remark.id}>
                            {index === 0 ? "Latest remark" : `Remark ${index + 1}`} - {formatDateTime(remark.created_at)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Remarks
                      <textarea
                        value={remarkUpdateForm.remarks}
                        onChange={(event) =>
                          setRemarkUpdateForm((prev) => ({
                            ...prev,
                            remarks: event.target.value
                          }))
                        }
                        placeholder="Update the assistant remark..."
                        disabled={isUpdatingRemark}
                        className="min-h-[180px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={remarkUpdateForm.isCompleted}
                        onChange={(event) =>
                          setRemarkUpdateForm((prev) => ({
                            ...prev,
                            isCompleted: event.target.checked
                          }))
                        }
                        disabled={isUpdatingRemark}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed dark:border-slate-600"
                      />
                      Mark this follow-up as completed
                    </label>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={openLeadStatusUpdate}
                        disabled={isUpdatingRemark}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={() => void submitRemarkUpdate()} disabled={isUpdatingRemark}>
                        {isUpdatingRemark ? "Saving..." : "Save Remark"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No remarks found for this lead.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card className="rounded-3xl border-slate-200/80 p-0 shadow-sm dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-slate-700 sm:px-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Leads List</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Only your assigned leads are shown here.</p>
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
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Created</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      Loading assigned leads...
                    </td>
                  </tr>
                ) : null}

                {!isLoading &&
                  assignedLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => void openLeadDetails(lead)}
                      className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{lead.id}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{lead.name}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{lead.email}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{lead.phone}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{lead.status}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{lead.createdAt}</td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDeleteConfirm(lead);
                          }}
                          disabled={Boolean(deletingLeadId)}
                        >
                          {deletingLeadId === lead.id ? "Deleting..." : "Delete"}
                        </Button>
                      </td>
                    </tr>
                  ))}

                {!isLoading && !assignedLeads.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No assigned leads found on this page.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
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
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>
      )}

      {leadToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700 dark:text-red-300">
              Confirm Delete
            </p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Delete this assigned lead?
            </h4>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              This will delete lead {leadToDelete.id}. This action cannot be undone.
            </p>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
              <p>Name: {leadToDelete.name}</p>
              <p>Email: {leadToDelete.email}</p>
              <p>Created: {leadToDelete.createdAt}</p>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeDeleteConfirm} disabled={Boolean(deletingLeadId)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void confirmDeleteLead()} disabled={Boolean(deletingLeadId)}>
                {deletingLeadId === leadToDelete.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
