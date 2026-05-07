import { CreateAssistantPayload, CreateAssistantResponse } from "@/types/assistants/user-management";
import { AdminProfileResponse } from "@/types/admin/admin-profile";
import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";

function getAdminToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token="))
    ?.split("=")[1];
  if (tokenFromCookie) {
    return decodeURIComponent(tokenFromCookie);
  }
  
  return null;
}

export async function createAssistant(payload: CreateAssistantPayload): Promise<CreateAssistantResponse> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const response = await api.post<CreateAssistantResponse>("/api/assistant/add", payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to create assistant"));
  }
}

export async function getAdminProfile(): Promise<AdminProfileResponse> {
  try {
    const response = await api.get<AdminProfileResponse>("/api/admin/me");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to fetch admin profile"));
  }
}

