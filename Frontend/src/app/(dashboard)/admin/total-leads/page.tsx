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
      <section className="mx-auto w-full space-y-4 lg:space-y-5">
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-cyan-50 p-0 shadow-sm dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="flex flex-col gap-4 px-4 py-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">Lead Operations</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Total Leads</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Add leads manually from template fields or import sheets to manage your pipeline in one place.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{totalLeads}</p>
              </div>
              <div className="rounded-xl border border-brand-200 bg-brand-50/80 px-3 py-2 text-center shadow-sm dark:border-brand-900/40 dark:bg-brand-950/20">
                <p className="text-[11px] uppercase tracking-wide text-brand-700 dark:text-brand-300">Filtered</p>
                <p className="text-lg font-semibold text-brand-700 dark:text-brand-300">{filteredLeadCount}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-center shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Fields</p>
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{templateFieldCount}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-center shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300">Required</p>
                <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{requiredTemplateFieldCount}</p>
              </div>
            </div>
          </div>
        </Card>

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

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/70 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Lead Manually</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              This form is generated from your active lead template fields.
            </p>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
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
            <div className="mt-4">
              <Button type="button" onClick={addManualLead}>
                Add Lead
              </Button>
            </div>
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
          </Card>
        </div>

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <Card className="rounded-2xl border border-slate-200/80 bg-white/90 p-0 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4 dark:border-slate-700 sm:px-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Leads List</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Search, filter and monitor incoming leads</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Showing {filteredLeadCount} / {totalLeads}
              </span>
              <Button type="button" variant="secondary" onClick={assignUnassignedLeads} disabled={isAssigningLeads}>
                {isAssigningLeads ? "Assigning..." : "Assign Unassigned"}
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Search By
                <select
                  value={filterField}
                  onChange={(event) => setFilterField(event.target.value as LeadFieldKey)}
                  disabled={!hasSearchableFields}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
              </label>

              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Search Value
                <Input
                  placeholder={`Search ${filterField}...`}
                  value={filterQuery}
                  onChange={(event) => setFilterQuery(event.target.value)}
                  disabled={!hasSearchableFields}
                  className="h-10"
                />
              </label>

              {selectedLeadFields.includes("status") ? (
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Status
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === "all" ? "All Statuses" : status}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div />
              )}
            </div>

            <div className="mt-3.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Lead ID</th>
                    {visibleFieldDefinitions.map((field) => (
                      <th key={field.key} className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        {field.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {isLoadingLeads ? (
                    <tr>
                      <td colSpan={visibleFieldDefinitions.length + 2} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Loading leads...
                      </td>
                    </tr>
                  ) : null}
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{lead.id}</td>
                      {visibleFieldDefinitions.map((field) => (
                        <td
                          key={`${lead.id}-${field.key}`}
                          className={field.key === "name" ? "px-4 py-3 text-slate-900 dark:text-slate-100" : "px-4 py-3 text-slate-700 dark:text-slate-200"}
                        >
                          {lead[field.key]}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{lead.createdAt}</td>
                    </tr>
                  ))}
                  {!isLoadingLeads && !filteredLeads.length ? (
                    <tr>
                      <td colSpan={visibleFieldDefinitions.length + 2} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        {leads.length
                          ? "No leads match the current filters."
                          : "No leads yet. Add manually or import from Excel to get started."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {currentPage} of {Math.max(totalPages, 1)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1 || isLoadingLeads}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.max(totalPages, 1)))}
                  disabled={currentPage >= Math.max(totalPages, 1) || isLoadingLeads}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </>
  );
}
