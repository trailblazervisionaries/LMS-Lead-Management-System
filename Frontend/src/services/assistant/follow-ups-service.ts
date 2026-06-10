import api from "@/api/axios";
import type { AssistantFollowUpItem } from "@/types/assistant/follow-ups";
import { getApiErrorMessage } from "@/utils/api-error";

function getAssistantToken() {
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

function normalizeFollowUpsResponse(data: unknown): AssistantFollowUpItem[] {
  if (Array.isArray(data)) {
    return data as AssistantFollowUpItem[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const response = data as Record<string, unknown>;
  const followUps =
    response.items ?? response.followups ?? response.follow_ups ?? response.data ?? response.results ?? [];

  return Array.isArray(followUps) ? (followUps as AssistantFollowUpItem[]) : [];
}

export async function getAssistantFollowUps(startDate: string, endDate: string): Promise<AssistantFollowUpItem[]> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.get<unknown>(
      `/api/remark/assistant/followups/${encodeURIComponent(startDate)}/${encodeURIComponent(endDate)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return normalizeFollowUpsResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load follow-ups."));
  }
}
