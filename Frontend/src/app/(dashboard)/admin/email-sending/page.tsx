"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  EmailLeadRecord,
  getAllAdminLeads,
  sendBulkEmailToAllLeads,
  sendCustomEmail
} from "@/services/admin/email-sending-service";

const PAGE_SIZE = 15;

export default function AdminEmailSendingPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [emailFilter, setEmailFilter] = useState<"all" | "withEmail" | "missingEmail">("withEmail");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingSendType, setPendingSendType] = useState<"selected" | "bulk" | null>(null);
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [leads, setLeads] = useState<EmailLeadRecord[]>([]);

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const allLeads = await getAllAdminLeads();
      setLeads(allLeads);
      setCurrentPage(1);
      setSelectedLeadIds((prev) => prev.filter((id) => allLeads.some((lead) => lead.id === id)));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to load leads for email sending.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return leads.filter((lead) => {
      const hasEmail = lead.email.includes("@");
      const emailMatch = emailFilter === "all" || (emailFilter === "withEmail" ? hasEmail : !hasEmail);
      const searchableValues = [lead.displayName, lead.email, ...Object.values(lead.submittedData)];
      const queryMatch = query ? searchableValues.some((value) => value.toLowerCase().includes(query)) : true;
      return emailMatch && queryMatch;
    });
  }, [leads, searchQuery, emailFilter]);

  const totalPages = Math.max(Math.ceil(filteredLeads.length / PAGE_SIZE), 1);
  const pageLeads = useMemo(
    () => filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredLeads, currentPage]
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const totalCount = leads.length;
  const emailableLeadsCount = useMemo(
    () => leads.filter((lead) => lead.email.includes("@")).length,
    [leads]
  );

  const selectedLeads = useMemo(
    () => leads.filter((lead) => selectedLeadIds.includes(lead.id)),
    [leads, selectedLeadIds]
  );

  const selectedWithEmail = useMemo(
    () => selectedLeads.filter((lead) => lead.email.includes("@")),
    [selectedLeads]
  );
  const visibleRecipients = useMemo(() => selectedWithEmail.slice(0, 3), [selectedWithEmail]);
  const hiddenRecipients = useMemo(() => selectedWithEmail.slice(3), [selectedWithEmail]);

  const selectedCount = selectedLeadIds.length;
  const isAllVisibleSelected =
    pageLeads.length > 0 && pageLeads.every((lead) => selectedLeadIds.includes(lead.id));

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const toggleSelectVisible = () => {
    if (isAllVisibleSelected) {
      setSelectedLeadIds((prev) => prev.filter((id) => !pageLeads.some((lead) => lead.id === id)));
      return;
    }

    setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...pageLeads.map((lead) => lead.id)])));
  };

  const openSendConfirm = (sendType: "selected" | "bulk") => {
    setError("");
    setSuccessMessage("");
    setPendingSendType(sendType);
    setConfirmModalOpen(true);
  };

  const closeSendConfirm = () => {
    if (isSending) {
      return;
    }

    setConfirmModalOpen(false);
    setPendingSendType(null);
  };

  const onSendCampaign = async () => {
    setError("");
    setSuccessMessage("");

    if (!subject.trim()) {
      setError("Email subject is required.");
      return;
    }

    if (!message.trim()) {
      setError("Email message is required.");
      return;
    }

    if (!selectedWithEmail.length) {
      setError("Select at least one lead with a valid email.");
      return;
    }

    setIsSending(true);
    try {
      const results = await Promise.allSettled(
        selectedWithEmail.map((lead) =>
          sendCustomEmail({
            email_to: lead.email,
            subject: subject.trim(),
            body: message.trim()
          })
        )
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;
      const successCount = results.length - failedCount;

      if (successCount > 0) {
        setSuccessMessage(
          `Email sent to ${successCount} recipient${successCount > 1 ? "s" : ""}.`
        );
      }

      if (failedCount > 0) {
        setError(
          failedCount === results.length
            ? "Unable to send the email."
            : `${failedCount} recipient${failedCount > 1 ? "s" : ""} could not be sent.`
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  const onSendBulkCampaign = async () => {
    setError("");
    setSuccessMessage("");

    if (!subject.trim()) {
      setError("Email subject is required.");
      return;
    }

    if (!message.trim()) {
      setError("Email message is required.");
      return;
    }

    setIsSending(true);
    try {
      await sendBulkEmailToAllLeads({
        subject: subject.trim(),
        body: message.trim()
      });

      setSuccessMessage("Bulk email sent to all leads in this admin.");
    } finally {
      setIsSending(false);
    }
  };

  const confirmSend = async () => {
    if (pendingSendType === "selected") {
      await onSendCampaign();
    }

    if (pendingSendType === "bulk") {
      await onSendBulkCampaign();
    }

    setConfirmModalOpen(false);
    setPendingSendType(null);
  };

  return (
    <section className="mx-auto w-full space-y-5 lg:space-y-6">

      {/* ── PAGE HEADER ── */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-indigo-400 to-emerald-500 dark:from-brand-800 dark:via-indigo-700 dark:to-emerald-800" />
        <div className="px-6 py-6 sm:px-7 sm:py-7">
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-300">
            Email Campaigns
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Email Sending
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Select leads, compose your campaign, and send a targeted email blast — all in one place.
          </p>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-3">
            <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Leads</p>
              <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{totalCount}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">In pipeline</p>
            </div>
            <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">With Email</p>
              <p className="text-3xl font-semibold tabular-nums text-brand-700 dark:text-brand-300">{emailableLeadsCount}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Valid addresses</p>
            </div>
            <div className="flex flex-col gap-1 px-6 py-4 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Selected</p>
              <p className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{selectedCount}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">For campaign</p>
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
      {successMessage ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{successMessage}</p>
        </div>
      ) : null}

      {/* ── MAIN GRID ── */}
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">

        {/* Lead Directory */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Lead Directory</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Choose recipients for this campaign</p>
            </div>
            <Button type="button" variant="secondary" onClick={toggleSelectVisible} disabled={!filteredLeads.length} className="gap-1.5">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                {isAllVisibleSelected
                  ? <><path d="M18 6L6 18M6 6l12 12" /></>
                  : <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>}
              </svg>
              {isAllVisibleSelected ? "Clear Visible" : "Select Visible"}
            </Button>
          </div>

          {/* Filters */}
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search Leads</label>
                <Input
                  value={searchQuery}
                  onChange={(event) => { setCurrentPage(1); setSearchQuery(event.target.value); }}
                  placeholder="Search by name, email, phone..."
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email Filter</label>
                <select
                  value={emailFilter}
                  onChange={(event) => { setCurrentPage(1); setEmailFilter(event.target.value as "all" | "withEmail" | "missingEmail"); }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900/40"
                >
                  <option value="withEmail">With Email</option>
                  <option value="all">All Leads</option>
                  <option value="missingEmail">Missing Email</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                  <th className="w-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Lead</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center sm:px-6">
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <svg className="h-4 w-4 animate-spin text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading leads…
                      </div>
                    </td>
                  </tr>
                ) : null}

                {!isLoading && pageLeads.map((lead) => {
                  const hasValidEmail = lead.email.includes("@");
                  const isSelected = selectedLeadIds.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => toggleLeadSelection(lead.id)}
                      className={[
                        "cursor-pointer transition",
                        isSelected
                          ? "bg-brand-50/60 dark:bg-brand-950/20"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-900/60"
                      ].join(" ")}
                    >
                      <td className="px-5 py-4 align-top sm:px-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleLeadSelection(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
                        />
                      </td>
                      <td className="px-5 py-4 align-top sm:px-6">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{lead.displayName || "-"}</p>
                        <p className="mt-0.5 break-all text-xs text-slate-500 dark:text-slate-400">{lead.email}</p>
                        {!hasValidEmail ? (
                          <span className="mt-1.5 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400">
                            No valid email
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 align-top sm:px-6">
                        {Object.entries(lead.submittedData).length ? (
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                            {Object.entries(lead.submittedData)
                              .filter(([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, "") !== "email")
                              .map(([key, value]) => (
                                <p key={key} className="break-all">
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">{key.replace(/[_-]+/g, " ")}:</span>{" "}{value || "-"}
                                </p>
                              ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500">No additional data.</p>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!isLoading && !pageLeads.length ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-14 text-center sm:px-6">
                      <div className="flex flex-col items-center gap-2.5">
                        <svg className="h-9 w-9 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No leads match your current filters.</p>
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
              Page <span className="font-semibold text-slate-700 dark:text-slate-300">{currentPage}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{totalPages}</span>
              <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">({filteredLeads.length} leads)</span>
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage <= 1 || isLoading}>
                ← Previous
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages || isLoading}>
                Next →
              </Button>
            </div>
          </div>
        </Card>

        {/* Compose Email */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Compose Email</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Build your message and send to selected recipients.</p>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Subject</label>
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="e.g. Product Update for This Week"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Message</label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write your email content here..."
                  className="min-h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-900/40"
                />
              </div>
            </div>

            {/* Campaign Summary */}
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Campaign Summary</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: "Selected", value: selectedLeadIds.length },
                  { label: "Valid Recipients", value: selectedWithEmail.length },
                  { label: "Subject Length", value: `${subject.trim().length} chars` },
                  { label: "Message Length", value: `${message.trim().length} chars` }
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recipients</p>
              {selectedWithEmail.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {visibleRecipients.map((lead) => (
                    <span key={lead.id} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {lead.displayName || lead.email}
                    </span>
                  ))}
                  {hiddenRecipients.length > 0 && !showAllRecipients
                    ? hiddenRecipients.map((lead) => null) && (
                        <button
                          type="button"
                          onClick={() => setShowAllRecipients(true)}
                          className="inline-flex h-7 items-center rounded-full border border-dashed border-slate-300 px-3 text-xs font-semibold text-slate-500 transition hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400"
                        >
                          +{hiddenRecipients.length} more
                        </button>
                      )
                    : null}
                  {showAllRecipients
                    ? hiddenRecipients.map((lead) => (
                        <span key={lead.id} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {lead.displayName || lead.email}
                        </span>
                      ))
                    : null}
                  {showAllRecipients && hiddenRecipients.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllRecipients(false)}
                      className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                    >
                      Show less
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">No valid recipients selected yet.</p>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="flex-1 gap-1.5" onClick={() => openSendConfirm("selected")} disabled={isSending}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Send Campaign
                </Button>
                <Button type="button" variant="secondary" className="flex-1 gap-1.5" onClick={() => openSendConfirm("bulk")} disabled={isSending}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  </svg>
                  Bulk Email
                </Button>
                <button
                  type="button"
                  onClick={() => { setSubject(""); setMessage(""); setSuccessMessage(""); }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Clear
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── CONFIRM MODAL ── */}
      {confirmModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-indigo-400 to-emerald-500" />
            <div className="px-6 py-5">
              <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-300">
                Confirm Send
              </span>
              <h4 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {pendingSendType === "bulk" ? "Send bulk email to every lead?" : "Send email to selected leads?"}
              </h4>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {pendingSendType === "bulk"
                  ? "This will send one email to every lead under this admin using the bulk route."
                  : "This will send the email only to selected recipients with valid email addresses."}
              </p>
            </div>

            <div className="mx-6 mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="w-20 shrink-0 font-semibold text-slate-500 dark:text-slate-400">Subject</span>
                  <span className="text-slate-800 dark:text-slate-100">{subject.trim() || <em className="text-slate-400">None</em>}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 shrink-0 font-semibold text-slate-500 dark:text-slate-400">Message</span>
                  <span className="text-slate-800 dark:text-slate-100">
                    {message.trim() ? `${message.trim().slice(0, 100)}${message.trim().length > 100 ? "…" : ""}` : <em className="text-slate-400">None</em>}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 shrink-0 font-semibold text-slate-500 dark:text-slate-400">Target</span>
                  <span className="text-slate-800 dark:text-slate-100">
                    {pendingSendType === "bulk"
                      ? "All admin leads"
                      : `${selectedWithEmail.length} recipient${selectedWithEmail.length !== 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={closeSendConfirm} disabled={isSending}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void confirmSend()} disabled={isSending} className="gap-1.5">
                {isSending ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Confirm & Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}


