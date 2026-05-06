"use client";

import { type ChangeEvent, type DragEvent, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
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

export default function AdminLeadFormsPage() {
  const [formFields, setFormFields] = useState<FormBuilderField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isSendSettingsOpen, setIsSendSettingsOpen] = useState(false);
  const [isContactStyleOpen, setIsContactStyleOpen] = useState(false);
  const [isSendHovered, setIsSendHovered] = useState(false);
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

  const selectedField = useMemo(
    () => formFields.find((field) => field.id === selectedFieldId) ?? null,
    [formFields, selectedFieldId]
  );

  const canvasRows = useMemo(() => buildRows(formFields), [formFields]);

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

  const handleBannerImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setContactPageStyle((prev) => ({ ...prev, bannerImageUrl: result }));
    };
    reader.readAsDataURL(file);
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

  return (
    <>
      <section className="space-y-6">
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

        <div className="grid gap-4 xl:grid-cols-[280px_1fr_320px]">
          <Card className="rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Field Library</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Drag a field into the form canvas.</p>
            <div className="mt-4 space-y-3">
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
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{template.title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Form Canvas</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Arrange your rows here. Use half/full layout from Field Settings.
            </p>
            <div
              className="mt-4 min-h-72 space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/30"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDropAtEnd}
            >
              {!formFields.length ? (
                <div className="flex min-h-52 items-center justify-center rounded-lg bg-white text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
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
                          "cursor-move rounded-xl border p-3 transition",
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

          <Card className="rounded-2xl border-[#2b4868] bg-[#071634] p-5 text-slate-100">
            <h3 className="text-2xl font-semibold text-slate-100">Field Settings</h3>
            <p className="mt-1 text-sm text-slate-300">
              Select a field in canvas and configure label, type, and row layout.
            </p>
            {!selectedField ? (
              <div className="mt-4 rounded-xl border border-[#2b4868] bg-[#0a1b3d] p-4 text-sm text-slate-300">
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
                    className="w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-slate-100 outline-none focus:border-[#4b709c]"
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
                    className="w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#4b709c]"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-300">Name</span>
                  <input
                    value={selectedField.name}
                    onChange={(event) =>
                      updateField(selectedField.id, (field) => ({ ...field, name: event.target.value }))
                    }
                    className="w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#4b709c]"
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
                    className="w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-slate-100 outline-none focus:border-[#4b709c]"
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
                      className="w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#4b709c]"
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
                      className="w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#4b709c]"
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
                      className="w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#4b709c]"
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
                    className="h-4 w-4 rounded border-[#4d5f78] bg-[#0a1b3d] text-brand-600 focus:ring-brand-500"
                  />
                  Required field
                </label>
              </div>
            )}
            <div className="mt-6 rounded-xl border border-[#2b4868]">
              <button
                type="button"
                onClick={() => setIsSendSettingsOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-[#0a1b3d]"
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
                <div className="space-y-3 border-t border-[#2b4868] px-3 pb-3 pt-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Button Label</span>
                    <input
                      value={submitButtonSettings.label}
                      onChange={(event) =>
                        setSubmitButtonSettings((prev) => ({ ...prev, label: event.target.value }))
                      }
                      className="w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-slate-100 outline-none focus:border-[#4b709c]"
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
                      className="h-10 w-full cursor-pointer rounded-lg border border-[#2b4868] bg-[#0a1b3d] p-1"
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
                      className="h-10 w-full cursor-pointer rounded-lg border border-[#2b4868] bg-[#0a1b3d] p-1"
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
                      className="h-10 w-full cursor-pointer rounded-lg border border-[#2b4868] bg-[#0a1b3d] p-1"
                    />
                  </label>
                </div>
              ) : null}
            </div>
            <div className="mt-6 rounded-xl border border-[#2b4868]">
              <button
                type="button"
                onClick={() => setIsContactStyleOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-[#0a1b3d]"
              >
                <span className="text-sm font-semibold text-slate-100">Contact Page Style</span>
                <svg
                  viewBox="0 0 24 24"
                  className={["h-4 w-4 text-slate-400 transition-transform", isContactStyleOpen ? "rotate-180" : ""].join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isContactStyleOpen ? (
                <div className="space-y-3 border-t border-[#2b4868] px-3 pb-3 pt-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Page Title</span>
                    <input
                      value={contactPageStyle.pageTitle}
                      onChange={(event) =>
                        setContactPageStyle((prev) => ({ ...prev, pageTitle: event.target.value }))
                      }
                      className="w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-slate-100 outline-none focus:border-[#4b709c]"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Select Banner Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerImageSelect}
                      className="mb-2 w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-sm text-slate-100 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-[#10254a] file:px-3 file:py-1.5 file:text-slate-200"
                    />
                    <span className="mb-1 block text-slate-300">Or Banner Image URL</span>
                    <input
                      value={contactPageStyle.bannerImageUrl}
                      onChange={(event) =>
                        setContactPageStyle((prev) => ({ ...prev, bannerImageUrl: event.target.value }))
                      }
                      placeholder="https://..."
                      className="w-full rounded-lg border border-[#2b4868] bg-[#0a1b3d] px-3 py-2 text-slate-100 outline-none focus:border-[#4b709c]"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-300">Gradient Start (Hex)</span>
                      <input
                        type="color"
                        value={contactPageStyle.gradientFrom}
                        onChange={(event) =>
                          setContactPageStyle((prev) => ({ ...prev, gradientFrom: event.target.value }))
                        }
                        className="h-10 w-full cursor-pointer rounded-lg border border-[#2b4868] bg-[#0a1b3d] p-1"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-300">Gradient End (Hex)</span>
                      <input
                        type="color"
                        value={contactPageStyle.gradientTo}
                        onChange={(event) =>
                          setContactPageStyle((prev) => ({ ...prev, gradientTo: event.target.value }))
                        }
                        className="h-10 w-full cursor-pointer rounded-lg border border-[#2b4868] bg-[#0a1b3d] p-1"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div>
          <Card className="rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Live Preview</h3>
              <button
                type="button"
                onClick={openPreviewPage}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Preview Page
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div
                className="flex h-48 items-center justify-center bg-cover bg-center px-6 text-center"
                style={{
                  backgroundImage: `url(${contactPageStyle.bannerImageUrl || DEFAULT_BANNER_IMAGE})`
                }}
              >
                <div>
                  <p className="text-sm font-semibold tracking-wide text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]">Home | Contact</p>
                  <h4 className="mt-2 text-4xl font-bold uppercase tracking-tight text-white">
                    {contactPageStyle.pageTitle || "CONTACT"}
                  </h4>
                </div>
              </div>

              <div
                className="p-6"
                style={{
                  background: `linear-gradient(135deg, ${contactPageStyle.gradientFrom}, ${contactPageStyle.gradientTo})`
                }}
              >
                <div
                  className="mx-auto max-w-3xl rounded-2xl p-5 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${contactPageStyle.gradientFrom}, ${contactPageStyle.gradientTo})`
                  }}
                >
                  <h5 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    Leave us a message
                  </h5>
                  <div className="space-y-3">
                    {canvasRows.map((row, rowIndex) => (
                      <div key={`preview-row-${rowIndex}`} className="grid gap-3 md:grid-cols-2">
                        {row.items.map(({ field }) => (
                          <label
                            key={field.id}
                            className={[
                              "block text-sm text-slate-700 dark:text-slate-200",
                              field.layout === "full" ? "md:col-span-2" : ""
                            ].join(" ")}
                          >
                            <span className="mb-1 block font-medium">
                              {field.label} {field.required ? "*" : ""}
                            </span>

                            {field.type === "textarea" ? (
                              <textarea
                                rows={3}
                                placeholder={field.placeholder}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-900"
                              />
                            ) : null}

                            {field.type === "select" ? (
                              <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-900">
                                <option value="">Select an option</option>
                                {field.options.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : null}

                            {field.type === "file" ? (
                              <input
                                type="file"
                                accept={field.accept}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:file:bg-slate-800 dark:file:text-slate-200"
                              />
                            ) : null}

                            {field.type !== "textarea" && field.type !== "select" && field.type !== "file" ? (
                              <input
                                type={field.type}
                                placeholder={field.placeholder}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-900"
                              />
                            ) : null}
                          </label>
                        ))}
                      </div>
                    ))}

                    <button
                      type="button"
                      onMouseEnter={() => setIsSendHovered(true)}
                      onMouseLeave={() => setIsSendHovered(false)}
                      className="mt-2 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
                      style={{
                        backgroundColor: isSendHovered ? submitButtonSettings.hoverColor : submitButtonSettings.bgColor,
                        color: submitButtonSettings.textColor
                      }}
                    >
                      {submitButtonSettings.label || "Send"}
                    </button>

                    {!formFields.length ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No fields in preview yet.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
