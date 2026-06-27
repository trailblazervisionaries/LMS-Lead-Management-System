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
    <section className="space-y-6 lg:space-y-8">
      <Card className="overflow-hidden rounded-3xl border-slate-200/80 p-0 shadow-sm dark:border-slate-700">
        <div className="flex flex-col gap-5 border-b border-slate-200/80 px-5 py-6 dark:border-slate-700 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">
              Website Embed
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Form Snippet
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Copy the generated embed code and place it on the page where the form should render.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-950/60">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Templates</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{templates.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Active</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-300">{activeTemplates}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
            {templatesError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {templatesError}
              </p>
            ) : null}

            {isLoadingTemplates ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">
                Loading template information...
              </p>
            ) : null}

            {!isLoadingTemplates && !templates.length && !templatesError ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">
                No lead form templates found.
              </p>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected Form</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTemplate?.schema_definition?.form_name ?? "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Template ID</p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTemplate?.id ?? "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTemplate?.schema_definition?.status ?? "-"}
                </p>
              </div>
            </div>

            {snippetError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {snippetError}
              </p>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Embed Code</p>
                  <p className="text-xs text-slate-400">Copy and paste into the target website HTML.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectedTemplateId && void loadSnippet(selectedTemplateId)}
                    disabled={!selectedTemplateId || isLoadingSnippet}
                    className="inline-flex h-9 items-center rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reload
                  </button>
                  <button
                    type="button"
                    onClick={() => void copySnippetCode()}
                    disabled={!snippetCode || isLoadingSnippet}
                    className="inline-flex h-9 items-center rounded-lg border border-indigo-400/40 bg-indigo-500 px-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCopied ? "Copied" : "Copy Code"}
                  </button>
                </div>
              </div>
              {isLoadingSnippet ? (
                <p className="px-4 py-10 text-center text-sm text-slate-400">Loading form snippet...</p>
              ) : (
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap p-4 text-xs leading-5 text-slate-100">
                  {snippetCode || "Select a form to load its snippet."}
                </pre>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="rounded-2xl border border-slate-200 p-5 shadow-sm dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">How to use</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <p>1. Copy the generated embed code.</p>
                  <p>2. Paste it in your website HTML where the form should appear.</p>
                  <p>3. Publish the website page and submit a test lead.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 shadow-sm dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Selected form fields</h3>
                {selectedTemplate?.schema_definition?.fields?.length ? (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-3 font-semibold">Label</th>
                          <th className="px-3 py-3 font-semibold">Name</th>
                          <th className="px-3 py-3 font-semibold">Type</th>
                          <th className="px-3 py-3 font-semibold">Required</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {selectedTemplate.schema_definition.fields.map((field) => (
                          <tr key={field.id}>
                            <td className="px-3 py-3 text-slate-900 dark:text-slate-100">{field.label ?? "-"}</td>
                            <td className="px-3 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{field.name ?? "-"}</td>
                            <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{field.type ?? "-"}</td>
                            <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{field.required ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No fields available for the selected template.</p>
                )}
              </div>
            </div>
        </div>
      </Card>
    </section>
  );
}


