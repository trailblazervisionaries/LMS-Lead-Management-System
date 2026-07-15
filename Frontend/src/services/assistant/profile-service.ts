import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";
import {
  AssistantProfileResponse,
  UpdateAssistantProfilePayload,
  UpdateAssistantProfileResponse
} from "@/types/assistant/assistant-profile";

interface UploadAssistantImageResponse {
  profile_image: string;
}

function getAssistantToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token="))
    ?.split("=")[1];

  if (!tokenFromCookie) {
    return null;
  }

  return decodeURIComponent(tokenFromCookie);
}

export async function getAssistantProfile(): Promise<AssistantProfileResponse> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.get<AssistantProfileResponse>("/api/assistant/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to fetch assistant profile"));
  }
}

export async function updateAssistantProfile(
  userId: string,
  payload: UpdateAssistantProfilePayload
): Promise<UpdateAssistantProfileResponse> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.put<UpdateAssistantProfileResponse>(`/api/assistant/update/${userId}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update assistant profile"));
  }
}

export async function uploadAssistantImage(file: File): Promise<UploadAssistantImageResponse> {
  const token = getAssistantToken();
  if (!token) throw new Error("Assistant authentication required. Please log in again.");
  const formData = new FormData();
  formData.append("file", file, file.name);
  try {
    const response = await api.put<UploadAssistantImageResponse>("/api/assistant/upload-image", formData, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": undefined }
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to upload profile image"));
  }
}
