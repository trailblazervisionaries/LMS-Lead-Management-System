import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";
import { AssistantAssignedLeadsResponse, AssistantAssignedLeadItem } from "@/types/assistant/assigned-leads";

export interface EmailLeadRecord {
  id: string;
  displayName: string;
  email: string;
  submittedData: Record<string, string>;
}

export interface SendCustomEmailPayload {
  email_to: string;
  subject: string;
  body: string;
}

const PAGE_SIZE = 100;

function getAssistantToken() {
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

function mapLead(lead: AssistantAssignedLeadItem): EmailLeadRecord {
  const submittedData = lead.submitted_data && typeof lead.submitted_data === "object" ? lead.submitted_data : {};
  const normalizedSubmittedData = Object.fromEntries(
    Object.entries(submittedData).map(([key, value]) => [key, String(value ?? "").trim()])
  ) as Record<string, string>;

  return {
    id: lead.id,
    displayName: getSubmittedValue(submittedData, ["name", "full name", "lead name", "customer name"]),
    email: getSubmittedValue(submittedData, ["email", "email address", "mail"]),
    submittedData: normalizedSubmittedData
  };
}

async function fetchAssistantLeadPage(page: number, size: number, token: string): Promise<AssistantAssignedLeadsResponse> {
  const response = await api.get<AssistantAssignedLeadsResponse>("/api/lead/assistant/leads", {
    params: { page, size },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
}

export async function getAllAssistantLeadsForEmail(): Promise<EmailLeadRecord[]> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const firstPage = await fetchAssistantLeadPage(1, PAGE_SIZE, token);
    const items = Array.isArray(firstPage.items) ? [...firstPage.items] : [];
    const totalPages = Math.max(firstPage.total_pages ?? 1, 1);

    if (totalPages > 1) {
      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) => fetchAssistantLeadPage(index + 2, PAGE_SIZE, token))
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

export async function sendAssistantCustomEmail(payload: SendCustomEmailPayload): Promise<unknown> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
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
