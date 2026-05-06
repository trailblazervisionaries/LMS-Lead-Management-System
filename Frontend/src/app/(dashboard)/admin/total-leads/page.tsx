"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  source: "Manual",
  status: "New"
};

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

export default function AdminTotalLeadsPage() {
  const [leadForm, setLeadForm] = useState(INITIAL_FORM);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [selectedLeadFields, setSelectedLeadFields] = useState<LeadFieldKey[]>(LEAD_FIELDS.map((field) => field.key));
  const [filterField, setFilterField] = useState<LeadFieldKey>("name");
  const [filterQuery, setFilterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const totalLeads = useMemo(() => leads.length, [leads]);
  const visibleFieldDefinitions = useMemo(
    () => LEAD_FIELDS.filter((field) => selectedLeadFields.includes(field.key)),
    [selectedLeadFields]
  );
  const searchableFieldOptions = useMemo(
    () => SEARCHABLE_FIELDS.filter((field) => selectedLeadFields.includes(field)),
    [selectedLeadFields]
  );
  const hasSearchableFields = searchableFieldOptions.length > 0;

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

  const handleManualInput = (field: keyof typeof INITIAL_FORM, value: string) => {
    setLeadForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleLeadField = (fieldKey: LeadFieldKey) => {
    setSelectedLeadFields((prev) => {
      if (prev.includes(fieldKey)) {
        return prev.filter((key) => key !== fieldKey);
      }
      return [...prev, fieldKey];
    });
  };

  const addManualLead = () => {
    setError("");
    setMessage("");

    if (!visibleFieldDefinitions.length) {
      setError("Select at least one field in Lead Structure before adding leads.");
      return;
    }

    const missingField = visibleFieldDefinitions.find((field) => !leadForm[field.key].trim());
    if (missingField) {
      setError(`${missingField.label} is required based on selected lead structure.`);
      return;
    }

    const createdLead: LeadRecord = {
      id: `LD-${Date.now()}`,
      name: selectedLeadFields.includes("name") ? leadForm.name.trim() || "-" : "-",
      email: selectedLeadFields.includes("email") ? leadForm.email.trim() || "-" : "-",
      phone: selectedLeadFields.includes("phone") ? leadForm.phone.trim() || "-" : "-",
      company: selectedLeadFields.includes("company") ? leadForm.company.trim() || "-" : "-",
      source: selectedLeadFields.includes("source") ? leadForm.source.trim() || "Manual" : "-",
      status: selectedLeadFields.includes("status") ? leadForm.status.trim() || "New" : "-",
      createdAt: new Date().toLocaleDateString()
    };

    setLeads((prev) => [createdLead, ...prev]);
    setLeadForm(INITIAL_FORM);
    setMessage("Lead added successfully.");
  };

  const handleExcelUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setMessage("");

    if (!file) return;

    try {
      const XLSX = await import("xlsx");
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setError("The uploaded file does not contain any sheet.");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

      if (!rawRows.length) {
        setError("No rows found in the uploaded sheet.");
        return;
      }

      const importedLeads: LeadRecord[] = rawRows
        .map((row, index) => {
          const normalizedRow = Object.fromEntries(
            Object.entries(row).map(([key, value]) => [normalizeKey(key), String(value ?? "").trim()])
          ) as Record<string, string>;

          const name = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "name")?.aliases ?? []);
          const email = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "email")?.aliases ?? []);
          const phone = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "phone")?.aliases ?? []);
          const company = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "company")?.aliases ?? []);
          const source = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "source")?.aliases ?? []);
          const status = extractMappedValue(normalizedRow, LEAD_FIELDS.find((field) => field.key === "status")?.aliases ?? []);

          if (!name && !email && !phone) return null;

          return {
            id: `LD-${Date.now()}-${index + 1}`,
            name: name || "-",
            email: email || "-",
            phone: phone || "-",
            company: company || "-",
            source: source || "Excel Import",
            status: status || "New",
            createdAt: new Date().toLocaleDateString()
          } as LeadRecord;
        })
        .filter((lead): lead is LeadRecord => Boolean(lead));

      if (!importedLeads.length) {
        setError("No valid lead rows found. Make sure your sheet has Name, Email or Phone columns.");
        return;
      }

      setLeads((prev) => [...importedLeads, ...prev]);
      setMessage(`${importedLeads.length} leads imported from ${file.name}.`);
    } catch {
      setError("Unable to read this file. Please upload a valid Excel or CSV file.");
    }
  };

  return (
    <>
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Total Leads</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Add leads manually or import from Excel, then manage everything in one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl xl:col-span-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Leads</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{totalLeads}</p>
          </Card>
          <Card className="rounded-2xl sm:col-span-1 xl:col-span-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Lead Structure</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LEAD_FIELDS.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => toggleLeadField(field.key)}
                  className={
                    selectedLeadFields.includes(field.key)
                      ? "rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-700"
                      : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }
                >
                  {field.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Lead Manually</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {visibleFieldDefinitions.map((field) => (
                <Input
                  key={field.key}
                  placeholder={`${field.placeholder} *`}
                  value={leadForm[field.key]}
                  onChange={(event) => handleManualInput(field.key, event.target.value)}
                />
              ))}
            </div>
            <div className="mt-4">
              <Button type="button" onClick={addManualLead}>
                Add Lead
              </Button>
            </div>
          </Card>

          <Card className="rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Import Leads From Excel</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Upload `.xlsx`, `.xls` or `.csv`. We auto-map common columns like Name, Email, Phone, Company, Source and Status.
            </p>
            <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50">
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
              Click to upload Excel/CSV file
            </label>
          </Card>
        </div>

        {message ? <p className="text-sm font-medium text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <Card className="rounded-2xl">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Leads List</h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
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

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
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
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{lead.id}</td>
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
                {!filteredLeads.length ? (
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
        </Card>
      </section>
    </>
  );
}
