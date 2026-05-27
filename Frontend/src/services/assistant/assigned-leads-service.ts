import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";
import { AssistantAssignedLeadsResponse } from "@/types/assistant/assigned-leads";

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

export async function getAssistantAssignedLeads(page: number, size: number): Promise<AssistantAssignedLeadsResponse> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.get<AssistantAssignedLeadsResponse>("/api/lead/assistant/leads", {
      params: { page, size },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load assigned leads."));
  }
}
