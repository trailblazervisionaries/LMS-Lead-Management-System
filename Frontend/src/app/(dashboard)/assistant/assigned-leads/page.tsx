"use client";

import { useEffect, useMemo, useState } from "react";
import { useAssistantAssignedLeads } from "@/hooks/assistant/use-assigned-leads";
import {
  deleteAssistantLeadRemark,
  deleteAssistantAssignedLead,
  getAssistantLeadDetails,
  getAssistantLeadHistory,
  getAssistantLeadRemarkDetails,
  markAssistantLeadRemarkComplete,
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
import {
  getMeetingByLead,
  createMeeting,
  updateMeeting,
  deleteMeeting
} from "@/services/assistant/meeting-service";
import { MeetingRecord, CreateMeetingPayload, UpdateMeetingPayload } from "@/types/assistant/meeting";

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
  const [remarkToDelete, setRemarkToDelete] = useState<AssistantLeadRemarkItem | null>(null);
  const [remarkToComplete, setRemarkToComplete] = useState<AssistantLeadRemarkItem | null>(null);
  const [leadHistory, setLeadHistory] = useState<AssistantLeadHistoryItem[]>([]);
  const [leadHistoryCache, setLeadHistoryCache] = useState<Record<string, AssistantLeadHistoryItem[]>>({});
  const [isLeadDetailsLoading, setIsLeadDetailsLoading] = useState(false);
  const [isLeadRemarksLoading, setIsLeadRemarksLoading] = useState(false);
  const [isLeadHistoryLoading, setIsLeadHistoryLoading] = useState(false);
  const [isUpdatingLeadStatus, setIsUpdatingLeadStatus] = useState(false);
  const [isUpdatingRemark, setIsUpdatingRemark] = useState(false);
  const [deletingRemarkId, setDeletingRemarkId] = useState<string | null>(null);
  const [completingRemarkId, setCompletingRemarkId] = useState<string | null>(null);
  const [leadDetailsError, setLeadDetailsError] = useState("");
  const [leadRemarksError, setLeadRemarksError] = useState("");
  const [leadHistoryError, setLeadHistoryError] = useState("");
  const [leadUpdateError, setLeadUpdateError] = useState("");
  const [remarkUpdateError, setRemarkUpdateError] = useState("");
  const [remarkDeleteError, setRemarkDeleteError] = useState("");
  const [remarkCompleteError, setRemarkCompleteError] = useState("");
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
  const [activeMeeting, setActiveMeeting] = useState<MeetingRecord | null>(null);
  const [isMeetingLoading, setIsMeetingLoading] = useState(false);
  const [meetingError, setMeetingError] = useState("");
  const [meetingModal, setMeetingModal] = useState<"schedule" | "edit" | "cancel" | null>(null);
  const [isSubmittingMeeting, setIsSubmittingMeeting] = useState(false);
  const [meetingFormError, setMeetingFormError] = useState("");
  const [meetingForm, setMeetingForm] = useState({ topic: "", date: "", time: "", duration_minutes: 60, agenda: "" });
  const [meetingToast, setMeetingToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
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

  useEffect(() => {
    if (!meetingToast) return;
    const timer = setTimeout(() => setMeetingToast(null), 4000);
    return () => clearTimeout(timer);
  }, [meetingToast]);

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
    setRemarkDeleteError("");
    setRemarkCompleteError("");
    setLeadUpdateMessage("");
    setSelectedRemarkToUpdate(null);
    setRemarkToDelete(null);
    setRemarkToComplete(null);
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

    setActiveMeeting(null);
    setMeetingError("");
    setIsMeetingLoading(true);
    try {
      const meeting = await getMeetingByLead(lead.id);
      setActiveMeeting(meeting);
    } catch (apiError) {
      setMeetingError(apiError instanceof Error ? apiError.message : "Unable to load meeting.");
    } finally {
      setIsMeetingLoading(false);
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
    setRemarkDeleteError("");
    setRemarkCompleteError("");
    setLeadUpdateMessage("");
    setSelectedRemarkToUpdate(null);
    setRemarkToDelete(null);
    setRemarkToComplete(null);
    setIsLeadDetailsLoading(false);
    setIsLeadRemarksLoading(false);
    setIsLeadHistoryLoading(false);
    setIsUpdatingLeadStatus(false);
    setIsUpdatingRemark(false);
    setDeletingRemarkId(null);
    setCompletingRemarkId(null);
    setActiveMeeting(null);
    setIsMeetingLoading(false);
    setMeetingError("");
    setMeetingModal(null);
    setIsSubmittingMeeting(false);
    setMeetingFormError("");
    setMeetingToast(null);
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

  function formatMeetingTime(isoString: string): string {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return (
      date.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Kolkata" }) +
      " · " +
      date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
    );
  }

  const openMeetingModal = (type: "schedule" | "edit" | "cancel") => {
    setMeetingFormError("");
    if (type === "edit" && activeMeeting) {
      const dt = new Date(activeMeeting.start_time);
      // Convert stored UTC time to IST (UTC+5:30) for the date/time inputs
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(dt.getTime() + istOffset);
      const date = istDate.toISOString().split("T")[0] ?? "";
      const time = istDate.toISOString().split("T")[1]?.slice(0, 5) ?? "";
      const mins = activeMeeting.duration_minutes ?? activeMeeting.duration ?? 60;
      setMeetingForm({ topic: activeMeeting.topic, date, time, duration_minutes: mins, agenda: activeMeeting.agenda ?? "" });
    } else if (type === "schedule") {
      setMeetingForm({ topic: "", date: "", time: "", duration_minutes: 60, agenda: "" });
    }
    setMeetingModal(type);
  };

  const closeMeetingModal = () => {
    if (isSubmittingMeeting) return;
    setMeetingModal(null);
    setMeetingFormError("");
  };

  const submitScheduleMeeting = async () => {
    if (!selectedLeadSummary) return;
    const { topic, date, time, duration_minutes } = meetingForm;
    if (!topic.trim()) { setMeetingFormError("Topic is required."); return; }
    if (!date) { setMeetingFormError("Date is required."); return; }
    if (!time) { setMeetingFormError("Time is required."); return; }
    if (duration_minutes < 1) { setMeetingFormError("Duration must be at least 1 minute."); return; }
    setIsSubmittingMeeting(true);
    setMeetingFormError("");
    try {
      const payload: CreateMeetingPayload = {
        lead_id: selectedLeadSummary.id,
        topic: topic.trim(),
        start_time: `${date}T${time}:00+05:30`,
        duration_minutes,
        recipient_email: selectedLeadEmail !== "-" ? selectedLeadEmail : "",
      };
      const result = await createMeeting(payload);
      setActiveMeeting(result);
      setMeetingModal(null);
      setMeetingToast({ type: "success", message: "Meeting scheduled successfully!" });
    } catch (err) {
      setMeetingFormError(err instanceof Error ? err.message : "Unable to schedule meeting.");
    } finally {
      setIsSubmittingMeeting(false);
    }
  };

  const submitEditMeeting = async () => {
    if (!activeMeeting) return;
    const { topic, date, time, duration_minutes } = meetingForm;
    if (!topic.trim()) { setMeetingFormError("Topic is required."); return; }
    if (!date) { setMeetingFormError("Date is required."); return; }
    if (!time) { setMeetingFormError("Time is required."); return; }
    if (duration_minutes < 1) { setMeetingFormError("Duration must be at least 1 minute."); return; }
    setIsSubmittingMeeting(true);
    setMeetingFormError("");
    try {
      const payload: UpdateMeetingPayload = {
        topic: topic.trim(),
        start_time: `${date}T${time}:00+05:30`,
        duration_minutes,
      };
      const result = await updateMeeting(activeMeeting.id, payload);
      setActiveMeeting(result);
      setMeetingModal(null);
      setMeetingToast({ type: "success", message: "Meeting updated successfully!" });
    } catch (err) {
      setMeetingFormError(err instanceof Error ? err.message : "Unable to update meeting.");
    } finally {
      setIsSubmittingMeeting(false);
    }
  };

  const confirmCancelMeeting = async () => {
    if (!activeMeeting) return;
    setIsSubmittingMeeting(true);
    setMeetingFormError("");
    try {
      await deleteMeeting(activeMeeting.id);
      setActiveMeeting(null);
      setMeetingModal(null);
      setMeetingToast({ type: "success", message: "Meeting cancelled successfully." });
    } catch (err) {
      setMeetingFormError(err instanceof Error ? err.message : "Unable to cancel meeting.");
    } finally {
      setIsSubmittingMeeting(false);
    }
  };

  const showLeadDetails = () => {
    setSelectedLeadView("details");
    setLeadHistoryError("");
    setLeadUpdateError("");
    setRemarkUpdateError("");
    setRemarkDeleteError("");
    setRemarkCompleteError("");
    setSelectedRemarkToUpdate(null);
  };

  const openLeadStatusUpdate = () => {
    const currentStatus = selectedLeadDetails?.status?.trim() || selectedLeadSummary?.status?.trim() || "";
    setSelectedLeadView("update");
    setLeadUpdateError("");
    setRemarkUpdateError("");
    setRemarkDeleteError("");
    setRemarkCompleteError("");
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

  const openRemarkDeleteConfirm = (remark: AssistantLeadRemarkItem) => {
    if (deletingRemarkId) {
      return;
    }

    setRemarkDeleteError("");
    setRemarkToDelete(remark);
  };

  const closeRemarkDeleteConfirm = () => {
    if (deletingRemarkId) {
      return;
    }

    setRemarkDeleteError("");
    setRemarkToDelete(null);
  };

  const confirmDeleteRemark = async () => {
    if (!remarkToDelete || deletingRemarkId) {
      return;
    }

    const remarkLeadId = remarkToDelete.for_lead?.trim() || leadRemarkDetails?.lead_id?.trim() || selectedLeadSummary?.id;
    if (!remarkLeadId) {
      setRemarkDeleteError("Lead id is missing for this remark.");
      return;
    }

    setRemarkDeleteError("");
    setDeletingRemarkId(remarkToDelete.id);

    try {
      await deleteAssistantLeadRemark(remarkLeadId, remarkToDelete.id);
      const remarkDetails = await getAssistantLeadRemarkDetails(remarkLeadId);
      setLeadRemarkDetails(remarkDetails);
      if (selectedRemarkToUpdate?.id === remarkToDelete.id) {
        setSelectedRemarkToUpdate(null);
      }
      setLeadUpdateMessage("Remark deleted successfully.");
      setRemarkToDelete(null);
    } catch (apiError) {
      setRemarkDeleteError(apiError instanceof Error ? apiError.message : "Unable to delete remark.");
    } finally {
      setDeletingRemarkId(null);
    }
  };

  const openRemarkCompleteConfirm = (remark: AssistantLeadRemarkItem) => {
    if (completingRemarkId || remark.is_completed) {
      return;
    }

    setRemarkCompleteError("");
    setRemarkToComplete(remark);
  };

  const closeRemarkCompleteConfirm = () => {
    if (completingRemarkId) {
      return;
    }

    setRemarkCompleteError("");
    setRemarkToComplete(null);
  };

  const confirmMarkRemarkComplete = async () => {
    if (!remarkToComplete || completingRemarkId) {
      return;
    }

    const remarkLeadId =
      remarkToComplete.for_lead?.trim() || leadRemarkDetails?.lead_id?.trim() || selectedLeadSummary?.id;
    if (!remarkLeadId) {
      setRemarkCompleteError("Lead id is missing for this remark.");
      return;
    }

    setRemarkCompleteError("");
    setCompletingRemarkId(remarkToComplete.id);

    try {
      await markAssistantLeadRemarkComplete(remarkLeadId, remarkToComplete.id);
      const remarkDetails = await getAssistantLeadRemarkDetails(remarkLeadId);
      setLeadRemarkDetails(remarkDetails);
      setLeadUpdateMessage("Remark marked complete successfully.");
      setRemarkToComplete(null);
    } catch (apiError) {
      setRemarkCompleteError(apiError instanceof Error ? apiError.message : "Unable to mark remark complete.");
    } finally {
      setCompletingRemarkId(null);
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
    <section className="space-y-5 pb-8">

      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-6 py-6 shadow-lg shadow-emerald-500/20">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <svg width="100%" height="100%"><defs><pattern id="al-g" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.8"/></pattern></defs><rect width="100%" height="100%" fill="url(#al-g)"/></svg>
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-100">Lead Operations</p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">Assigned Leads</h1>
            <p className="mt-1 text-sm text-emerald-100/90">All leads currently assigned to you.</p>
          </div>
          <div className="flex shrink-0 gap-3">
            <div className="rounded-xl bg-white/15 px-5 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100">Total</p>
              <p className="mt-0.5 text-2xl font-bold text-white">{totalCount}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-5 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100">This Page</p>
              <p className="mt-0.5 text-2xl font-bold text-white">{assignedCountInPage}</p>
            </div>
          </div>
        </div>
      </div>

      {isError ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error instanceof Error ? error.message : "Unable to load assigned leads."}</p>
        </div>
      ) : null}
      {deleteError ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{deleteError}</p>
        </div>
      ) : null}

      {selectedLeadSummary ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-black">

          {/* Detail Panel Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-slate-800 dark:bg-black sm:px-6">
            <nav className="flex items-center gap-1.5 text-sm">
              <button
                type="button"
                onClick={closeLeadDetails}
                className="flex items-center gap-1.5 font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
                All Leads
              </button>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              {selectedLeadView === "details" ? (
                <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedLeadName}</span>
              ) : (
                <button type="button" onClick={showLeadDetails} className="font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400">
                  {selectedLeadName}
                </button>
              )}
              {selectedLeadView !== "details" ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {selectedLeadView === "history" ? "History" : selectedLeadView === "update" ? "Add Remark & Status" : "Update Remark"}
                  </span>
                </>
              ) : null}
            </nav>
            {selectedLeadView === "details" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openLeadHistory()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
                  History
                </button>
                <button
                  type="button"
                  onClick={openLeadStatusUpdate}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Add Remark &amp; Status
                </button>
              </div>
            ) : null}
          </div>

          <div className="p-5 sm:p-6">
            {selectedLeadView === "details" && isLeadDetailsLoading ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-950" />
                  ))}
                </div>
                <div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-950" />
              </div>
            ) : null}

            {selectedLeadView === "details" && leadDetailsError ? (
              <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{leadDetailsError}</p>
              </div>
            ) : null}

            {selectedLeadView === "details" && leadUpdateMessage ? (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{leadUpdateMessage}</p>
              </div>
            ) : null}

            {selectedLeadView === "details" && !isLeadDetailsLoading && !leadDetailsError ? (
              <div className="space-y-5">
                {/* Lead Identity Cards */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lead ID</p>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></svg>
                      </div>
                    </div>
                    <p className="mt-2.5 break-all font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{selectedLeadDetails?.id ?? selectedLeadSummary.id}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</p>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      </div>
                    </div>
                    <p className="mt-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedLeadName}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</p>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>
                      </div>
                    </div>
                    <p className="mt-2.5 break-all text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedLeadEmail}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</p>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                      </div>
                    </div>
                    <p className="mt-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedLeadPhone}</p>
                  </div>
                </div>

                {/* Status + Timestamps */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
                    <div className="mt-2.5">
                      {(() => {
                        const st = selectedLeadDetails?.status?.trim() || selectedLeadSummary.status;
                        const color = st === "Converted" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : st === "Interested" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                          : st === "Contacted" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{st}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</p>
                    <p className="mt-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">{formatDateTime(selectedLeadDetails?.created_at) || selectedLeadSummary.createdAt}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Last Updated</p>
                    <p className="mt-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">{formatDateTime(selectedLeadDetails?.updated_at)}</p>
                  </div>
                </div>

                {/* Status & Remarks */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-black">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Status &amp; Remarks</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Activity log and follow-up notes</p>
                    </div>
                  </div>

                  {isLeadRemarksLoading ? (
                    <div className="space-y-3 p-5">
                      {Array.from({ length: 2 }, (_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-950" />
                      ))}
                    </div>
                  ) : null}
                  {leadRemarksError ? (
                    <div className="p-5">
                      <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">{leadRemarksError}</p>
                      </div>
                    </div>
                  ) : null}

                  {!isLeadRemarksLoading && !leadRemarksError ? (
                    <div className="grid xl:grid-cols-[1fr_1.4fr]">
                      {/* Status Flow */}
                      <div className="border-b border-slate-100 p-5 xl:border-b-0 xl:border-r dark:border-slate-800">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status Flow</h4>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{visibleStatusHistory.length}</span>
                        </div>
                        {visibleStatusHistory.length ? (
                          <div className="space-y-2">
                            {visibleStatusHistory.map((item, index) => (
                              <div key={item.id}>
                                {index > 0 ? (
                                  <div className="my-2 flex items-center gap-2">
                                    <div className="h-px flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
                                    <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                                    <div className="h-px flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
                                  </div>
                                ) : null}
                                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">{index + 1}</span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.status?.trim() || "-"}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{formatDateTime(item.created_at)}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">by <span className="font-medium text-slate-700 dark:text-slate-300">{item.changed_by?.trim() || "System"}</span></p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
                            <p className="text-sm text-slate-500 dark:text-slate-400">No status changes yet</p>
                          </div>
                        )}
                      </div>

                      {/* Remarks */}
                      <div className="p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Remarks</h4>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">{visibleRemarks.length}</span>
                        </div>
                        {visibleRemarks.length ? (
                          <div className="space-y-3">
                            {visibleRemarks.map((remark, index) => (
                              <div key={remark.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-700">
                                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {index === 0 ? "Latest" : `#${index + 1}`}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${remark.is_completed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                                      {remark.is_completed ? "Completed" : "Open"}
                                    </span>
                                    {!remark.is_completed ? (
                                      <button type="button" onClick={() => openRemarkCompleteConfirm(remark)} disabled={Boolean(completingRemarkId)}
                                        className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/20 dark:text-emerald-300">
                                        {completingRemarkId === remark.id ? "Saving…" : "Complete"}
                                      </button>
                                    ) : null}
                                    <button type="button" onClick={() => openRemarkDeleteConfirm(remark)} disabled={Boolean(deletingRemarkId)}
                                      className="rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400">
                                      {deletingRemarkId === remark.id ? "Deleting…" : "Delete"}
                                    </button>
                                  </div>
                                </div>
                                <div className="px-4 py-3">
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{remark.remarks?.trim() || "-"}</p>
                                  <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Next Follow-up</p>
                                      <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">{formatDateTime(remark.next_follow_up_date)}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Added</p>
                                      <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">{formatDateTime(remark.created_at)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
                            <p className="text-sm text-slate-500 dark:text-slate-400">No remarks found for this lead.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Meetings */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-black">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Meetings</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Zoom meetings for this lead</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => openMeetingModal("schedule")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                      Schedule
                    </button>
                  </div>
                  <div className="p-5">
                    {isMeetingLoading ? (
                      <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-950" />
                    ) : meetingError ? (
                      <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20">
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">{meetingError}</p>
                      </div>
                    ) : activeMeeting ? (
                      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 dark:border-indigo-900/30 dark:from-indigo-950/10 dark:to-slate-900/40">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{activeMeeting.topic}</p>
                              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{formatMeetingTime(activeMeeting.start_time)}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{activeMeeting.duration_minutes ?? activeMeeting.duration} min</p>
                              {activeMeeting.agenda ? <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">{activeMeeting.agenda}</p> : null}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${activeMeeting.status === "cancelled" ? "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/40" : "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${activeMeeting.status === "cancelled" ? "bg-red-500" : "bg-emerald-500"}`} />
                            {activeMeeting.status === "cancelled" ? "Cancelled" : "Upcoming"}
                          </span>
                        </div>
                        <div className="mt-3.5 flex flex-wrap gap-2 border-t border-indigo-100/80 pt-3.5 dark:border-indigo-900/20">
                          {activeMeeting.join_url ? (
                            <a href={activeMeeting.join_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                              Join Meeting
                            </a>
                          ) : null}
                          <button type="button" onClick={() => openMeetingModal("edit")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-900">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
                            Edit
                          </button>
                          <button type="button" onClick={() => openMeetingModal("cancel")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-indigo-200 py-10 text-center dark:border-indigo-900/30">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-300 dark:bg-indigo-950/30 dark:text-indigo-600">
                          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No meeting scheduled yet</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Schedule a Zoom meeting with this lead</p>
                        <button type="button" onClick={() => openMeetingModal("schedule")}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                          Schedule Meeting
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : null}

            {selectedLeadView === "history" && isLeadHistoryLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-950" />
                ))}
              </div>
            ) : null}
            {selectedLeadView === "history" && leadHistoryError ? (
              <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{leadHistoryError}</p>
              </div>
            ) : null}
            {selectedLeadView === "history" && !isLeadHistoryLoading && !leadHistoryError ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      {["History ID", "Status", "Changed By", "Created"].map((col) => (
                        <th key={col} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {leadHistory.map((item) => {
                      const st = item.status?.trim() || "-";
                      const hColor = st === "Converted" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : st === "Interested" ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                        : st === "Contacted" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
                      return (
                        <tr key={item.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">{item.id}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${hColor}`}>{st}</span></td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{item.changed_by?.trim() || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDateTime(item.created_at)}</td>
                        </tr>
                      );
                    })}
                    {!leadHistory.length ? (
                      <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No history found for this lead.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}

            {selectedLeadView === "update" ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Add Remark &amp; Status</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update outcome, add a remark, and schedule the next follow-up.</p>
                  </div>
                  <button type="button" onClick={() => openLeadRemarkUpdate()} disabled={isLeadRemarksLoading || !visibleRemarks.length}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    Update Remark
                  </button>
                </div>

                {leadUpdateError ? (
                  <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">{leadUpdateError}</p>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status <span className="text-red-500">*</span></label>
                    <select value={leadStatusForm.status}
                      onChange={(e) => setLeadStatusForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      {LEAD_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Next Follow-up Date <span className="text-red-500">*</span></label>
                    <input type="datetime-local" value={leadStatusForm.nextFollowUpDate}
                      onChange={(e) => setLeadStatusForm((prev) => ({ ...prev, nextFollowUpDate: e.target.value }))}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Remarks <span className="text-red-500">*</span></label>
                  <textarea value={leadStatusForm.remarks}
                    onChange={(e) => setLeadStatusForm((prev) => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Add the latest conversation note..."
                    className="min-h-[140px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                  <input type="checkbox" checked={leadStatusForm.isCompleted}
                    onChange={(e) => setLeadStatusForm((prev) => ({ ...prev, isCompleted: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mark this follow-up as completed</span>
                </label>

                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button type="button" onClick={showLeadDetails} disabled={isUpdatingLeadStatus}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    Cancel
                  </button>
                  <button type="button" onClick={() => void submitLeadStatusUpdate()} disabled={isUpdatingLeadStatus}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                    {isUpdatingLeadStatus ? (
                      <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Saving…</>
                    ) : "Save Remark & Status"}
                  </button>
                </div>
              </div>
            ) : null}

            {selectedLeadView === "remarkUpdate" ? (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Update Remark</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Edit the remark text and completion status.</p>
                </div>

                {remarkUpdateError ? (
                  <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">{remarkUpdateError}</p>
                  </div>
                ) : null}

                {visibleRemarks.length ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Select Remark</label>
                      <select value={selectedRemarkToUpdate?.id ?? ""} onChange={(e) => selectRemarkForUpdate(e.target.value)} disabled={isUpdatingRemark}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                        {visibleRemarks.map((r, i) => (
                          <option key={r.id} value={r.id}>{i === 0 ? "Latest remark" : `Remark ${i + 1}`} — {formatDateTime(r.created_at)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Remarks</label>
                      <textarea value={remarkUpdateForm.remarks}
                        onChange={(e) => setRemarkUpdateForm((prev) => ({ ...prev, remarks: e.target.value }))}
                        placeholder="Update the assistant remark..." disabled={isUpdatingRemark}
                        className="min-h-[160px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                    </div>

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                      <input type="checkbox" checked={remarkUpdateForm.isCompleted}
                        onChange={(e) => setRemarkUpdateForm((prev) => ({ ...prev, isCompleted: e.target.checked }))}
                        disabled={isUpdatingRemark}
                        className="h-4 w-4 rounded border-slate-300 accent-emerald-500 disabled:cursor-not-allowed" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mark this follow-up as completed</span>
                    </label>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <button type="button" onClick={openLeadStatusUpdate} disabled={isUpdatingRemark}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                        Cancel
                      </button>
                      <button type="button" onClick={() => void submitRemarkUpdate()} disabled={isUpdatingRemark}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                        {isUpdatingRemark ? (
                          <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Saving…</>
                        ) : "Save Remark"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">No remarks available to update.</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* ── Leads Table ── */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-black">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Leads List</h3>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Only your assigned leads are shown here.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{assignedCountInPage} shown</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
              <thead className="bg-slate-50/80 dark:bg-slate-950">
                <tr>
                  {["Lead ID", "Name", "Email", "Phone", "Status", "Created", "Action"].map((col) => (
                    <th key={col} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }, (__, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-950" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : assignedLeads.length ? (
                  assignedLeads.map((lead) => {
                    const sc = lead.status === "Converted" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : lead.status === "Interested" ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                      : lead.status === "Contacted" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
                    return (
                      <tr key={lead.id} onClick={() => void openLeadDetails(lead)} className="cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                        <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">{lead.id}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">{lead.name}</td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{lead.email}</td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{lead.phone}</td>
                        <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sc}`}>{lead.status}</span></td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{lead.createdAt}</td>
                        <td className="px-4 py-3.5">
                          <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteConfirm(lead); }} disabled={Boolean(deletingLeadId)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            {deletingLeadId === lead.id ? "Deleting…" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-950">
                          <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No assigned leads</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No leads are assigned to you on this page.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800 sm:px-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Page <span className="font-semibold text-slate-700 dark:text-slate-200">{currentPage}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage <= 1 || isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                Previous
              </button>
              <button type="button" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages || isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
                Next
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Toast ── */}
      {meetingToast ? (
        <div className={`fixed right-4 top-4 z-[60] flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-xl backdrop-blur-sm ${meetingToast.type === "success" ? "border-emerald-100 bg-white text-emerald-700 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300" : "border-red-100 bg-white text-red-700 dark:border-red-800 dark:bg-slate-900 dark:text-red-300"}`}>
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meetingToast.type === "success" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
            {meetingToast.type === "success"
              ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              : <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>}
          </div>
          <p className="text-sm font-semibold">{meetingToast.message}</p>
        </div>
      ) : null}

      {/* ── Schedule / Edit Meeting Modal ── */}
      {meetingModal === "schedule" || meetingModal === "edit" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">{meetingModal === "schedule" ? "New Meeting" : "Update Meeting"}</p>
                <h4 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">{meetingModal === "schedule" ? "Schedule Meeting" : "Edit Meeting"}</h4>
              </div>
              <button type="button" onClick={closeMeetingModal} disabled={isSubmittingMeeting}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Meeting Topic <span className="text-red-500">*</span></label>
                <input type="text" placeholder="e.g. Product Demo Call" value={meetingForm.topic}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, topic: e.target.value }))} disabled={isSubmittingMeeting}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={meetingForm.date}
                    onChange={(e) => setMeetingForm((prev) => ({ ...prev, date: e.target.value }))} disabled={isSubmittingMeeting}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Time (IST) <span className="text-red-500">*</span></label>
                  <input type="time" value={meetingForm.time}
                    onChange={(e) => setMeetingForm((prev) => ({ ...prev, time: e.target.value }))} disabled={isSubmittingMeeting}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Duration (minutes) <span className="text-red-500">*</span></label>
                <input type="number" min={1} placeholder="60" value={meetingForm.duration_minutes}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))} disabled={isSubmittingMeeting}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agenda <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                <textarea placeholder="Brief agenda for the meeting..." value={meetingForm.agenda}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, agenda: e.target.value }))} disabled={isSubmittingMeeting} rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              {meetingFormError ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 dark:border-red-900/30 dark:bg-red-950/20">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">{meetingFormError}</p>
                </div>
              ) : null}
              <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button type="button" onClick={() => void (meetingModal === "schedule" ? submitScheduleMeeting() : submitEditMeeting())} disabled={isSubmittingMeeting}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                  {isSubmittingMeeting
                    ? <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Saving…</>
                    : meetingModal === "schedule" ? "Schedule Meeting" : "Save Changes"}
                </button>
                <button type="button" onClick={closeMeetingModal} disabled={isSubmittingMeeting}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Cancel Meeting Modal ── */}
      {meetingModal === "cancel" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            </div>
            <h4 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">Cancel this meeting?</h4>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">This action cannot be undone.</p>
            {activeMeeting ? (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">{activeMeeting.topic}</p>
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formatMeetingTime(activeMeeting.start_time)}</p>
              </div>
            ) : null}
            {meetingFormError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">{meetingFormError}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={closeMeetingModal} disabled={isSubmittingMeeting}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                Keep Meeting
              </button>
              <button type="button" onClick={() => void confirmCancelMeeting()} disabled={isSubmittingMeeting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500/40">
                {isSubmittingMeeting
                  ? <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Cancelling…</>
                  : "Cancel Meeting"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Delete Remark Modal ── */}
      {remarkToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Warning</p>
            <h4 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Delete this remark?</h4>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">This remark will be permanently removed from the lead.</p>
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Remark preview</p>
              <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm text-red-700 dark:text-red-300">{remarkToDelete.remarks?.trim() || "-"}</p>
            </div>
            {remarkDeleteError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">{remarkDeleteError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeRemarkDeleteConfirm} disabled={Boolean(deletingRemarkId)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Keep
              </button>
              <button type="button" onClick={() => void confirmDeleteRemark()} disabled={Boolean(deletingRemarkId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
                {deletingRemarkId === remarkToDelete.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Mark Complete Remark Modal ── */}
      {remarkToComplete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Confirm</p>
            <h4 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Mark remark as complete?</h4>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">This will mark the selected follow-up remark as completed.</p>
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Remark preview</p>
              <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm text-emerald-700 dark:text-emerald-300">{remarkToComplete.remarks?.trim() || "-"}</p>
            </div>
            {remarkCompleteError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">{remarkCompleteError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeRemarkCompleteConfirm} disabled={Boolean(completingRemarkId)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Cancel
              </button>
              <button type="button" onClick={() => void confirmMarkRemarkComplete()} disabled={Boolean(completingRemarkId)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                {completingRemarkId === remarkToComplete.id ? "Saving…" : "Mark Complete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Delete Lead Modal ── */}
      {leadToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Confirm Delete</p>
            <h4 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Delete this assigned lead?</h4>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              This will permanently delete lead <span className="font-mono font-semibold">{leadToDelete.id}</span>. This cannot be undone.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="space-y-1.5 text-sm">
                <p className="text-slate-600 dark:text-slate-300">Name: <span className="font-semibold text-slate-900 dark:text-slate-100">{leadToDelete.name}</span></p>
                <p className="text-slate-600 dark:text-slate-300">Email: <span className="font-semibold text-slate-900 dark:text-slate-100">{leadToDelete.email}</span></p>
                <p className="text-slate-600 dark:text-slate-300">Created: <span className="font-semibold text-slate-900 dark:text-slate-100">{leadToDelete.createdAt}</span></p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeDeleteConfirm} disabled={Boolean(deletingLeadId)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Cancel
              </button>
              <button type="button" onClick={() => void confirmDeleteLead()} disabled={Boolean(deletingLeadId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
                {deletingLeadId === leadToDelete.id ? "Deleting…" : "Delete Lead"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
