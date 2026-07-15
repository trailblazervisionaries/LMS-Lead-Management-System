"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAssistantLeadTemplates } from "@/hooks/assistant/use-assistant-lead-templates";
import { useAssistantProfile } from "@/hooks/assistant/use-assistant-profile";
import { useAddAssistantLead } from "@/hooks/assistant/use-add-assistant-lead";
import { useUploadAssistantLeads } from "@/hooks/assistant/use-upload-assistant-leads";
import {
  FormTemplateField,
  FormTemplateItem,
  LeadFieldDefinition
} from "@/types/assistant/lead-management";

const LEAD_FIELDS: LeadFieldDefinition[] = [
  { key: "name", label: "Name", placeholder: "Lead Name", aliases: ["name", "full name", "lead name", "customer name"] },
  { key: "email", label: "Email", placeholder: "Email", aliases: ["email", "email address", "mail"] },
  { key: "phone", label: "Phone", placeholder: "Phone", aliases: ["phone", "phone number", "mobile", "contact"] },
  { key: "company", label: "Company", placeholder: "Company", aliases: ["company", "organization", "business"] },
  { key: "source", label: "Source", placeholder: "Source", aliases: ["source", "lead source"] },
  { key: "status", label: "Status", placeholder: "Status", aliases: ["status", "stage", "lead status"] }
];

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getFallbackTemplateFields(): FormTemplateField[] {
  return LEAD_FIELDS.map((field) => ({
    name: field.key,
    label: field.label,
    type: field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text",
    placeholder: field.placeholder,
    required: true
  }));
}

function getManualFieldInitialValue(fieldName: string) {
  const normalized = normalizeKey(fieldName);
  if (normalized === "source") return "Assistant";
  if (normalized === "status") return "New";
  return "";
}

function buildManualValuesFromTemplateFields(fields: FormTemplateField[]) {
  const values: Record<string, string> = {};
  fields.forEach((field) => {
    if (!field.name) return;
    values[field.name] = getManualFieldInitialValue(field.name);
  });
  return values;
}

function buildSubmittedDataFromTemplateFields(fields: FormTemplateField[], values: Record<string, string>) {
  const submittedData: Record<string, string> = {};
  fields.forEach((field) => {
    if (!field.name) return;
    submittedData[field.name] = (values[field.name] ?? "").trim();
  });
  return submittedData;
}

function resolveManualInputType(type?: string) {
  const normalized = (type ?? "text").toLowerCase();
  if (normalized === "phone" || normalized === "telephone") return "tel";
  if (normalized === "email" || normalized === "number" || normalized === "tel") return normalized;
  return "text";
}

function resolveLeadFieldsFromTemplate(template: FormTemplateItem | null): FormTemplateField[] {
  const templateFields = template?.schema_definition?.fields ?? [];
  if (!templateFields.length) {
    return getFallbackTemplateFields();
  }

  return [...templateFields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export default function AssistantTotalLeadsPage() {
  const { data: assistantProfile } = useAssistantProfile();
  const { data: templates, isLoading, isError, error } = useAssistantLeadTemplates(assistantProfile?.admin_id ?? "");
  const addLeadMutation = useAddAssistantLead();
  const uploadLeadMutation = useUploadAssistantLeads();
  const [manualLeadValues, setManualLeadValues] = useState<Record<string, string>>(
    buildManualValuesFromTemplateFields(getFallbackTemplateFields())
  );
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const hasAssistantAdminId = Boolean(assistantProfile?.admin_id);

  const activeTemplate = useMemo(() => {
    if (!hasAssistantAdminId) {
      return null;
    }

    const templateList = Array.isArray(templates) ? templates : [];
    return templateList.find((template) => template.is_active) ?? templateList[0] ?? null;
  }, [templates, hasAssistantAdminId]);

  const templateFields = useMemo(
    () => (hasAssistantAdminId ? resolveLeadFieldsFromTemplate(activeTemplate) : []),
    [activeTemplate, hasAssistantAdminId]
  );
  const activeTemplateId = activeTemplate?.id ?? "";
  const activeTemplateFormId = activeTemplate?.schema_definition?.form_id ?? "";
  const templateFieldCount = templateFields.filter((field) => field.name).length;
  const requiredTemplateFieldCount = templateFields.filter((field) => field.name && field.required).length;

  useEffect(() => {
    setManualLeadValues(buildManualValuesFromTemplateFields(templateFields));
  }, [templateFields]);

  const handleManualInput = (fieldName: string, value: string) => {
    setManualLeadValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleExcelUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setUploadError("");
    setUploadMessage("");

    if (!file) return;

    const adminId = assistantProfile?.admin_id?.trim() ?? "";
    const templateId = activeTemplateId?.trim() ?? "";
    if (!adminId) {
      setUploadError("Waiting for assistant profile to load...");
      return;
    }
    if (!templateId) {
      setUploadError("Lead form template not found or inactive. Please activate a template and try again.");
      return;
    }

    uploadLeadMutation.mutate(
      { templateId, adminId, file },
      {
        onSuccess: (response) => {
          setUploadMessage(response.message ?? `Leads imported successfully from ${file.name}.`);
        },
        onError: (mutationError) => {
          setUploadError(mutationError instanceof Error ? mutationError.message : "Unable to upload this file.");
        }
      }
    );
  };

  const addManualLead = () => {
    setFormError("");
    setMessage("");

    const validTemplateFields = templateFields.filter((field) => field.name);
    if (!validTemplateFields.length) {
      setFormError("No template fields found to add lead manually.");
      return;
    }

    const missingField = validTemplateFields.find(
      (field) => field.required && !manualLeadValues[field.name as string]?.trim()
    );
    if (missingField) {
      setFormError(`${missingField.label || missingField.name || "Field"} is required.`);
      return;
    }

    if (!activeTemplateId) {
      setFormError("Lead form template not found or inactive. Please activate a template and try again.");
      return;
    }

    const submittedData = buildSubmittedDataFromTemplateFields(validTemplateFields, manualLeadValues);

    addLeadMutation.mutate(
      { templateId: activeTemplateId, submittedData },
      {
        onSuccess: (response) => {
          setManualLeadValues(buildManualValuesFromTemplateFields(templateFields));
          setMessage(response.message ?? "Lead added successfully.");
        },
        onError: (mutationError) => {
          setFormError(mutationError instanceof Error ? mutationError.message : "Unable to add lead.");
        }
      }
    );
  };

  return (
    <section className="mx-auto w-full space-y-5 lg:space-y-6">

      {/* ── PAGE HEADER ── */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-indigo-400 to-brand-500 dark:from-brand-800 dark:via-indigo-700 dark:to-brand-800" />
        <div className="px-6 py-6 sm:px-7 sm:py-7">
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-300">
            Lead Operations
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Add Leads
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Add a new lead manually or import in bulk from an Excel / CSV file using the active lead template.
          </p>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Fields</p>
              <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{templateFieldCount}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">In template</p>
            </div>
            <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">Required</p>
              <p className="text-3xl font-semibold tabular-nums text-brand-700 dark:text-brand-300">{requiredTemplateFieldCount}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Must fill</p>
            </div>
            <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Role</p>
              <p className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">Asst.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Collector</p>
            </div>
            <div className="flex flex-col gap-1 px-6 py-4 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Mode</p>
              <p className="text-3xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">Live</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Manual / Import</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── STATUS BANNERS ── */}
      {isLoading ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <svg className="h-4 w-4 animate-spin shrink-0 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading lead templates…</p>
        </div>
      ) : null}

      {isError ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
          <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {error instanceof Error ? error.message : "Unable to load lead templates."}
          </p>
        </div>
      ) : null}

      {!hasAssistantAdminId ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <svg className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Waiting for assistant profile to load…</p>
        </div>
      ) : null}

      {hasAssistantAdminId ? (
        <>
          {/* ── TEMPLATE STRUCTURE ── */}
          <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Active Template</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Fields from the active lead capture form.</p>
              </div>
              {activeTemplateFormId ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400">
                  {activeTemplateFormId}
                </span>
              ) : null}
            </div>
            <div className="px-5 py-4 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {templateFields.filter((field) => field.name).map((field) => (
                  <span
                    key={field.name}
                    className={[
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                      field.required
                        ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/40 dark:text-brand-300"
                        : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                    ].join(" ")}
                  >
                    {field.label || field.name}
                    {field.required ? <span className="ml-1 text-red-400 dark:text-red-500">*</span> : null}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* ── ADD LEAD MANUALLY ── */}
          <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Add Lead Manually</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Dynamically generated from the active template · saved as assistant-collected data.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Collected by: Assistant
              </span>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {templateFields.filter((field) => field.name).map((field) => {
                  const fieldName = field.name as string;
                  const label = field.label || field.name || "Field";
                  const isRequired = Boolean(field.required);
                  const placeholder = field.placeholder || `Enter ${label}`;
                  const value = manualLeadValues[fieldName] ?? "";

                  if (field.type?.toLowerCase() === "textarea") {
                    return (
                      <label key={fieldName} className="space-y-1.5 sm:col-span-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {label}{isRequired ? <span className="ml-0.5 text-red-400">*</span> : null}
                        </span>
                        <textarea
                          placeholder={placeholder}
                          value={value}
                          onChange={(event) => handleManualInput(fieldName, event.target.value)}
                          className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900/40"
                        />
                      </label>
                    );
                  }

                  if (field.type?.toLowerCase() === "select") {
                    const options = Array.isArray(field.options) ? field.options : [];
                    return (
                      <label key={fieldName} className="space-y-1.5">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {label}{isRequired ? <span className="ml-0.5 text-red-400">*</span> : null}
                        </span>
                        <select
                          value={value}
                          onChange={(event) => handleManualInput(fieldName, event.target.value)}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900/40"
                        >
                          <option value="">Select {label}</option>
                          {options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  return (
                    <label key={fieldName} className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {label}{isRequired ? <span className="ml-0.5 text-red-400">*</span> : null}
                      </span>
                      <Input
                        type={resolveManualInputType(field.type)}
                        placeholder={placeholder}
                        value={value}
                        onChange={(event) => handleManualInput(fieldName, event.target.value)}
                      />
                    </label>
                  );
                })}
              </div>

              {formError ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
                  <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">{formError}</p>
                </div>
              ) : null}
              {message ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{message}</p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <Button type="button" onClick={addManualLead} disabled={addLeadMutation.isPending} className="inline-flex items-center gap-2">
                  {addLeadMutation.isPending ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding…
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Add Lead
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setManualLeadValues(buildManualValuesFromTemplateFields(templateFields));
                    setFormError("");
                    setMessage("");
                  }}
                  disabled={addLeadMutation.isPending}
                >
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          {/* ── IMPORT FROM EXCEL ── */}
          <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Import from Excel / CSV</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Upload <code className="rounded bg-slate-100 px-1 font-mono text-[11px] dark:bg-slate-800">.xlsx</code>,{" "}
                <code className="rounded bg-slate-100 px-1 font-mono text-[11px] dark:bg-slate-800">.xls</code> or{" "}
                <code className="rounded bg-slate-100 px-1 font-mono text-[11px] dark:bg-slate-800">.csv</code> — columns like Name, Email, Phone, Company, Source and Status are auto-mapped.
              </p>
            </div>
            <div className="px-5 py-5 sm:px-6">
              <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center transition hover:border-brand-300 hover:bg-brand-50/30 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-brand-700 dark:hover:bg-brand-900/10">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} disabled={uploadLeadMutation.isPending} />
                {uploadLeadMutation.isPending ? (
                  <>
                    <svg className="h-7 w-7 animate-spin text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm font-medium text-brand-700 dark:text-brand-300">Uploading…</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <svg className="h-6 w-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Click to upload file</p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Excel (.xlsx, .xls) or CSV up to 10 MB</p>
                    </div>
                  </>
                )}
              </label>

              {uploadMessage ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{uploadMessage}</p>
                </div>
              ) : null}
              {uploadError ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
                  <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">{uploadError}</p>
                </div>
              ) : null}
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
