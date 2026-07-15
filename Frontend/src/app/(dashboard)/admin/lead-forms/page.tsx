"use client";

import { type DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";

type BuilderFieldType = "text" | "email" | "number" | "tel" | "textarea" | "select" | "file";
type FieldLayout = "half" | "full";

interface FieldTemplate {
  type: BuilderFieldType;
  title: string;
  description: string;
}

interface FormBuilderField {
  id: string;
  type: BuilderFieldType;
  label: string;
  name: string;
  placeholder: string;
  required: boolean;
  options: string[];
  accept: string;
  layout: FieldLayout;
}

interface SubmitButtonSettings {
  label: string;
  bgColor: string;
  hoverColor: string;
  textColor: string;
}

interface ContactPageStyleSettings {
  pageTitle: string;
  bannerImageUrl: string;
  gradientFrom: string;
  gradientTo: string;
}

interface FormTemplateField {
  id: string;
  name?: string;
  type?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  order?: number;
  width?: string;
  options?: string[];
  default_value?: string;
  help_text?: string;
  validation?: Record<string, unknown>;
}

interface FormTemplateSchema {
  form_id?: string;
  form_name?: string;
  slug?: string;
  status?: string;
  version?: number;
  layout?: {
    columns?: number;
    field_spacing?: number;
  };
  page_style?: {
    background_color?: string;
    background_image_url?: string;
  };
  submit_button?: {
    text?: string;
    color?: string;
    text_color?: string;
    hover_color?: string;
    hover_text_color?: string;
    full_width?: boolean;
  };
  fields?: FormTemplateField[];
  meta?: {
    created_by?: string;
    updated_by?: string;
  };
}

interface FormTemplateItem {
  id: string;
  schema_definition?: FormTemplateSchema;
  is_active: boolean;
  created_at?: string;
}

interface FormTemplateDetails extends FormTemplateItem {
  admin_id?: string;
  updated_at?: string | null;
}

interface FormSetupDetails {
  formId: string;
  formName: string;
  slug: string;
  status: string;
  version: string;
}

type DragPayload =
  | { source: "library"; fieldType: BuilderFieldType }
  | { source: "canvas"; fieldId: string };

const DND_KEY = "application/lead-form-builder";
const DEFAULT_BANNER_IMAGE =
  "";
const FIELD_LIBRARY: FieldTemplate[] = [
  { type: "text", title: "Text", description: "Example: Name" },
  { type: "email", title: "Email", description: "Email address field" },
  { type: "number", title: "Number", description: "Example: Age" },
  { type: "tel", title: "Phone", description: "Phone number field" },
  { type: "textarea", title: "Textarea", description: "Message box" },
  { type: "select", title: "Select", description: "Dropdown options" },
  { type: "file", title: "Document Upload", description: "Images, PDF, DOC, DOCX, etc." }
];

const FIELD_DEFAULTS: Record<BuilderFieldType, Omit<FormBuilderField, "id">> = {
  text: {
    type: "text",
    label: "Name",
    name: "name",
    placeholder: "Enter full name",
    required: true,
    options: [],
    accept: "",
    layout: "half"
  },
  email: {
    type: "email",
    label: "Email",
    name: "email",
    placeholder: "Enter email address",
    required: true,
    options: [],
    accept: "",
    layout: "half"
  },
  number: {
    type: "number",
    label: "Age",
    name: "age",
    placeholder: "Enter age",
    required: false,
    options: [],
    accept: "",
    layout: "half"
  },
  tel: {
    type: "tel",
    label: "Phone Number",
    name: "phone_number",
    placeholder: "Enter phone number",
    required: true,
    options: [],
    accept: "",
    layout: "half"
  },
  textarea: {
    type: "textarea",
    label: "Message",
    name: "message",
    placeholder: "Enter your message",
    required: false,
    options: [],
    accept: "",
    layout: "full"
  },
  select: {
    type: "select",
    label: "Source",
    name: "source",
    placeholder: "",
    required: false,
    options: ["Website", "Instagram", "Referral"],
    accept: "",
    layout: "half"
  },
  file: {
    type: "file",
    label: "Upload Documents",
    name: "upload_documents",
    placeholder: "",
    required: false,
    options: [],
    accept: ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp",
    layout: "full"
  }
};

// function formatNumber(value: number) {
//   return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
// }

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("en-US") : "-";
}

function createFieldId() {
  return `field_${Math.random().toString(36).slice(2, 10)}`;
}

function parseDragPayload(value: string): DragPayload | null {
  if (!value) return null;

  try {
    const payload = JSON.parse(value) as DragPayload;
    if (payload.source === "library" || payload.source === "canvas") {
      return payload;
    }
  } catch {
    return null;
  }

  return null;
}

function insertAtIndex(fields: FormBuilderField[], field: FormBuilderField, index: number) {
  const next = [...fields];
  next.splice(index, 0, field);
  return next;
}

function buildRows(fields: FormBuilderField[]) {
  const rows: { items: Array<{ field: FormBuilderField; index: number }> }[] = [];
  let currentRow: Array<{ field: FormBuilderField; index: number }> = [];

  fields.forEach((field, index) => {
    if (field.layout === "full") {
      if (currentRow.length) {
        rows.push({ items: currentRow });
        currentRow = [];
      }
      rows.push({ items: [{ field, index }] });
      return;
    }

    currentRow.push({ field, index });
    if (currentRow.length === 2) {
      rows.push({ items: currentRow });
      currentRow = [];
    }
  });

  if (currentRow.length) {
    rows.push({ items: currentRow });
  }

  return rows;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveBuilderFieldType(type?: string): BuilderFieldType {
  const normalized = (type ?? "text").toLowerCase();
  if (normalized === "phone" || normalized === "telephone") {
    return "tel";
  }
  if (normalized === "text" || normalized === "email" || normalized === "number" || normalized === "tel" || normalized === "textarea" || normalized === "select" || normalized === "file") {
    return normalized;
  }
  return "text";
}

function getStatusBadgeClasses(status?: string) {
  const value = (status ?? "").toLowerCase().trim();
  if (value === "published" || value === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  if (value === "draft") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300";
  }
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";
}

function getAdminToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token="))
    ?.split("=")[1];

  if (!tokenFromCookie) {
    return null;
  }

  return decodeURIComponent(tokenFromCookie);
}

interface AdminTokenPayload {
  sub?: string;
  user_id?: string;
  id?: string;
  email?: string;
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

function resolveAllowedMimeTypes(accept: string) {
  const EXTENSION_MIME: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  };

  return accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith(".")) {
        return EXTENSION_MIME[part] ?? "";
      }
      return part.includes("/") ? part : "";
    })
    .filter(Boolean);
}

export default function AdminLeadFormsPage() {
  const [formFields, setFormFields] = useState<FormBuilderField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isSendSettingsOpen, setIsSendSettingsOpen] = useState(false);
  const [submitButtonSettings, setSubmitButtonSettings] = useState<SubmitButtonSettings>({
    label: "Send",
    bgColor: "#2563EB",
    hoverColor: "#1D4ED8",
    textColor: "#FFFFFF"
  });
  const [contactPageStyle, setContactPageStyle] = useState<ContactPageStyleSettings>({
    pageTitle: "CONTACT",
    bannerImageUrl: DEFAULT_BANNER_IMAGE,
    gradientFrom: "#EEF3EA",
    gradientTo: "#F9F6EF"
  });
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(null);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<string | null>(null);
  const [templates, setTemplates] = useState<FormTemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isTemplateDetailsOpen, setIsTemplateDetailsOpen] = useState(false);
  const [isLoadingTemplateDetails, setIsLoadingTemplateDetails] = useState(false);
  const [templateDetailsError, setTemplateDetailsError] = useState<string | null>(null);
  const [templateDetails, setTemplateDetails] = useState<FormTemplateDetails | null>(null);
  const [formSetup, setFormSetup] = useState<FormSetupDetails>({
    formId: "contact_form_v1",
    formName: "Contact Form",
    slug: "contact-form",
    status: "draft",
    version: "1"
  });
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [formSetupError, setFormSetupError] = useState<string | null>(null);

  const selectedField = useMemo(
    () => formFields.find((field) => field.id === selectedFieldId) ?? null,
    [formFields, selectedFieldId]
  );

  const canvasRows = useMemo(() => buildRows(formFields), [formFields]);

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
    setTemplatesError(null);

    try {
      const response = await api.get<FormTemplateItem[]>(`/api/form/templates/${encodeURIComponent(adminUserId)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setTemplatesError(getApiErrorMessage(error, "Unable to load lead form templates."));
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const resolveFormSetupValues = () => {
    const formId = formSetup.formId.trim();
    const formName = formSetup.formName.trim();
    const slug = formSetup.slug.trim();
    const status = formSetup.status.trim();
    const version = Number(formSetup.version);

    if (!formId || !formName || !slug || !status || !Number.isInteger(version) || version < 1) {
      return null;
    }

    return {
      form_id: formId,
      form_name: formName,
      slug,
      status,
      version
    };
  };

  const createForm = () => {
    const setupValues = resolveFormSetupValues();
    if (!setupValues) {
      setFormSetupError(
        "Please fill required form details (form_id, form_name, slug, status, and version must be 1 or more)."
      );
      return;
    }

    setFormSetupError(null);
    setTemplateSaveError(null);
    setTemplateSaveSuccess(null);
    setEditingTemplateId(null);
    setContactPageStyle((prev) => ({ ...prev, pageTitle: setupValues.form_name }));
    setIsFormBuilderOpen(true);
  };

  const closeTemplateDetails = () => {
    setIsTemplateDetailsOpen(false);
    setIsLoadingTemplateDetails(false);
    setTemplateDetailsError(null);
    setTemplateDetails(null);
  };

  const openTemplateDetails = async (templateId: string) => {
    setIsTemplateDetailsOpen(true);
    setIsLoadingTemplateDetails(true);
    setTemplateDetailsError(null);
    setTemplateDetails(null);

    const token = getAdminToken();
    if (!token) {
      setTemplateDetailsError("Admin authentication required. Please log in again.");
      setIsLoadingTemplateDetails(false);
      return;
    }

    try {
      const response = await api.get<FormTemplateDetails>(`/api/form/template/${templateId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setTemplateDetails(response.data);
    } catch (error) {
      setTemplateDetailsError(getApiErrorMessage(error, "Unable to load form template details."));
    } finally {
      setIsLoadingTemplateDetails(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    const token = getAdminToken();
    if (!token) {
      setTemplatesError("Admin authentication required. Please log in again.");
      return;
    }

    const shouldDelete = window.confirm("Are you sure you want to delete this form template?");
    if (!shouldDelete) {
      return;
    }

    setDeletingTemplateId(templateId);
    setTemplatesError(null);

    try {
      await api.delete(`/api/form/template/${templateId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setTemplates((prev) => prev.filter((template) => template.id !== templateId));
      if (templateDetails?.id === templateId) {
        closeTemplateDetails();
      }
    } catch (error) {
      setTemplatesError(getApiErrorMessage(error, "Unable to delete lead form template."));
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const editTemplate = async (templateId: string) => {
    const token = getAdminToken();
    if (!token) {
      setTemplatesError("Admin authentication required. Please log in again.");
      return;
    }

    setTemplateSaveError(null);
    setTemplateSaveSuccess(null);
    setTemplatesError(null);

    try {
      const response = await api.get<FormTemplateDetails>(`/api/form/template/${templateId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const details = response.data;
      const schema = details?.schema_definition;
      if (!schema) {
        setTemplatesError("Unable to load form template details for editing.");
        return;
      }

      setFormSetup({
        formId: schema.form_id ?? templateId,
        formName: schema.form_name ?? "",
        slug: schema.slug ?? "",
        status: schema.status ?? "draft",
        version: String(schema.version ?? 1)
      });

      const nextFields: FormBuilderField[] = [...(schema.fields ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((field, index) => {
          const fieldType = resolveBuilderFieldType(field.type);
          const defaults = FIELD_DEFAULTS[fieldType];
          const validation = field.validation ?? {};
          const allowedMimeTypes = Array.isArray((validation as { allowed_mime_types?: unknown }).allowed_mime_types)
            ? ((validation as { allowed_mime_types?: unknown[] }).allowed_mime_types ?? [])
                .filter((value): value is string => typeof value === "string")
                .join(",")
            : "";

          return {
            id: field.id || createFieldId(),
            type: fieldType,
            label: field.label ?? defaults.label,
            name: field.name ?? `${defaults.name}_${index + 1}`,
            placeholder: field.placeholder ?? defaults.placeholder,
            required: Boolean(field.required),
            options: fieldType === "select" ? (Array.isArray(field.options) ? field.options : defaults.options) : [],
            accept: fieldType === "file" ? (allowedMimeTypes || defaults.accept) : "",
            layout: field.width === "full" ? "full" : "half"
          };
        });

      setFormFields(nextFields);
      setSelectedFieldId(nextFields[0]?.id ?? null);
      setSubmitButtonSettings((prev) => ({
        ...prev,
        label: schema.submit_button?.text ?? prev.label,
        bgColor: schema.submit_button?.color ?? prev.bgColor,
        hoverColor: schema.submit_button?.hover_color ?? prev.hoverColor,
        textColor: schema.submit_button?.text_color ?? prev.textColor
      }));
      setContactPageStyle((prev) => ({
        ...prev,
        pageTitle: schema.form_name ?? prev.pageTitle,
        bannerImageUrl: schema.page_style?.background_image_url ?? prev.bannerImageUrl,
        gradientFrom: schema.page_style?.background_color ?? prev.gradientFrom
      }));
      setEditingTemplateId(templateId);
      setIsFormBuilderOpen(true);
    } catch (error) {
      setTemplatesError(getApiErrorMessage(error, "Unable to load form template details for editing."));
    }
  };

  const updateField = (fieldId: string, updater: (field: FormBuilderField) => FormBuilderField) => {
    setFormFields((prev) => prev.map((field) => (field.id === fieldId ? updater(field) : field)));
  };

  const deleteField = (fieldId: string) => {
    setFormFields((prev) => prev.filter((field) => field.id !== fieldId));
    setSelectedFieldId((prev) => (prev === fieldId ? null : prev));
  };

  const moveField = (fieldId: string, targetIndex: number) => {
    setFormFields((prev) => {
      const fromIndex = prev.findIndex((field) => field.id === fieldId);
      if (fromIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      const safeIndex = Math.max(0, Math.min(targetIndex, next.length));
      const finalIndex = fromIndex < safeIndex ? safeIndex - 1 : safeIndex;
      next.splice(finalIndex, 0, moved);
      return next;
    });
  };

  const addFieldFromLibrary = (fieldType: BuilderFieldType, targetIndex?: number) => {
    setFormFields((prev) => {
      const defaults = FIELD_DEFAULTS[fieldType];
      const sameTypeCount = prev.filter((field) => field.type === fieldType).length + 1;
      const newField: FormBuilderField = {
        id: createFieldId(),
        ...defaults,
        label: sameTypeCount > 1 ? `${defaults.label} ${sameTypeCount}` : defaults.label,
        name: sameTypeCount > 1 ? `${defaults.name}_${sameTypeCount}` : defaults.name
      };

      setSelectedFieldId(newField.id);
      return typeof targetIndex === "number"
        ? insertAtIndex(prev, newField, targetIndex)
        : [...prev, newField];
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault();
    event.stopPropagation();

    const payload = parseDragPayload(event.dataTransfer.getData(DND_KEY));
    if (!payload) return;

    if (payload.source === "library") {
      addFieldFromLibrary(payload.fieldType, targetIndex);
      return;
    }

    moveField(payload.fieldId, targetIndex);
    setSelectedFieldId(payload.fieldId);
  };

  const handleDropAtEnd = (event: DragEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;

    event.preventDefault();
    event.stopPropagation();

    const payload = parseDragPayload(event.dataTransfer.getData(DND_KEY));
    if (!payload) return;

    if (payload.source === "library") {
      addFieldFromLibrary(payload.fieldType);
      return;
    }

    moveField(payload.fieldId, formFields.length);
    setSelectedFieldId(payload.fieldId);
  };

  const saveTemplate = async () => {
    if (!formFields.length) {
      setTemplateSaveError("Please add at least one field before saving the template.");
      setTemplateSaveSuccess(null);
      return;
    }

    const formSetupValues = resolveFormSetupValues();
    if (!formSetupValues) {
      setTemplateSaveError(
        "Please fill required form details (form_id, form_name, slug, status, and version must be 1 or more)."
      );
      setTemplateSaveSuccess(null);
      return;
    }

    const token = getAdminToken();
    if (!token) {
      setTemplateSaveError("Admin authentication required. Please log in again.");
      setTemplateSaveSuccess(null);
      return;
    }

    const schema_definition = {
      form_id: formSetupValues.form_id,
      form_name: formSetupValues.form_name,
      slug: formSetupValues.slug,
      status: formSetupValues.status,
      version: formSetupValues.version,
      layout: {
        columns: 2,
        field_spacing: 16
      },
      page_style: {
        background_color: contactPageStyle.gradientFrom,
        background_image_url: contactPageStyle.bannerImageUrl || ""
      },
      submit_button: {
        text: submitButtonSettings.label || "Send",
        color: submitButtonSettings.bgColor,
        text_color: submitButtonSettings.textColor,
        hover_color: submitButtonSettings.hoverColor,
        hover_text_color: submitButtonSettings.textColor,
        full_width: false
      },
      fields: formFields.map((field, index) => {
        const validation: Record<string, unknown> = {};
        if (field.type === "text" && field.required) {
          validation.min_length = 2;
          validation.max_length = 80;
          validation.pattern = null;
        }
        if (field.type === "textarea") {
          validation.max_length = 1000;
        }
        if (field.type === "file") {
          validation.allowed_mime_types = resolveAllowedMimeTypes(field.accept);
          validation.max_size_mb = 10;
        }

        const fieldPayload: Record<string, unknown> = {
          id: field.id,
          name: field.name,
          type: field.type,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
          order: index + 1,
          width: field.layout,
          default_value: "",
          help_text: "",
          validation
        };

        if (field.type === "select") {
          fieldPayload.options = field.options;
        }

        return fieldPayload;
      }),
      meta: {
        created_by: "admin_user_id",
        updated_by: "admin_user_id"
      }
    };

    setIsSavingTemplate(true);
    setTemplateSaveError(null);
    setTemplateSaveSuccess(null);

    try {
      const response = await api.put(
        `/api/form/template/${editingTemplateId || formSetupValues.form_id}`,
        { schema_definition },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const successMessage =
        (response.data as { message?: string } | undefined)?.message ?? "Lead form template saved successfully.";
      setTemplateSaveSuccess(successMessage);
      void loadTemplates();
    } catch (error) {
      setTemplateSaveError(getApiErrorMessage(error, "Unable to save lead form template."));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const activeTemplateCount = templates.filter((t) => t.is_active).length;

  return (
    <>
      <section className="mx-auto w-full space-y-5 lg:space-y-6">

        {/* ── PAGE HEADER ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-indigo-400 to-brand-500 dark:from-brand-800 dark:via-indigo-700 dark:to-brand-800" />
          <div className="px-6 py-6 sm:px-7 sm:py-7">
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-300">
              Form Builder
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Lead Forms
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Build drag-and-drop lead capture forms, save templates, and embed them on any website.
            </p>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-3">
              <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Templates</p>
                <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{templates.length}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Saved</p>
              </div>
              <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Active</p>
                <p className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{activeTemplateCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Live templates</p>
              </div>
              <div className="flex flex-col gap-1 px-6 py-4 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">Builder</p>
                <p className="text-3xl font-semibold tabular-nums text-brand-700 dark:text-brand-300">{isFormBuilderOpen ? "Open" : "Closed"}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Current state</p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── SAVED TEMPLATES ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Saved Templates</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Manage existing templates and continue editing anytime.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {templates.length} total
            </span>
          </div>

          {isLoadingTemplates ? (
            <div className="flex items-center justify-center gap-2 py-12">
              <svg className="h-4 w-4 animate-spin text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading templates…</p>
            </div>
          ) : templatesError ? (
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800 sm:px-6">
              <div className="flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
                <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{templatesError}</p>
              </div>
            </div>
          ) : !templates.length ? (
            <div className="flex flex-col items-center gap-2.5 py-12">
              <svg className="h-9 w-9 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No lead form templates found.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                      {["Form Name", "Slug", "Status", "Fields", "Active", "Created", "Actions"].map((h) => (
                        <th key={h} className={["px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6", h === "Actions" ? "text-right" : ""].join(" ")}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {templates.map((template) => (
                      <tr
                        key={template.id}
                        onClick={() => void openTemplateDetails(template.id)}
                        className="cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60"
                      >
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100 sm:px-6">{template.schema_definition?.form_name ?? "-"}</td>
                        <td className="px-5 py-3.5 sm:px-6">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {template.schema_definition?.slug ?? "-"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 sm:px-6">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadgeClasses(template.schema_definition?.status)}`}>
                            {template.schema_definition?.status ?? "-"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-slate-600 dark:text-slate-300 sm:px-6">{template.schema_definition?.fields?.length ?? 0}</td>
                        <td className="px-5 py-3.5 sm:px-6">
                          <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", template.is_active ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400" : "border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"].join(" ")}>
                            {template.is_active ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 sm:px-6">{formatDateTime(template.created_at)}</td>
                        <td className="px-5 py-3.5 sm:px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={(e) => { e.stopPropagation(); void openTemplateDetails(template.id); }} className="inline-flex h-7 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                              View
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); void editTemplate(template.id); }} className="inline-flex h-7 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                              Edit
                            </button>
                            <button type="button" disabled={deletingTemplateId === template.id} onClick={(e) => { e.stopPropagation(); void deleteTemplate(template.id); }} className="inline-flex h-7 items-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30">
                              {deletingTemplateId === template.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 p-4 sm:p-5 lg:hidden">
                {templates.map((template) => (
                  <div key={template.id} onClick={() => void openTemplateDetails(template.id)} className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{template.schema_definition?.form_name ?? "-"}</p>
                        <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{template.schema_definition?.slug ?? "-"}</span>
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadgeClasses(template.schema_definition?.status)}`}>
                        {template.schema_definition?.status ?? "-"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                      <div><p className="text-slate-400 dark:text-slate-500">Fields</p><p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{template.schema_definition?.fields?.length ?? 0}</p></div>
                      <div><p className="text-slate-400 dark:text-slate-500">Active</p><p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{template.is_active ? "Yes" : "No"}</p></div>
                      <div><p className="text-slate-400 dark:text-slate-500">Created</p><p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{formatDateTime(template.created_at)}</p></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); void openTemplateDetails(template.id); }} className="inline-flex h-7 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">View</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); void editTemplate(template.id); }} className="inline-flex h-7 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400">Edit</button>
                      <button type="button" disabled={deletingTemplateId === template.id} onClick={(e) => { e.stopPropagation(); void deleteTemplate(template.id); }} className="inline-flex h-7 items-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                        {deletingTemplateId === template.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* ── CREATE FORM SETUP ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Create Lead Form</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Fill form details then open the drag-and-drop builder.</p>
            </div>
            <button
              type="button"
              onClick={createForm}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 dark:border-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Open Builder
            </button>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                { key: "formId", label: "Form ID", type: "text" },
                { key: "formName", label: "Form Name", type: "text" },
                { key: "slug", label: "Slug", type: "text" },
                { key: "status", label: "Status", type: "text" },
                { key: "version", label: "Version", type: "number" }
              ].map(({ key, label, type }) => (
                <label key={key} className="block space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                  <input
                    type={type}
                    min={type === "number" ? 1 : undefined}
                    value={formSetup[key as keyof FormSetupDetails]}
                    onChange={(event) => {
                      if (key === "formName") {
                        const nextFormName = event.target.value;
                        const nextSlug = formSetup.slug.trim() ? formSetup.slug : slugify(nextFormName);
                        setFormSetup((prev) => ({ ...prev, formName: nextFormName, slug: nextSlug }));
                      } else {
                        setFormSetup((prev) => ({ ...prev, [key]: event.target.value }));
                      }
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900/40"
                  />
                </label>
              ))}
            </div>

            {formSetupError ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
                <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{formSetupError}</p>
              </div>
            ) : null}
          </div>
        </Card>

        {/* ── FORM BUILDER (three-panel) ── */}
        {isFormBuilderOpen ? (
          <div className="grid gap-4 lg:grid-cols-12 xl:gap-5">

            {/* Field Library */}
            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Field Library</h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Drag a field onto the canvas.</p>
              </div>
              <div className="space-y-2.5 overflow-y-auto p-4 sm:p-5 lg:max-h-[66vh]">
                {FIELD_LIBRARY.map((template) => (
                  <button
                    key={template.type}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        DND_KEY,
                        JSON.stringify({ source: "library", fieldType: template.type } satisfies DragPayload)
                      );
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{template.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Canvas */}
            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm lg:col-span-6 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Form Canvas</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Drag & drop fields, set layout per field in Field Settings.</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {formFields.length} field{formFields.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <div
                  className="min-h-72 space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-950/30"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDropAtEnd}
                >
                  {!formFields.length ? (
                    <div className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-xl bg-white text-center dark:bg-slate-950/50">
                      <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <p className="text-sm text-slate-400 dark:text-slate-500">Drop fields here to build your form.</p>
                    </div>
                  ) : (
                    canvasRows.map((row, rowIndex) => (
                      <div key={`row-${rowIndex}`} className="grid gap-3 md:grid-cols-2">
                        {row.items.map(({ field, index }) => (
                          <div
                            key={field.id}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                DND_KEY,
                                JSON.stringify({ source: "canvas", fieldId: field.id } satisfies DragPayload)
                              );
                            }}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handleDrop(event, index)}
                            onClick={() => setSelectedFieldId(field.id)}
                            className={[
                              "cursor-move rounded-xl border p-3.5 shadow-sm transition",
                              field.layout === "full" ? "md:col-span-2" : "",
                              selectedFieldId === field.id
                                ? "border-brand-500 bg-brand-50/40 dark:border-brand-400 dark:bg-brand-900/20"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950"
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {field.label}{field.required ? " *" : ""}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="rounded bg-slate-100 px-1 font-mono text-[10px] dark:bg-slate-800">{field.type}</span>
                                  {" · "}{field.name}{" · "}{field.layout}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); deleteField(field.id); }}
                                className="rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>

            {/* Field Settings */}
            <Card className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-0 text-slate-100 shadow-sm lg:col-span-3 lg:sticky lg:top-4 dark:border-slate-800">
              <div className="border-b border-slate-800 px-4 py-4 sm:px-5">
                <h3 className="text-sm font-semibold text-slate-100">Field Settings</h3>
                <p className="mt-0.5 text-xs text-slate-400">Click a canvas field to configure it.</p>
              </div>

              <div className="overflow-y-auto p-4 sm:p-5 lg:max-h-[calc(66vh-57px)]">
                {!selectedField ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-6 text-center text-sm text-slate-400">
                    No field selected.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Field Type</span>
                      <select
                        value={selectedField.type}
                        onChange={(event) => {
                          const newType = event.target.value as BuilderFieldType;
                          const defaults = FIELD_DEFAULTS[newType];
                          updateField(selectedField.id, (field) => ({
                            ...field,
                            type: newType,
                            placeholder: newType === "select" ? "" : field.placeholder || defaults.placeholder,
                            options: newType === "select" ? (field.options.length ? field.options : defaults.options) : [],
                            accept: newType === "file" ? (field.accept || defaults.accept) : ""
                          }));
                        }}
                        className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-100 outline-none focus:border-brand-500"
                      >
                        {FIELD_LIBRARY.map((fieldType) => (
                          <option key={fieldType.type} value={fieldType.type}>{fieldType.title}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Label</span>
                      <input
                        value={selectedField.label}
                        onChange={(event) => updateField(selectedField.id, (field) => ({ ...field, label: event.target.value }))}
                        className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Field Name</span>
                      <input
                        value={selectedField.name}
                        onChange={(event) => updateField(selectedField.id, (field) => ({ ...field, name: event.target.value }))}
                        className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Row Layout</span>
                      <select
                        value={selectedField.layout}
                        onChange={(event) => updateField(selectedField.id, (field) => ({ ...field, layout: event.target.value as FieldLayout }))}
                        className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-100 outline-none focus:border-brand-500"
                      >
                        <option value="half">Half width</option>
                        <option value="full">Full width</option>
                      </select>
                    </label>

                    {selectedField.type !== "select" && selectedField.type !== "file" ? (
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Placeholder</span>
                        <input
                          value={selectedField.placeholder}
                          onChange={(event) => updateField(selectedField.id, (field) => ({ ...field, placeholder: event.target.value }))}
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500"
                        />
                      </label>
                    ) : null}

                    {selectedField.type === "file" ? (
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Allowed Types</span>
                        <input
                          value={selectedField.accept}
                          onChange={(event) => updateField(selectedField.id, (field) => ({ ...field, accept: event.target.value }))}
                          placeholder=".pdf,.doc,.docx,.png,.jpg"
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500"
                        />
                      </label>
                    ) : null}

                    {selectedField.type === "select" ? (
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Options (one per line)</span>
                        <textarea
                          rows={4}
                          value={selectedField.options.join("\n")}
                          onChange={(event) => updateField(selectedField.id, (field) => ({
                            ...field,
                            options: event.target.value.split("\n").map((o) => o.trim()).filter(Boolean)
                          }))}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500"
                        />
                      </label>
                    ) : null}

                    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedField.required}
                        onChange={(event) => updateField(selectedField.id, (field) => ({ ...field, required: event.target.checked }))}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-brand-600 focus:ring-brand-500"
                      />
                      Required field
                    </label>
                  </div>
                )}

                {/* Send Button Settings accordion */}
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/40">
                  <button
                    type="button"
                    onClick={() => setIsSendSettingsOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-slate-800/70"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Submit Button</span>
                    <svg viewBox="0 0 24 24" className={["h-4 w-4 text-slate-400 transition-transform", isSendSettingsOpen ? "rotate-180" : ""].join(" ")} fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {isSendSettingsOpen ? (
                    <div className="space-y-3 border-t border-slate-700 px-3 pb-3 pt-3">
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Label</span>
                        <input value={submitButtonSettings.label} onChange={(event) => setSubmitButtonSettings((prev) => ({ ...prev, label: event.target.value }))} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-100 outline-none focus:border-brand-500" />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Button Color</span>
                        <input type="color" value={submitButtonSettings.bgColor} onChange={(event) => setSubmitButtonSettings((prev) => ({ ...prev, bgColor: event.target.value }))} className="h-10 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900/70 p-1" />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Hover Color</span>
                        <input type="color" value={submitButtonSettings.hoverColor} onChange={(event) => setSubmitButtonSettings((prev) => ({ ...prev, hoverColor: event.target.value }))} className="h-10 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900/70 p-1" />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Text Color</span>
                        <input type="color" value={submitButtonSettings.textColor} onChange={(event) => setSubmitButtonSettings((prev) => ({ ...prev, textColor: event.target.value }))} className="h-10 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900/70 p-1" />
                      </label>
                    </div>
                  ) : null}
                </div>

                {/* Save */}
                <div className="mt-4 border-t border-slate-700/70 pt-4">
                  <button
                    type="button"
                    onClick={saveTemplate}
                    disabled={isSavingTemplate}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/40 bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 dark:border-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600"
                  >
                    {isSavingTemplate ? (
                      <>
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving…
                      </>
                    ) : "Save Form Template"}
                  </button>
                  {templateSaveError ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                      {templateSaveError}
                    </p>
                  ) : null}
                  {templateSaveSuccess ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      {templateSaveSuccess}
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>

          </div>
        ) : null}
      </section>

      {/* ── TEMPLATE DETAILS MODAL ── */}
      {isTemplateDetailsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={closeTemplateDetails}>
          <div className="w-full max-w-[1240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-indigo-400 to-brand-500 dark:from-brand-800 dark:via-indigo-700 dark:to-brand-800" />
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div>
                <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-300">
                  Template Details
                </span>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {templateDetails?.schema_definition?.form_name ?? "Lead Form Details"}
                </h3>
                {templateDetails ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {templateDetails.id}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadgeClasses(templateDetails.schema_definition?.status)}`}>
                      {templateDetails.schema_definition?.status ?? "-"}
                    </span>
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={closeTemplateDetails} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[78vh] overflow-y-auto p-6">
              {isLoadingTemplateDetails ? (
                <div className="flex items-center justify-center gap-2 py-10">
                  <svg className="h-4 w-4 animate-spin text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading template details…</p>
                </div>
              ) : null}
              {templateDetailsError ? (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
                  <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">{templateDetailsError}</p>
                </div>
              ) : null}

              {!isLoadingTemplateDetails && !templateDetailsError && templateDetails ? (
                <div className="space-y-5">
                  {/* Meta strip */}
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      { label: "Template ID", value: templateDetails.id, mono: true },
                      { label: "Admin ID", value: templateDetails.admin_id ?? "-", mono: true },
                      { label: "Active", value: templateDetails.is_active ? "Yes" : "No" },
                      { label: "Created", value: formatDateTime(templateDetails.created_at) },
                      { label: "Updated", value: formatDateTime(templateDetails.updated_at) },
                      { label: "Total Fields", value: String(templateDetails.schema_definition?.fields?.length ?? 0) }
                    ].map(({ label, value, mono }) => (
                      <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
                        <p className={["mt-1.5 break-all text-sm font-semibold text-slate-900 dark:text-slate-100", mono ? "font-mono text-xs" : ""].join(" ")}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Form Config */}
                  <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Form Configuration</h4>
                    </div>
                    <div className="grid gap-px bg-slate-100 dark:bg-slate-800 sm:grid-cols-2 xl:grid-cols-3">
                      {[
                        { label: "Form ID", value: templateDetails.schema_definition?.form_id ?? "-" },
                        { label: "Form Name", value: templateDetails.schema_definition?.form_name ?? "-" },
                        { label: "Slug", value: templateDetails.schema_definition?.slug ?? "-" },
                        { label: "Status", value: templateDetails.schema_definition?.status ?? "-" },
                        { label: "Version", value: String(templateDetails.schema_definition?.version ?? "-") },
                        { label: "Columns", value: String(templateDetails.schema_definition?.layout?.columns ?? "-") }
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white px-4 py-3 dark:bg-slate-950">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fields table */}
                  <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Fields</h4>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        {templateDetails.schema_definition?.fields?.length ?? 0} total
                      </span>
                    </div>
                    {!templateDetails.schema_definition?.fields?.length ? (
                      <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">No fields available in this template.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
                          <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                              {["#", "Label", "Name", "Type", "Width", "Required", "Placeholder", "Validation"].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {templateDetails.schema_definition.fields.map((field) => (
                              <tr key={field.id} className="align-top transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60">
                                <td className="px-4 py-3 tabular-nums text-slate-500 dark:text-slate-400">{field.order ?? "-"}</td>
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{field.label ?? "-"}</td>
                                <td className="px-4 py-3">
                                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{field.name ?? "-"}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">{field.type ?? "-"}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">{field.width ?? "-"}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", field.required ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400" : "border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"].join(" ")}>
                                    {field.required ? "Required" : "Optional"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{field.placeholder || "-"}</td>
                                <td className="px-4 py-3">
                                  <pre className="max-h-28 max-w-[220px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
                                    {JSON.stringify(field.validation ?? {}, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


