import {
  ActivateAssistantResponse,
  AssistantListResponse,
  CreateAssistantPayload,
  CreateAssistantResponse,
  DeactivateAssistantResponse,
  DeleteAssistantResponse,
  UpdateAssistantResponse
} from "@/types/assistants/user-management";
import { AdminProfileResponse, UpdateAdminPayload, UpdateAdminResponse } from "@/types/admin/admin-profile";
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
    const response = await api.post<CreateAssistantResponse>("/api/admin/add", payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to create assistant"));
  }
}

export async function getAssistants(page: number, size: number): Promise<AssistantListResponse> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const response = await api.get<AssistantListResponse>("/api/assistant/all", {
      params: { page, size },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to fetch assistants"));
  }
}

export async function updateAssistant(
  userId: string,
  payload: CreateAssistantPayload
): Promise<UpdateAssistantResponse> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const response = await api.put<UpdateAssistantResponse>(`/api/admin/update/${userId}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update assistant"));
  }
}

export async function deleteAssistant(userId: string): Promise<DeleteAssistantResponse> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const response = await api.delete<DeleteAssistantResponse>(`/api/admin/delete/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to delete assistant"));
  }
}

export async function activateAssistant(userId: string): Promise<ActivateAssistantResponse> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const response = await api.post<ActivateAssistantResponse>(`/api/admin/activate/${userId}`, null, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to activate assistant"));
  }
}

export async function deactivateAssistant(userId: string): Promise<DeactivateAssistantResponse> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const response = await api.post<DeactivateAssistantResponse>(`/api/admin/deactivate/${userId}`, null, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to deactivate assistant"));
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

export async function updateAdminProfile(payload: UpdateAdminPayload): Promise<UpdateAdminResponse> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const response = await api.put<UpdateAdminResponse>("/api/admin/update", payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update admin profile"));
  }
}

