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
    <section className="relative space-y-6 overflow-hidden lg:space-y-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.18),_transparent_55%),radial-gradient(circle_at_right,_rgba(16,185,129,0.12),_transparent_40%)]" />
      <div className="pointer-events-none absolute -right-24 top-28 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-64 -z-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90 p-0 shadow-[0_24px_80px_rgba(2,6,23,0.38)] backdrop-blur">
        <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
              Email Campaigns
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">Email Sending</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
              Select leads, compose your campaign, and prepare a targeted email blast in one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:min-w-[360px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 px-4 py-3 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Total Leads</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">{totalCount}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10 px-4 py-3 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-200">With Email</p>
              <p className="mt-1 text-xl font-semibold text-indigo-200">{emailableLeadsCount}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 px-4 py-3 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Selected</p>
              <p className="mt-1 text-xl font-semibold text-emerald-200">{selectedCount}</p>
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
          {successMessage}
        </p>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
        <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/80 p-0 shadow-[0_18px_70px_rgba(2,6,23,0.32)] backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Lead Directory</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Choose recipients for this campaign</p>
            </div>
            <Button type="button" variant="secondary" onClick={toggleSelectVisible} disabled={!filteredLeads.length}>
              {isAllVisibleSelected ? "Clear Visible Selection" : "Select Visible"}
            </Button>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Search Leads
                <Input
                  value={searchQuery}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setSearchQuery(event.target.value);
                  }}
                  placeholder="Search by name, email, phone number..."
                  className="h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Email Availability
                <select
                  value={emailFilter}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setEmailFilter(event.target.value as "all" | "withEmail" | "missingEmail");
                  }}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="withEmail">With Email</option>
                  <option value="all">All Leads</option>
                  <option value="missingEmail">Missing Email</option>
                </select>
              </label>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/40">
              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full divide-y divide-slate-200 text-left text-xs sm:text-sm dark:divide-slate-700/70">
                  <thead className="bg-slate-100 dark:bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Select</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Lead</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Submitted Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/70">
                    {isLoading ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          Loading leads...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && pageLeads.map((lead) => {
                      const hasValidEmail = lead.email.includes("@");
                      return (
                        <tr key={lead.id} className="transition hover:bg-slate-100/80 dark:hover:bg-slate-800/60">
                          <td className="px-4 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)}
                              className="h-4 w-4 rounded border-slate-300 text-brand-600 dark:border-slate-500 focus:ring-brand-500"
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="font-semibold text-slate-900 dark:text-slate-50">{lead.displayName || "-"}</p>
                            <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-300">{lead.email}</p>
                            {!hasValidEmail ? (
                              <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
                                Missing valid email
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {Object.entries(lead.submittedData).length ? (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                                {Object.entries(lead.submittedData)
                                  .filter(([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, "") !== "email")
                                  .map(([key, value]) => (
                                    <p key={key} className="break-all">
                                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                                        {key.replace(/[_-]+/g, " ")}:
                                      </span>{" "}
                                      {value || "-"}
                                    </p>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 dark:text-slate-400">No submitted data available.</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!isLoading && !pageLeads.length ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                          No leads match your current filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-700/70 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex flex-wrap gap-2">
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

        <Card className="rounded-[28px] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/80 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.32)] backdrop-blur sm:p-6 xl:sticky xl:top-6">
          <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Compose Email</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Build your message and send to selected recipients.</p>

          <div className="mt-5 space-y-4">
            <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Subject
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Example: Product Update for This Week"
                className="h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your email content..."
                className="min-h-[230px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Campaign Summary</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <p>Selected leads: {selectedLeadIds.length}</p>
              <p>Valid recipient emails: {selectedWithEmail.length}</p>
              <p>Subject length: {subject.trim().length} characters</p>
              <p>Message length: {message.trim().length} characters</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Recipients</p>
            {selectedWithEmail.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {visibleRecipients.map((lead) => (
                  <span
                    key={lead.id}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200"
                  >
                    {lead.displayName || lead.email} ({lead.email})
                  </span>
                ))}
                {hiddenRecipients.length > 0 ? (
                  showAllRecipients ? (
                    hiddenRecipients.map((lead) => (
                      <span
                        key={lead.id}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200"
                      >
                        {lead.displayName || lead.email} ({lead.email})
                      </span>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAllRecipients(true)}
                      className="inline-flex h-7 items-center rounded-full border border-dashed border-slate-300 bg-transparent px-3 text-xs font-semibold text-slate-500 transition hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
                      aria-label="Show more recipients"
                    >
                      More..
                    </button>
                  )
                ) : null}
                {hiddenRecipients.length > 0 && showAllRecipients ? (
                  <button
                    type="button"
                    onClick={() => setShowAllRecipients(false)}
                    className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
                  >
                    Show less
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">No valid recipients selected yet.</p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" onClick={() => openSendConfirm("selected")} disabled={isSending}>
              Send Campaign
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => openSendConfirm("bulk")}
              disabled={isSending}
            >
              Send Bulk Email
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setSubject("");
                setMessage("");
                setSuccessMessage("");
              }}
            >
              Clear Draft
            </Button>
          </div>
        </Card>
      </div>

      {confirmModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">
              Confirm Send
            </p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {pendingSendType === "bulk" ? "Send bulk email to every lead?" : "Send email to selected leads?"}
            </h4>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {pendingSendType === "bulk"
                ? "This will send one email to every lead under this admin using the bulk route."
                : "This will send the email only to the selected recipients with valid email addresses."}
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                <p>Subject: {subject.trim() || "No subject yet"}</p>
                <p>Message: {message.trim() ? `${message.trim().slice(0, 110)}${message.trim().length > 110 ? "..." : ""}` : "No message yet"}</p>
                <p>
                  Target:{" "}
                  {pendingSendType === "bulk"
                    ? "All admin leads"
                    : `${selectedWithEmail.length} selected recipient${selectedWithEmail.length > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeSendConfirm} disabled={isSending}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void confirmSend()} disabled={isSending}>
                {isSending ? "Sending..." : "Confirm & Send"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

