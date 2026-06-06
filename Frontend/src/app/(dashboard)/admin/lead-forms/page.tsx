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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
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

  const openPreviewPage = () => {
    const rowsHtml = canvasRows
      .map((row) => {
        const rowFields = row.items
          .map(({ field }) => {
            const label = `${escapeHtml(field.label)}${field.required ? " *" : ""}`;
            const widthClass = field.layout === "full" ? "field full" : "field";

            if (field.type === "textarea") {
              return `<label class="${widthClass}"><span>${label}</span><textarea rows="4" placeholder="${escapeHtml(field.placeholder)}"></textarea></label>`;
            }

            if (field.type === "select") {
              const options = field.options
                .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
                .join("");
              return `<label class="${widthClass}"><span>${label}</span><select><option value="">Select an option</option>${options}</select></label>`;
            }

            if (field.type === "file") {
              return `<label class="${widthClass}"><span>${label}</span><input type="file" accept="${escapeHtml(field.accept)}" /></label>`;
            }

            return `<label class="${widthClass}"><span>${label}</span><input type="${escapeHtml(field.type)}" placeholder="${escapeHtml(field.placeholder)}" /></label>`;
          })
          .join("");

        return `<div class="row">${rowFields}</div>`;
      })
      .join("");

    const pageHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(contactPageStyle.pageTitle || "CONTACT")} - Preview</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; }
    .hero {
      height: 280px;
      background-image: url("${escapeHtml(contactPageStyle.bannerImageUrl || DEFAULT_BANNER_IMAGE)}");
      background-size: cover;
      background-position: center;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: #fff;
      padding: 24px;
    }
    .hero small { font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,.75); }
    .hero h1 { margin: 10px 0 0; font-size: 52px; letter-spacing: 0.5px; }
    .section {
      padding: 36px 18px;
      background: linear-gradient(135deg, ${escapeHtml(contactPageStyle.gradientFrom)}, ${escapeHtml(contactPageStyle.gradientTo)});
    }
    .form-card {
      max-width: 980px;
      margin: 0 auto;
      border-radius: 18px;
      background: linear-gradient(135deg, ${escapeHtml(contactPageStyle.gradientFrom)}, ${escapeHtml(contactPageStyle.gradientTo)});
      padding: 28px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
    }
    .form-card h2 { margin: 0 0 16px; font-size: 40px; line-height: 1.1; }
    .row { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 12px; }
    .field { display: block; }
    .field.full { grid-column: 1 / -1; }
    label span { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; }
    input, select, textarea {
      width: 100%;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      padding: 11px 12px;
      font-size: 14px;
      outline: none;
      background: #fff;
    }
    .send-btn {
      margin-top: 8px;
      border: 0;
      border-radius: 10px;
      padding: 12px 24px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      background: ${escapeHtml(submitButtonSettings.bgColor)};
      color: ${escapeHtml(submitButtonSettings.textColor)};
    }
    .send-btn:hover { background: ${escapeHtml(submitButtonSettings.hoverColor)}; }
    .empty { margin-top: 10px; color: #475569; font-size: 14px; }
    @media (max-width: 768px) {
      .hero { height: 220px; }
      .hero h1 { font-size: 36px; }
      .row { grid-template-columns: 1fr; }
      .field.full { grid-column: auto; }
    }
  </style>
</head>
<body>
  <section class="hero">
    <div>
      <small>Home | Contact</small>
      <h1>${escapeHtml(contactPageStyle.pageTitle || "CONTACT")}</h1>
    </div>
  </section>
  <section class="section">
    <div class="form-card">
      <h2>Leave us a message</h2>
      ${rowsHtml}
      <button class="send-btn" type="button">${escapeHtml(submitButtonSettings.label || "Send")}</button>
      ${formFields.length ? "" : '<p class="empty">No fields in preview yet.</p>'}
    </div>
  </section>
</body>
</html>`;

    const previewWindow = window.open("", "_blank");
    if (!previewWindow) return;

    previewWindow.document.open();
    previewWindow.document.write(pageHtml);
    previewWindow.document.close();
    previewWindow.focus();
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

  return (
    <>
      <section className="space-y-6">
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-0 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Saved Lead Form Templates</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage existing templates and continue editing anytime.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Total: {templates.length}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {isLoadingTemplates ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading templates...</p> : null}
            {templatesError ? <p className="text-sm text-red-600">{templatesError}</p> : null}
            {!isLoadingTemplates && !templatesError && !templates.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                No lead form templates found.
              </div>
            ) : null}

            {!isLoadingTemplates && !templatesError && templates.length ? (
              <>
                <div className="hidden overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 lg:block">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50/80 dark:bg-slate-900/60">
                      <tr className="text-left text-slate-600 dark:text-slate-300">
                        <th className="px-4 py-3 font-semibold">Form Name</th>
                        <th className="px-4 py-3 font-semibold">Slug</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Fields</th>
                        <th className="px-4 py-3 font-semibold">Active</th>
                        <th className="px-4 py-3 font-semibold">Created</th>
                        <th className="px-4 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {templates.map((template) => (
                        <tr
                          key={template.id}
                          onClick={() => void openTemplateDetails(template.id)}
                          className="cursor-pointer text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/30"
                        >
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{template.schema_definition?.form_name ?? "-"}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{template.schema_definition?.slug ?? "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(template.schema_definition?.status)}`}>
                              {template.schema_definition?.status ?? "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3">{template.schema_definition?.fields?.length ?? 0}</td>
                          <td className="px-4 py-3">{template.is_active ? "Yes" : "No"}</td>
                          <td className="px-4 py-3">{formatDateTime(template.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void openTemplateDetails(template.id);
                                }}
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                View Details
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void editTemplate(template.id);
                                }}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={deletingTemplateId === template.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void deleteTemplate(template.id);
                                }}
                                className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                {deletingTemplateId === template.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 lg:hidden">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => void openTemplateDetails(template.id)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {template.schema_definition?.form_name ?? "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{template.schema_definition?.slug ?? "-"}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClasses(template.schema_definition?.status)}`}>
                          {template.schema_definition?.status ?? "-"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Fields</p>
                          <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{template.schema_definition?.fields?.length ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Active</p>
                          <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{template.is_active ? "Yes" : "No"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Created</p>
                          <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{formatDateTime(template.created_at)}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openTemplateDetails(template.id);
                          }}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void editTemplate(template.id);
                          }}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingTemplateId === template.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteTemplate(template.id);
                          }}
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          {deletingTemplateId === template.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Lead Form</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Fill form details before opening the builder.
              </p>
            </div>
            <button
              type="button"
              onClick={createForm}
              className="rounded-lg border border-brand-300 bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 dark:border-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600"
            >
              Create Form
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Form ID</span>
              <input
                value={formSetup.formId}
                onChange={(event) => setFormSetup((prev) => ({ ...prev, formId: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Form Name</span>
              <input
                value={formSetup.formName}
                onChange={(event) => {
                  const nextFormName = event.target.value;
                  const nextSlug = formSetup.slug.trim() ? formSetup.slug : slugify(nextFormName);
                  setFormSetup((prev) => ({ ...prev, formName: nextFormName, slug: nextSlug }));
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Slug</span>
              <input
                value={formSetup.slug}
                onChange={(event) => setFormSetup((prev) => ({ ...prev, slug: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Status</span>
              <input
                value={formSetup.status}
                onChange={(event) => setFormSetup((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Version</span>
              <input
                type="number"
                min={1}
                value={formSetup.version}
                onChange={(event) => setFormSetup((prev) => ({ ...prev, version: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
          </div>
          {formSetupError ? <p className="mt-3 text-sm text-red-600">{formSetupError}</p> : null}
        </Card>

        {/* <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Lead Form Builder</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Drag fields, then choose each field layout as half width or full width.
          </p>
        </div> */}

        {/* {isLoading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading lead form stats...</p> : null}
        {isError ? <p className="text-sm text-red-600">Failed to load lead form stats.</p> : null}
        {data ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.slice(0, 4).map((item) => (
              <Card key={item.label} className="rounded-2xl border-slate-200/80 p-6 dark:border-slate-800">
                <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                  {formatNumber(item.value)}
                </p>
                <div className="mt-7 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.label}</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {item.trend}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : null} */}

        {isFormBuilderOpen ? (
          <div className="grid gap-4 lg:grid-cols-12 xl:gap-5">
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-3 lg:p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Field Library</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Drag a field into the form canvas.</p>
            <div className="mt-4 space-y-3 lg:max-h-[66vh] lg:overflow-y-auto lg:pr-1">
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
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-6 lg:p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Form Canvas</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Arrange your rows here. Use half/full layout from Field Settings.
            </p>
            <div
              className="mt-4 min-h-72 space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-900/30"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDropAtEnd}
            >
              {!formFields.length ? (
                <div className="flex min-h-52 items-center justify-center rounded-xl bg-white text-center text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                  Drop fields here to build your lead form.
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
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {field.label} {field.required ? "*" : ""}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {field.type.toUpperCase()} | {field.name} | {field.layout.toUpperCase()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteField(field.id);
                            }}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
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
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 p-4 text-slate-100 shadow-sm lg:col-span-3 lg:sticky lg:top-4 lg:p-5 dark:border-slate-800">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-100">Field Settings</h3>
            <p className="mt-1 text-sm text-slate-300">
              Select a field in canvas and configure label, type, and row layout.
            </p>
            {!selectedField ? (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                No field selected.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-300">Field Type</span>
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
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                  >
                    {FIELD_LIBRARY.map((fieldType) => (
                      <option key={fieldType.type} value={fieldType.type}>
                        {fieldType.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-300">Label</span>
                  <input
                    value={selectedField.label}
                    onChange={(event) =>
                      updateField(selectedField.id, (field) => ({ ...field, label: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-500"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-300">Name</span>
                  <input
                    value={selectedField.name}
                    onChange={(event) =>
                      updateField(selectedField.id, (field) => ({ ...field, name: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-500"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-300">Row Layout</span>
                  <select
                    value={selectedField.layout}
                    onChange={(event) =>
                      updateField(selectedField.id, (field) => ({
                        ...field,
                        layout: event.target.value as FieldLayout
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                  >
                    <option value="half">Half width (two fields in one row)</option>
                    <option value="full">Full width (single field row)</option>
                  </select>
                </label>

                {selectedField.type !== "select" && selectedField.type !== "file" ? (
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Placeholder</span>
                    <input
                      value={selectedField.placeholder}
                      onChange={(event) =>
                        updateField(selectedField.id, (field) => ({ ...field, placeholder: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-500"
                    />
                  </label>
                ) : null}

                {selectedField.type === "file" ? (
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Allowed Document Types</span>
                    <input
                      value={selectedField.accept}
                      onChange={(event) =>
                        updateField(selectedField.id, (field) => ({ ...field, accept: event.target.value }))
                      }
                      placeholder=".pdf,.doc,.docx,.png,.jpg"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-500"
                    />
                  </label>
                ) : null}

                {selectedField.type === "select" ? (
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Dropdown Options</span>
                    <textarea
                      rows={4}
                      value={selectedField.options.join("\n")}
                      onChange={(event) =>
                        updateField(selectedField.id, (field) => ({
                          ...field,
                          options: event.target.value
                            .split("\n")
                            .map((option) => option.trim())
                            .filter(Boolean)
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-500"
                    />
                  </label>
                ) : null}

                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(event) =>
                      updateField(selectedField.id, (field) => ({ ...field, required: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-brand-600 focus:ring-brand-500"
                  />
                  Required field
                </label>
              </div>
            )}
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/40">
              <button
                type="button"
                onClick={() => setIsSendSettingsOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-slate-800/70"
              >
                <span className="text-sm font-semibold text-slate-100">Send Button Settings</span>
                <svg
                  viewBox="0 0 24 24"
                  className={["h-4 w-4 text-slate-400 transition-transform", isSendSettingsOpen ? "rotate-180" : ""].join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isSendSettingsOpen ? (
                <div className="space-y-3 border-t border-slate-700 px-3 pb-3 pt-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Button Label</span>
                    <input
                      value={submitButtonSettings.label}
                      onChange={(event) =>
                        setSubmitButtonSettings((prev) => ({ ...prev, label: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Button Color</span>
                    <input
                      type="color"
                      value={submitButtonSettings.bgColor}
                      onChange={(event) =>
                        setSubmitButtonSettings((prev) => ({ ...prev, bgColor: event.target.value }))
                      }
                      className="h-10 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900/70 p-1"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Button Hover Color</span>
                    <input
                      type="color"
                      value={submitButtonSettings.hoverColor}
                      onChange={(event) =>
                        setSubmitButtonSettings((prev) => ({ ...prev, hoverColor: event.target.value }))
                      }
                      className="h-10 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900/70 p-1"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Button Text Color</span>
                    <input
                      type="color"
                      value={submitButtonSettings.textColor}
                      onChange={(event) =>
                        setSubmitButtonSettings((prev) => ({ ...prev, textColor: event.target.value }))
                      }
                      className="h-10 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900/70 p-1"
                    />
                  </label>
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-700/70 pt-4">
              <button
                type="button"
                onClick={saveTemplate}
                disabled={isSavingTemplate}
                className="w-full rounded-lg border border-brand-400/70 bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto dark:border-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600"
              >
                {isSavingTemplate ? "Saving..." : "Save Form Template"}
              </button>
            </div>
            {templateSaveError ? <p className="mt-2 text-sm text-red-600">{templateSaveError}</p> : null}
            {templateSaveSuccess ? <p className="mt-2 text-sm text-emerald-600">{templateSaveSuccess}</p> : null}
          </Card>
          </div>
        ) : null}
      </section>

      {isTemplateDetailsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={closeTemplateDetails}
        >
          <div
            className="w-full max-w-[1240px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {templateDetails?.schema_definition?.form_name ?? "Lead Form Details"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Template details overview for admin.
                  </p>
                  {templateDetails ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        ID: {templateDetails.id}
                      </span>
                      <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        Slug: {templateDetails.schema_definition?.slug ?? "-"}
                      </span>
                      <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        Status: {templateDetails.schema_definition?.status ?? "-"}
                      </span>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={closeTemplateDetails}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] overflow-y-auto p-6">
              {isLoadingTemplateDetails ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                  Loading template details...
                </div>
              ) : null}
              {templateDetailsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                  {templateDetailsError}
                </div>
              ) : null}

              {!isLoadingTemplateDetails && !templateDetailsError && templateDetails ? (
                <div className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Template Id</p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{templateDetails.id}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Admin Id</p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{templateDetails.admin_id ?? "-"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Active</p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {templateDetails.is_active ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatDateTime(templateDetails.created_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Updated</p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatDateTime(templateDetails.updated_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fields</p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {templateDetails.schema_definition?.fields?.length ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">Form Configuration</h4>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Form ID</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{templateDetails.schema_definition?.form_id ?? "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Form Name</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{templateDetails.schema_definition?.form_name ?? "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Slug</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{templateDetails.schema_definition?.slug ?? "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{templateDetails.schema_definition?.status ?? "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Version</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{templateDetails.schema_definition?.version ?? "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Columns</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{templateDetails.schema_definition?.layout?.columns ?? "-"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 sm:col-span-2">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Field Spacing</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{templateDetails.schema_definition?.layout?.field_spacing ?? "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">Fields</h4>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Total {templateDetails.schema_definition?.fields?.length ?? 0}
                      </span>
                    </div>
                    {!templateDetails.schema_definition?.fields?.length ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No fields available in this template.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full text-sm">
                          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80">
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              <th className="px-3 py-3 font-semibold">Order</th>
                              <th className="px-3 py-3 font-semibold">Label</th>
                              <th className="px-3 py-3 font-semibold">Name</th>
                              <th className="px-3 py-3 font-semibold">Type</th>
                              <th className="px-3 py-3 font-semibold">Width</th>
                              <th className="px-3 py-3 font-semibold">Required</th>
                              <th className="px-3 py-3 font-semibold">Placeholder</th>
                              <th className="px-3 py-3 font-semibold">Validation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {templateDetails.schema_definition.fields.map((field) => (
                              <tr key={field.id} className="align-top text-slate-700 dark:text-slate-200">
                                <td className="px-3 py-3 font-medium">{field.order ?? "-"}</td>
                                <td className="px-3 py-3">{field.label ?? "-"}</td>
                                <td className="px-3 py-3 font-mono text-xs">{field.name ?? "-"}</td>
                                <td className="px-3 py-3">
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {field.type ?? "-"}
                                  </span>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {field.width ?? "-"}
                                  </span>
                                </td>
                                <td className="px-3 py-3">
                                  <span
                                    className={[
                                      "rounded-full px-2 py-1 text-xs font-semibold",
                                      field.required
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                    ].join(" ")}
                                  >
                                    {field.required ? "Required" : "Optional"}
                                  </span>
                                </td>
                                <td className="px-3 py-3">{field.placeholder || "-"}</td>
                                <td className="px-3 py-3">
                                  <pre className="max-h-28 max-w-[260px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
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
