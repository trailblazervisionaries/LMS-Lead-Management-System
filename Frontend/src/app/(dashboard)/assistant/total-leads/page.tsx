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
    <section className="mx-auto w-full space-y-4 lg:space-y-5">
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-cyan-50 p-0 shadow-sm dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">Lead Operations</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Add Leads</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Add a new lead from the assistant dashboard using the active lead template.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Fields</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{templateFieldCount}</p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50/80 px-3 py-2 text-center shadow-sm dark:border-brand-900/40 dark:bg-brand-950/20">
              <p className="text-[11px] uppercase tracking-wide text-brand-700 dark:text-brand-300">Required</p>
              <p className="text-lg font-semibold text-brand-700 dark:text-brand-300">{requiredTemplateFieldCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-center shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Role</p>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">Assistant</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-center shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300">Mode</p>
              <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">Manual</p>
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/70">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading lead templates...</p>
        </Card>
      ) : null}

      {isError ? (
        <Card className="rounded-2xl border border-red-200 bg-red-50/80 p-5 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error instanceof Error ? error.message : "Unable to load lead templates."}</p>
        </Card>
      ) : null}

      {!hasAssistantAdminId ? (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-sm text-amber-700 dark:text-amber-300">Waiting for assistant profile to load...</p>
        </Card>
      ) : null}

      {hasAssistantAdminId ? (
        <>
          <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/70 sm:p-5">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Lead Structure</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {templateFields
                .filter((field) => field.name)
                .map((field) => (
                  <span
                    key={field.name}
                    className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-700"
                  >
                    {field.label || field.name}
                  </span>
                ))}
            </div>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/70 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Lead Manually</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  This form is generated from the active lead template and saves the lead as assistant collected data.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Collected from: Assistant
              </div>
            </div>

            <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
              {templateFields
                .filter((field) => field.name)
                .map((field) => {
                  const fieldName = field.name as string;
                  const label = field.label || field.name || "Field";
                  const isRequired = Boolean(field.required);
                  const placeholder = field.placeholder || `Enter ${label}`;
                  const value = manualLeadValues[fieldName] ?? "";

                  if (field.type?.toLowerCase() === "textarea") {
                    return (
                      <label key={fieldName} className="space-y-1.5 sm:col-span-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {label}
                          {isRequired ? " *" : ""}
                        </span>
                        <textarea
                          placeholder={placeholder}
                          value={value}
                          onChange={(event) => handleManualInput(fieldName, event.target.value)}
                          className="min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900"
                        />
                      </label>
                    );
                  }

                  if (field.type?.toLowerCase() === "select") {
                    const options = Array.isArray(field.options) ? field.options : [];
                    return (
                      <label key={fieldName} className="space-y-1.5">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {label}
                          {isRequired ? " *" : ""}
                        </span>
                        <select
                          value={value}
                          onChange={(event) => handleManualInput(fieldName, event.target.value)}
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900"
                        >
                          <option value="">Select {label}</option>
                          {options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  return (
                    <label key={fieldName} className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {label}
                        {isRequired ? " *" : ""}
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
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {formError}
              </p>
            ) : null}
            {message ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                {message}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={addManualLead} disabled={addLeadMutation.isPending}>
                {addLeadMutation.isPending ? "Adding..." : "Add Lead"}
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

            {activeTemplateFormId ? (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Active form: {activeTemplateFormId}</p>
            ) : null}
          </Card>

          <Card className="h-full rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/70 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Import Leads From Excel</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Upload `.xlsx`, `.xls` or `.csv`. We auto-map common columns like Name, Email, Phone, Company, Source and Status.
            </p>
            <label className="mt-4 flex min-h-[180px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-8 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50">
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
              Click to upload Excel/CSV file
            </label>

            {uploadMessage ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                {uploadMessage}
              </p>
            ) : null}
            {uploadError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {uploadError}
              </p>
            ) : null}
          </Card>
        </>
      ) : null}
    </section>
  );
}
