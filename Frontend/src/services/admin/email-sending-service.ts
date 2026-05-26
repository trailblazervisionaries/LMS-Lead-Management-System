import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";
import { AdminProfileResponse } from "@/types/admin/admin-profile";

export interface AdminLeadItem {
  id: string;
  submitted_data?: Record<string, unknown> | null;
  created_at?: string | null;
  assigned_assistant?: {
    name?: string;
    email?: string;
  } | null;
}

export interface AdminLeadsResponse {
  items: AdminLeadItem[];
  total_count: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface EmailLeadRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  createdAt: string;
  assignedAssistant: string;
}

export interface SendCustomEmailPayload {
  email_to: string;
  subject: string;
  body: string;
}

export interface SendBulkEmailPayload {
  subject: string;
  body: string;
}

const PAGE_SIZE = 100;

function getAdminToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token=") || cookie.startsWith("auth="))
    ?.split("=")[1];

  return tokenFromCookie ? decodeURIComponent(tokenFromCookie) : null;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getSubmittedValue(data: Record<string, unknown>, aliases: string[]): string {
  const normalized = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [normalizeKey(key), String(value ?? "").trim()])
  ) as Record<string, string>;

  for (const alias of aliases) {
    const match = normalized[normalizeKey(alias)];
    if (match) return match;
  }

  return "-";
}

function mapLead(lead: AdminLeadItem): EmailLeadRecord {
  const submittedData = lead.submitted_data && typeof lead.submitted_data === "object" ? lead.submitted_data : {};

  return {
    id: lead.id,
    name: getSubmittedValue(submittedData, ["name", "full name", "lead name", "customer name"]),
    email: getSubmittedValue(submittedData, ["email", "email address", "mail"]),
    company: getSubmittedValue(submittedData, ["company", "organization", "business"]),
    phone: getSubmittedValue(submittedData, ["phone", "phone number", "mobile", "contact"]),
    createdAt: lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-",
    assignedAssistant: lead.assigned_assistant?.name?.trim() || "Unassigned"
  };
}

async function fetchLeadPage(page: number, size: number, token: string): Promise<AdminLeadsResponse> {
  const response = await api.get<AdminLeadsResponse>("/api/lead/admin/leads", {
    params: { page, size },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
}

async function fetchAdminUserId(token: string): Promise<string> {
  const response = await api.get<AdminProfileResponse>("/api/admin/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const userId = response.data.user_id?.trim();
  if (!userId) {
    throw new Error("Unable to determine admin identity.");
  }

  return userId;
}

export async function getAllAdminLeads(): Promise<EmailLeadRecord[]> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const firstPage = await fetchLeadPage(1, PAGE_SIZE, token);
    const items = Array.isArray(firstPage.items) ? [...firstPage.items] : [];
    const totalPages = Math.max(firstPage.total_pages ?? 1, 1);

    if (totalPages > 1) {
      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) => fetchLeadPage(index + 2, PAGE_SIZE, token))
      );

      for (const page of remainingPages) {
        if (Array.isArray(page.items)) {
          items.push(...page.items);
        }
      }
    }

    return items.map(mapLead);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load leads for email sending."));
  }
}

export async function sendCustomEmail(payload: SendCustomEmailPayload): Promise<unknown> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const response = await api.post("/api/custom/email/compose", payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to send email."));
  }
}

export async function sendBulkEmailToAllLeads(payload: SendBulkEmailPayload): Promise<unknown> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const adminUserId = await fetchAdminUserId(token);
    const response = await api.post(`/api/custom/bulk/each-lead-users/${adminUserId}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to send bulk email."));
  }
}
