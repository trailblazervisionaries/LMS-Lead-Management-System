"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";

interface FormTemplateField {
  id: string;
  name?: string;
  type?: string;
  label?: string;
  required?: boolean;
}

interface FormTemplateSchema {
  form_id?: string;
  form_name?: string;
  slug?: string;
  status?: string;
  fields?: FormTemplateField[];
}

interface FormTemplateItem {
  id: string;
  schema_definition?: FormTemplateSchema;
  is_active: boolean;
  created_at?: string;
}

interface AdminTokenPayload {
  sub?: string;
  user_id?: string;
  id?: string;
}

function getAdminToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token="))
    ?.split("=")[1];

  return tokenFromCookie ? decodeURIComponent(tokenFromCookie) : null;
}

function getAdminUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as AdminTokenPayload;
    const userId = payload.user_id?.trim() || payload.id?.trim();
    if (userId) return userId;

    const sub = payload.sub?.trim();
    if (sub && !sub.includes("@")) return sub;
    return null;
  } catch {
    return null;
  }
}

export default function AdminFormSnippetPage() {
  const [templates, setTemplates] = useState<FormTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [snippetCode, setSnippetCode] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingSnippet, setIsLoadingSnippet] = useState(false);
  const [templatesError, setTemplatesError] = useState("");
  const [snippetError, setSnippetError] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const loadTemplates = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setTemplatesError("Admin authentication required. Please log in again.");
      setIsLoadingTemplates(false);
      return;
    }

    const adminUserId = getAdminUserIdFromToken(token);
    if (!adminUserId) {
      setTemplatesError("Unable to identify admin user id. Please log in again.");
      setIsLoadingTemplates(false);
      return;
    }

    setIsLoadingTemplates(true);
    setTemplatesError("");

    try {
      const response = await api.get<FormTemplateItem[]>(`/api/form/templates/${encodeURIComponent(adminUserId)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const items = Array.isArray(response.data) ? response.data : [];
      setTemplates(items);
      setSelectedTemplateId((prev) => prev || items[0]?.id || "");
    } catch (error) {
      setTemplatesError(getApiErrorMessage(error, "Unable to load lead form templates."));
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const loadSnippet = useCallback(async (templateId: string) => {
    const token = getAdminToken();
    if (!token) {
      setSnippetError("Admin authentication required. Please log in again.");
      return;
    }

    setIsLoadingSnippet(true);
    setSnippetError("");
    setSnippetCode("");
    setIsCopied(false);

    try {
      const response = await api.get<string | { snippet?: string; code?: string; html?: string }>(
        `/api/form/template/${encodeURIComponent(templateId)}/snippet`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          responseType: "text"
        }
      );
      const data = response.data;
      const code =
        typeof data === "string"
          ? data
          : data.snippet ?? data.code ?? data.html ?? "";

      setSnippetCode(code);
    } catch (error) {
      setSnippetError(getApiErrorMessage(error, "Unable to load form snippet."));
    } finally {
      setIsLoadingSnippet(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      void loadSnippet(selectedTemplateId);
    }
  }, [loadSnippet, selectedTemplateId]);

  const copySnippetCode = async () => {
    if (!snippetCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(snippetCode);
      setIsCopied(true);
    } catch {
      setSnippetError("Unable to copy snippet. Please select and copy the code manually.");
    }
  };

  const activeTemplates = templates.filter((template) => template.is_active).length;

  return (
    <section className="mx-auto w-full space-y-5 lg:space-y-6">

      {/* ── PAGE HEADER ── */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-indigo-400 to-brand-500 dark:from-brand-800 dark:via-indigo-700 dark:to-brand-800" />
        <div className="px-6 py-6 sm:px-7 sm:py-7">
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-300">
            Website Embed
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Form Snippet
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Copy the generated embed code and paste it on the page where the lead capture form should render.
          </p>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-3">
            <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Templates</p>
              <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{templates.length}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Available</p>
            </div>
            <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Active</p>
              <p className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{activeTemplates}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Live templates</p>
            </div>
            <div className="flex flex-col gap-1 px-6 py-4 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">Fields</p>
              <p className="text-3xl font-semibold tabular-nums text-brand-700 dark:text-brand-300">
                {selectedTemplate?.schema_definition?.fields?.length ?? 0}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">In selected form</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── NOTIFICATIONS ── */}
      {templatesError ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
          <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{templatesError}</p>
        </div>
      ) : null}
      {snippetError ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
          <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{snippetError}</p>
        </div>
      ) : null}

      {/* ── TEMPLATE SELECTOR + INFO ── */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Select Template</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Choose which form template to generate the embed snippet for.</p>
          </div>
        </div>

        {isLoadingTemplates ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 sm:px-6">
            <svg className="h-4 w-4 animate-spin text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading templates…</p>
          </div>
        ) : !templates.length && !templatesError ? (
          <div className="flex flex-col items-center gap-2.5 px-5 py-12 sm:px-6">
            <svg className="h-9 w-9 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No lead form templates found.</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 sm:px-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Form Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900/40"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.schema_definition?.form_name ?? template.id}{template.is_active ? " (Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedTemplate ? (
              <div className="grid grid-cols-1 gap-px border-t border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-3">
                {[
                  { label: "Form Name", value: selectedTemplate.schema_definition?.form_name ?? "-" },
                  { label: "Template ID", value: selectedTemplate.id, mono: true },
                  {
                    label: "Status",
                    value: selectedTemplate.is_active ? "Active" : "Inactive",
                    badge: selectedTemplate.is_active
                  }
                ].map(({ label, value, mono, badge }) => (
                  <div key={label} className="flex flex-col gap-1 bg-white px-5 py-4 dark:bg-slate-950 sm:px-6">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
                    {badge !== undefined ? (
                      <span className={[
                        "mt-0.5 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        badge
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                      ].join(" ")}>
                        {value}
                      </span>
                    ) : (
                      <p className={["mt-0.5 text-sm font-semibold break-all text-slate-900 dark:text-slate-100", mono ? "font-mono text-xs" : ""].join(" ")}>
                        {value}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </Card>

      {/* ── EMBED CODE ── */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Embed Code</h2>
            <p className="mt-0.5 text-xs text-slate-400">Copy and paste into your website HTML where the form should appear.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => selectedTemplateId && void loadSnippet(selectedTemplateId)}
              disabled={!selectedTemplateId || isLoadingSnippet}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className={["h-3.5 w-3.5", isLoadingSnippet ? "animate-spin" : ""].join(" ")} fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {isLoadingSnippet ? "Loading…" : "Reload"}
            </button>
            <button
              type="button"
              onClick={() => void copySnippetCode()}
              disabled={!snippetCode || isLoadingSnippet}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-600 px-3 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCopied ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Copy Code
                </>
              )}
            </button>
          </div>
        </div>
        <div className="bg-slate-950">
          {isLoadingSnippet ? (
            <div className="flex items-center justify-center gap-2 py-12">
              <svg className="h-4 w-4 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-slate-400">Loading snippet…</p>
            </div>
          ) : (
            <pre className="max-h-[440px] overflow-auto p-5 text-xs leading-6 text-slate-100 sm:p-6">
              <code>{snippetCode || "Select a template above to load its embed snippet."}</code>
            </pre>
          )}
        </div>
      </Card>

      {/* ── HOW TO USE + FIELDS ── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">

        {/* How to use */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">How to Use</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Three steps to go live.</p>
          </div>
          <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800">
            {[
              {
                step: "1",
                title: "Copy the code",
                desc: "Click \"Copy Code\" above to copy the full embed snippet to your clipboard.",
                color: "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
              },
              {
                step: "2",
                title: "Paste into your HTML",
                desc: "Open your website editor and paste the snippet where you want the form to appear.",
                color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
              },
              {
                step: "3",
                title: "Publish and test",
                desc: "Publish the page, submit a test lead, and verify it appears in your dashboard.",
                color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              }
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="flex gap-4 px-5 py-4 sm:px-6">
                <span className={["flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold", color].join(" ")}>
                  {step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Form fields table */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Form Fields</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Fields defined in the selected template.</p>
          </div>
          {selectedTemplate?.schema_definition?.fields?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Label</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Name</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Type</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedTemplate.schema_definition.fields.map((field) => (
                    <tr key={field.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60">
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100 sm:px-6">{field.label ?? "-"}</td>
                      <td className="px-5 py-3.5 sm:px-6">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {field.name ?? "-"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 sm:px-6">{field.type ?? "-"}</td>
                      <td className="px-5 py-3.5 sm:px-6">
                        {field.required ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 px-5 py-12 sm:px-6">
              <svg className="h-9 w-9 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No fields available for this template.</p>
            </div>
          )}
        </Card>
      </div>

    </section>
  );
}


