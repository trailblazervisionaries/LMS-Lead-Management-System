import axios from "axios";
import { getApiErrorMessage } from "@/utils/api-error";
import { AssistantLeadAddResponse, AssistantLeadUploadResponse, FormTemplateItem } from "@/types/assistant/lead-management";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

export async function getAssistantLeadTemplates(adminId: string): Promise<FormTemplateItem[]> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  if (!adminId.trim()) {
    throw new Error("Unable to identify admin id for lead templates.");
  }

  try {
    const response = await axios.get<FormTemplateItem[]>(`${API_BASE_URL}/api/form/templates/${encodeURIComponent(adminId)}`, {
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load lead form templates."));
  }
}

export async function addAssistantLead(templateId: string, submittedData: Record<string, string>): Promise<AssistantLeadAddResponse> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  const formData = new FormData();
  formData.append("template_id", templateId);
  formData.append("collected_from", "assistant");
  formData.append("submitted_data", JSON.stringify(submittedData));

  try {
    const response = await axios.post<AssistantLeadAddResponse>(`${API_BASE_URL}/api/lead/add`, formData, {
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to add lead."));
  }
}

export async function uploadAssistantLeads(templateId: string, adminId: string, file: File): Promise<AssistantLeadUploadResponse> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  if (!templateId.trim()) {
    throw new Error("Lead form template not found or inactive. Please activate a template and try again.");
  }

  if (!adminId.trim()) {
    throw new Error("Unable to identify admin id for lead upload.");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  try {
    const response = await axios.post<AssistantLeadUploadResponse>(
      `${API_BASE_URL}/api/lead/upload/${encodeURIComponent(templateId)}/${encodeURIComponent(adminId)}`,
      formData,
      {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to upload this file."));
  }
}
