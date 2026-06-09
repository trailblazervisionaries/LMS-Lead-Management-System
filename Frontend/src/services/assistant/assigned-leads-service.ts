import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";
import {
  AssistantAssignedLeadsResponse,
  AssistantLeadDetails,
  AssistantLeadHistoryItem,
  AssistantLeadRemarkDetails,
  AssistantLeadRemarkUpdatePayload,
  AssistantLeadStatusUpdatePayload
} from "@/types/assistant/assigned-leads";

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

export async function deleteAssistantAssignedLead(leadId: string): Promise<unknown> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.delete(`/api/lead/assistant/${encodeURIComponent(leadId)}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to delete assigned lead."));
  }
}

export async function getAssistantLeadDetails(leadId: string): Promise<AssistantLeadDetails> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.get<AssistantLeadDetails>(`/api/lead/fetch/${encodeURIComponent(leadId)}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load lead details."));
  }
}

export async function getAssistantLeadHistory(leadId: string): Promise<AssistantLeadHistoryItem[]> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.get<AssistantLeadHistoryItem[]>(`/api/lead/lead/${encodeURIComponent(leadId)}/history`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load lead history."));
  }
}

export async function updateAssistantLeadStatus(
  leadId: string,
  payload: AssistantLeadStatusUpdatePayload
): Promise<unknown> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.post(`/api/remark/assistant/leads/${encodeURIComponent(leadId)}/add`, payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update lead status."));
  }
}

export async function updateAssistantLeadRemark(
  leadId: string,
  remarkId: string,
  payload: AssistantLeadRemarkUpdatePayload
): Promise<unknown> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.put(
      `/api/remark/assistant/${encodeURIComponent(leadId)}/update/${encodeURIComponent(remarkId)}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update remark."));
  }
}

export async function getAssistantLeadRemarkDetails(leadId: string): Promise<AssistantLeadRemarkDetails> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.get<AssistantLeadRemarkDetails>(
      `/api/remark/assistant/leads/${encodeURIComponent(leadId)}/fetch`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load lead remarks."));
  }
}
