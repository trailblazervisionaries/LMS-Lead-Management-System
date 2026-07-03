"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";

type LeadFieldKey = "name" | "email" | "phone" | "company" | "source" | "status";

interface LeadFieldDefinition {
  key: LeadFieldKey;
  label: string;
  placeholder: string;
  aliases: string[];
}

interface LeadRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  createdAt: string;
  assignedAssistantId: string;
  assignedAssistantName: string;
  assignedAssistantEmail: string;
}

interface FormTemplateField {
  name?: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  order?: number;
}

interface FormTemplateItem {
  id: string;
  is_active: boolean;
  schema_definition?: {
    form_id?: string;
    fields?: FormTemplateField[];
  };
}

interface AdminLeadItem {
  id: string;
  template_id?: string;
  admin_id?: string;
  submitted_data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  assigned_assistant?: {
    assignment_id?: string;
    assistant_id?: string;
    name?: string;
    email?: string;
    assigned_at?: string | null;
  } | null;
}

interface AdminLeadsResponse {
  items: AdminLeadItem[];
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

const LEAD_FIELDS: LeadFieldDefinition[] = [
  { key: "name", label: "Name", placeholder: "Lead Name", aliases: ["name", "full name", "lead name", "customer name"] },
  { key: "email", label: "Email", placeholder: "Email", aliases: ["email", "email address", "mail"] },
  { key: "phone", label: "Phone", placeholder: "Phone", aliases: ["phone", "phone number", "mobile", "contact"] },
  { key: "company", label: "Company", placeholder: "Company", aliases: ["company", "organization", "business"] },
  { key: "source", label: "Source", placeholder: "Source", aliases: ["source", "lead source"] },
  { key: "status", label: "Status", placeholder: "Status", aliases: ["status", "stage", "lead status"] }
];

const SEARCHABLE_FIELDS: LeadFieldKey[] = ["name", "email", "phone"];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const PAGE_SIZE = 10;

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractMappedValue(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const key = normalizeKey(alias);
    const resolved = row[key];
    if (resolved) return resolved;
  }
  return "";
}

function getAuthToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token=") || cookie.startsWith("auth="))
    ?.split("=")[1];

  if (!tokenFromCookie) {
    return null;
  }

  return decodeURIComponent(tokenFromCookie);
}

function getAdminUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwtDecode<AuthTokenPayload>(token);
    const userId = decoded.user_id?.trim() || decoded.id?.trim();
    if (userId) return userId;

    const sub = decoded.sub?.trim();
    if (sub && !sub.includes("@")) return sub;
    return null;
  } catch {
    return null;
  }
}

function resolveLeadFieldsFromTemplate(template: FormTemplateItem | null): LeadFieldDefinition[] {
  const templateFields = template?.schema_definition?.fields ?? [];
  if (!templateFields.length) {
    return LEAD_FIELDS;
  }

  const normalizedTemplateTokens = new Set<string>();
  templateFields.forEach((field) => {
    if (field.name) normalizedTemplateTokens.add(normalizeKey(field.name));
    if (field.label) normalizedTemplateTokens.add(normalizeKey(field.label));
    if (field.type) normalizedTemplateTokens.add(normalizeKey(field.type));
  });

  const mappedFields = LEAD_FIELDS.filter((field) => {
    if (normalizedTemplateTokens.has(normalizeKey(field.key))) {
      return true;
    }
    return field.aliases.some((alias) => normalizedTemplateTokens.has(normalizeKey(alias)));
  });

  return mappedFields.length ? mappedFields : LEAD_FIELDS;
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
  if (normalized === "source") return "Manual";
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

function resolveManualInputType(type?: string) {
  const normalized = (type ?? "text").toLowerCase();
  if (normalized === "phone" || normalized === "telephone") return "tel";
  if (normalized === "email" || normalized === "number" || normalized === "tel") return normalized;
  return "text";
}

function buildSubmittedDataFromTemplateFields(
  fields: FormTemplateField[],
  values: Record<string, string>
) {
  const submittedData: Record<string, string> = {};
  fields.forEach((field) => {
    if (!field.name) return;
    submittedData[field.name] = (values[field.name] ?? "").trim();
  });
  return submittedData;
}

function mapAdminLeadToRecord(lead: AdminLeadItem): LeadRecord {
  const submitted = lead.submitted_data && typeof lead.submitted_data === "object" ? lead.submitted_data : {};
  const normalizedRow = Object.fromEntries(
    Object.entries(submitted).map(([key, value]) => [normalizeKey(key), String(value ?? "").trim()])
  ) as Record<string, string>;

  const name = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "name")?.aliases ?? []);
  const email = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "email")?.aliases ?? []);
  const phone = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "phone")?.aliases ?? []);
  const company = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "company")?.aliases ?? []);
  const source = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "source")?.aliases ?? []);
  const status = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "status")?.aliases ?? []);

  return {
    id: lead.id,
    name: name || "-",
    email: email || "-",
    phone: phone || "-",
    company: company || "-",
    source: source || "-",
    status: status || "-",
    createdAt: lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-",
    assignedAssistantId: lead.assigned_assistant?.assistant_id?.trim() || "",
    assignedAssistantName: lead.assigned_assistant?.name?.trim() || "Unassigned",
    assignedAssistantEmail: lead.assigned_assistant?.email?.trim() || "-"
  };
}

export default function AdminTotalLeadsPage() {
  const [templateFields, setTemplateFields] = useState<FormTemplateField[]>(getFallbackTemplateFields());
  const [manualLeadValues, setManualLeadValues] = useState<Record<string, string>>(
    buildManualValuesFromTemplateFields(getFallbackTemplateFields())
  );
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [leadFields, setLeadFields] = useState<LeadFieldDefinition[]>(LEAD_FIELDS);
  const [selectedLeadFields, setSelectedLeadFields] = useState<LeadFieldKey[]>(LEAD_FIELDS.map((field) => field.key));
  const [activeTemplateId, setActiveTemplateId] = useState<string>("");
  const [filterField, setFilterField] = useState<LeadFieldKey>("name");
  const [filterQuery, setFilterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isAssigningLeads, setIsAssigningLeads] = useState(false);

  const totalLeads = totalCount;
  const visibleFieldDefinitions = useMemo(
    () => leadFields.filter((field) => selectedLeadFields.includes(field.key)),
    [leadFields, selectedLeadFields]
  );
  const searchableFieldOptions = useMemo(
    () =>
      SEARCHABLE_FIELDS.filter(
        (field) => selectedLeadFields.includes(field) && leadFields.some((leadField) => leadField.key === field)
      ),
    [leadFields, selectedLeadFields]
  );
  const hasSearchableFields = searchableFieldOptions.length > 0;
  const loadAdminLeads = useCallback(async (page: number) => {
    const token = getAuthToken();
    if (!token) {
      setError("Admin authentication required. Please log in again.");
      return;
    }

    setIsLoadingLeads(true);
    try {
      const response = await api.get<AdminLeadsResponse>("/api/lead/admin/leads", {
        params: { page, size: PAGE_SIZE },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = response.data;
      setLeads(Array.isArray(payload.items) ? payload.items.map(mapAdminLeadToRecord) : []);
      setTotalCount(payload.total_count ?? 0);
      setTotalPages(Math.max(payload.total_pages ?? 1, 1));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Unable to fetch leads."));
    } finally {
      setIsLoadingLeads(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError("Admin authentication required. Please log in again.");
      return;
    }

    const adminUserId = getAdminUserIdFromToken(token);
    if (!adminUserId) {
      setError("Unable to identify admin user id. Please log in again.");
      return;
    }

    const loadLeadStructure = async () => {
      try {
        const response = await api.get<FormTemplateItem[]>(`/api/form/templates/${encodeURIComponent(adminUserId)}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const templates = Array.isArray(response.data) ? response.data : [];
        const activeTemplate = templates.find((template) => template.is_active) ?? templates[0] ?? null;
        const resolvedTemplateFields = [...(activeTemplate?.schema_definition?.fields ?? [])].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        setLeadFields(resolveLeadFieldsFromTemplate(activeTemplate));
        setActiveTemplateId(activeTemplate?.id ?? "");
        if (resolvedTemplateFields.length) {
          setTemplateFields(resolvedTemplateFields);
          setManualLeadValues(buildManualValuesFromTemplateFields(resolvedTemplateFields));
        } else {
          const fallbackFields = getFallbackTemplateFields();
          setTemplateFields(fallbackFields);
          setManualLeadValues(buildManualValuesFromTemplateFields(fallbackFields));
        }
      } catch {
        setLeadFields(LEAD_FIELDS);
        setActiveTemplateId("");
        const fallbackFields = getFallbackTemplateFields();
        setTemplateFields(fallbackFields);
        setManualLeadValues(buildManualValuesFromTemplateFields(fallbackFields));
      }
    };

    void loadLeadStructure();
  }, []);

  useEffect(() => {
    void loadAdminLeads(currentPage);
  }, [currentPage, loadAdminLeads]);

  useEffect(() => {
    const allowedKeys = leadFields.map((field) => field.key);
    setSelectedLeadFields((prev) => {
      const next = prev.filter((key) => allowedKeys.includes(key));
      return next.length ? next : allowedKeys;
    });
  }, [leadFields]);

  useEffect(() => {
    if (!searchableFieldOptions.includes(filterField)) {
      setFilterField(searchableFieldOptions[0] ?? "name");
    }
  }, [filterField, searchableFieldOptions]);

  const statusOptions = useMemo(() => {
    const uniqueStatuses = Array.from(new Set(leads.map((lead) => lead.status).filter(Boolean)));
    return ["all", ...uniqueStatuses];
  }, [leads]);
  const filteredLeads = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();

    return leads.filter((lead) => {
      const fieldValue = String(lead[filterField] ?? "").toLowerCase();
      const matchesQuery = query ? fieldValue.includes(query) : true;
      const matchesStatus = statusFilter === "all" ? true : lead.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [leads, filterField, filterQuery, statusFilter]);
  const filteredLeadCount = filteredLeads.length;
  const templateFieldCount = templateFields.filter((field) => field.name).length;
  const requiredTemplateFieldCount = templateFields.filter((field) => field.name && field.required).length;

  const handleManualInput = (fieldName: string, value: string) => {
    setManualLeadValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const addManualLead = async () => {
    setError("");
    setMessage("");

    const validTemplateFields = templateFields.filter((field) => field.name);
    if (!validTemplateFields.length) {
      setError("No template fields found to add lead manually.");
      return;
    }

    const missingField = validTemplateFields.find(
      (field) => field.required && !manualLeadValues[field.name as string]?.trim()
    );
    if (missingField) {
      setError(`${missingField.label || missingField.name || "Field"} is required.`);
      return;
    }

    const submittedData = buildSubmittedDataFromTemplateFields(validTemplateFields, manualLeadValues);

    const token = getAuthToken();
    if (!token) {
      setError("Admin authentication required. Please log in again.");
      return;
    }

    const requestConfig = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };

    const templateIdCandidates = Array.from(new Set([activeTemplateId].filter(Boolean)));
    if (!templateIdCandidates.length) {
      setError("Lead form template not found or inactive. Please activate a template and try again.");
      return;
    }

    let lastError: unknown = null;
    let submitted = false;
    for (const templateId of templateIdCandidates) {
      const formData = new FormData();
      formData.append("template_id", templateId);
      formData.append("collected_from", "website");
      formData.append("submitted_data", JSON.stringify(submittedData));

      try {
        await axios.post(`${API_BASE_URL}/api/lead/add`, formData, {
          withCredentials: true,
          headers: requestConfig.headers
        });
        submitted = true;
        break;
      } catch (apiError) {
        lastError = apiError;
      }
    }

    if (!submitted) {
      setError(getApiErrorMessage(lastError, "Unable to add lead."));
      return;
    }

    setManualLeadValues(buildManualValuesFromTemplateFields(validTemplateFields));
    setCurrentPage(1);
    await loadAdminLeads(1);
    setMessage("Lead added successfully.");
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
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      await loadAdminLeads(currentPage);
      setMessage("Unassigned leads have been assigned successfully.");
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Unable to assign unassigned leads."));
    } finally {
      setIsAssigningLeads(false);
    }
  };

  const handleExcelUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setMessage("");

    if (!file) return;

    const token = getAuthToken();
    if (!token) {
      setError("Admin authentication required. Please log in again.");
      return;
    }

    const adminUserId = getAdminUserIdFromToken(token);
    if (!adminUserId) {
      setError("Unable to identify admin user id. Please log in again.");
      return;
    }

    const templateId = activeTemplateId?.trim();
    if (!templateId) {
      setError("Lead form template not found or inactive. Please activate a template and try again.");
      return;
    }

    try {
      const endpoint = `${API_BASE_URL}/api/lead/upload/${encodeURIComponent(templateId)}/${encodeURIComponent(adminUserId)}`;
      const formData = new FormData();
      formData.append("file", file, file.name);

      const uploadResponse = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        let detailMessage = `Upload failed with status ${uploadResponse.status}`;
        try {
          const errorPayload = (await uploadResponse.json()) as {
            detail?: unknown;
            message?: unknown;
          };

          if (Array.isArray(errorPayload.detail) && errorPayload.detail.length) {
            const firstError = errorPayload.detail[0] as { msg?: unknown; loc?: unknown };
            const messageText = typeof firstError?.msg === "string" ? firstError.msg : "Validation error";
            const locationText = Array.isArray(firstError?.loc) ? firstError.loc.join(" -> ") : "request";
            detailMessage = `${locationText}: ${messageText}`;
          } else if (typeof errorPayload.detail === "string") {
            detailMessage = errorPayload.detail;
          } else if (typeof errorPayload.message === "string") {
            detailMessage = errorPayload.message;
          }
        } catch {
          // Keep status-based fallback message.
        }

        throw new Error(detailMessage);
      }

      setCurrentPage(1);
      await loadAdminLeads(1);
      setMessage(`Leads imported successfully from ${file.name}.`);
    } catch (apiError) {
      if (apiError instanceof Error && apiError.message) {
        setError(apiError.message);
        return;
      }
      if (axios.isAxiosError(apiError)) {
        const detail = (apiError.response?.data as { detail?: unknown } | undefined)?.detail;
        if (Array.isArray(detail) && detail.length) {
          const firstError = detail[0] as { msg?: unknown; loc?: unknown };
          const messageText = typeof firstError?.msg === "string" ? firstError.msg : "Validation error";
          const locationText = Array.isArray(firstError?.loc) ? firstError.loc.join(" -> ") : "request";
          setError(`${locationText}: ${messageText}`);
          return;
        }
      }
      setError(getApiErrorMessage(apiError, "Unable to upload this file."));
    }
  };

  return (
    <>
      <section className="mx-auto w-full space-y-5 lg:space-y-6">

        {/* ── PAGE HEADER ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {/* Accent bar — vivid in light, muted in dark */}
          <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-brand-400 to-emerald-500 dark:from-brand-800 dark:via-brand-700 dark:to-emerald-800" />

          {/* Title + description */}
          <div className="px-6 py-6 sm:px-7 sm:py-7">
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-300">
              Lead Operations
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Total Leads
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Add leads manually from your active form template, import in bulk from Excel or CSV, and monitor your full pipeline in one place.
            </p>

            {templateFields.filter((f) => f.name).length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Active fields:</span>
                {templateFields
                  .filter((field) => field.name)
                  .map((field) => (
                    <span
                      key={field.name}
                      className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {field.label || field.name}
                      {field.required ? <span className="text-brand-500 dark:text-brand-400">*</span> : null}
                    </span>
                  ))}
              </div>
            ) : null}
          </div>

          {/* Stats strip — 2-col on mobile, 4-col on sm+ */}
          <div className="border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <div className="flex flex-col gap-1 border-b border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:border-b-0 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total</p>
                <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{totalLeads}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">All leads</p>
              </div>
              <div className="flex flex-col gap-1 border-b border-slate-100 px-6 py-4 dark:border-slate-800 sm:border-b-0 sm:border-r sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">Filtered</p>
                <p className="text-3xl font-semibold tabular-nums text-brand-700 dark:text-brand-300">{filteredLeadCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Matching view</p>
              </div>
              <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Fields</p>
                <p className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{templateFieldCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Template fields</p>
              </div>
              <div className="flex flex-col gap-1 px-6 py-4 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Required</p>
                <p className="text-3xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">{requiredTemplateFieldCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Must fill</p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── ADD LEAD + IMPORT ── */}
        <div className="grid gap-5 xl:grid-cols-2">

          {/* Add Lead Manually */}
          <Card className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Add Lead Manually</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Populated from your active template fields
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/40">
                <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
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
                        <label key={fieldName} className="sm:col-span-2">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {label}
                            {isRequired ? <span className="ml-1 text-red-500">*</span> : null}
                          </span>
                          <textarea
                            placeholder={placeholder}
                            value={value}
                            onChange={(event) => handleManualInput(fieldName, event.target.value)}
                            className="min-h-[108px] w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900 dark:focus:ring-brand-900/40"
                          />
                        </label>
                      );
                    }

                    if (field.type?.toLowerCase() === "select") {
                      const options = Array.isArray(field.options) ? field.options : [];
                      return (
                        <label key={fieldName}>
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {label}
                            {isRequired ? <span className="ml-1 text-red-500">*</span> : null}
                          </span>
                          <select
                            value={value}
                            onChange={(event) => handleManualInput(fieldName, event.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:bg-slate-900 dark:focus:ring-brand-900/40"
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
                      <label key={fieldName}>
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {label}
                          {isRequired ? <span className="ml-1 text-red-500">*</span> : null}
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

              <div className="mt-auto pt-1">
                <Button type="button" onClick={addManualLead}>
                  Add Lead
                </Button>
              </div>
            </div>
          </Card>

          {/* Import from Excel */}
          <Card className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Import Leads From Excel</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Bulk import using a spreadsheet file
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We auto-map common columns —{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">Name, Email, Phone, Company, Source</span>{" "}
                and{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">Status</span>{" "}
                — from your spreadsheet rows.
              </p>

              <label className="group flex flex-1 cursor-pointer flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center transition hover:border-brand-300 hover:bg-brand-50/20 dark:border-slate-700/60 dark:bg-slate-900/30 dark:hover:border-brand-700/50 dark:hover:bg-brand-950/10">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition group-hover:border-brand-200 dark:border-slate-700 dark:bg-slate-900">
                  <svg
                    className="h-6 w-6 text-slate-400 transition group-hover:text-brand-600 dark:text-slate-500 dark:group-hover:text-brand-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 transition group-hover:text-brand-700 dark:text-slate-200 dark:group-hover:text-brand-300">
                    Click to upload your file
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">or drag and drop here</p>
                </div>

                <div className="flex items-center gap-2">
                  {[".XLSX", ".XLS", ".CSV"].map((ext) => (
                    <span
                      key={ext}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {ext}
                    </span>
                  ))}
                </div>
              </label>
            </div>
          </Card>
        </div>

        {/* ── NOTIFICATIONS ── */}
        {message ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{message}</p>
          </div>
        ) : null}
        {error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
            <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          </div>
        ) : null}

        {/* ── LEADS LIST ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">

          {/* Table header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Leads List</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Search, filter and monitor incoming leads</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {filteredLeadCount} / {totalLeads} leads
              </span>
              <Button type="button" variant="secondary" onClick={assignUnassignedLeads} disabled={isAssigningLeads}>
                {isAssigningLeads ? "Assigning..." : "Assign Unassigned"}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="grid gap-3.5 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Search By
                </label>
                <select
                  value={filterField}
                  onChange={(event) => setFilterField(event.target.value as LeadFieldKey)}
                  disabled={!hasSearchableFields}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900/40"
                >
                  {hasSearchableFields ? (
                    searchableFieldOptions.map((field) => (
                      <option key={field} value={field}>
                        {field[0].toUpperCase() + field.slice(1)}
                      </option>
                    ))
                  ) : (
                    <option value="name">No searchable field selected</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Search Value
                </label>
                <Input
                  placeholder={`Search ${filterField}...`}
                  value={filterQuery}
                  onChange={(event) => setFilterQuery(event.target.value)}
                  disabled={!hasSearchableFields}
                  className="h-10"
                />
              </div>

              {selectedLeadFields.includes("status") ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Filter by Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900/40"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === "all" ? "All Statuses" : status}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">
                    Lead ID
                  </th>
                  {visibleFieldDefinitions.map((field) => (
                    <th key={field.key} className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingLeads ? (
                  <tr>
                    <td colSpan={visibleFieldDefinitions.length + 2} className="px-5 py-12 text-center sm:px-6">
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

                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60">
                    <td className="px-5 py-3.5 sm:px-6">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {lead.id.slice(0, 8)}…
                      </span>
                    </td>
                    {visibleFieldDefinitions.map((field) => (
                      <td
                        key={`${lead.id}-${field.key}`}
                        className={[
                          "px-5 py-3.5 sm:px-6",
                          field.key === "name"
                            ? "font-semibold text-slate-900 dark:text-slate-100"
                            : "text-slate-600 dark:text-slate-300"
                        ].join(" ")}
                      >
                        {lead[field.key]}
                      </td>
                    ))}
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 sm:px-6">{lead.createdAt}</td>
                  </tr>
                ))}
                  
                {!isLoadingLeads && !filteredLeads.length ? (
                  <tr>
                    <td colSpan={visibleFieldDefinitions.length + 2} className="px-5 py-14 text-center sm:px-6">
                      <div className="flex flex-col items-center gap-2.5">
                        <svg className="h-9 w-9 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {leads.length ? "No leads match the current filters." : "No leads yet."}
                        </p>
                        {!leads.length ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Add manually or import from Excel to get started.
                          </p>
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
                disabled={currentPage <= 1 || isLoadingLeads}
              >
                ← Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.max(totalPages, 1)))}
                disabled={currentPage >= Math.max(totalPages, 1) || isLoadingLeads}
              >
                Next →
              </Button>
            </div>
          </div>
        </Card>

      </section>
    </>
  );
}
