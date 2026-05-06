import { CreateAssistantPayload, CreateAssistantResponse } from "@/types/user-management";
import { AdminProfileResponse } from "@/types/admin-profile";
import axios from "axios";
import api from "@/api/axios";

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

function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === "string") {
      return responseData;
    }
    if (responseData && typeof responseData === "object" && "message" in responseData) {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === "string") {
        return message;
      }
    }
    if (responseData && typeof responseData === "object" && "detail" in responseData) {
      const detail = (responseData as { detail?: unknown }).detail;
      if (typeof detail === "string") {
        return detail;
      }
    }
  }

  return fallbackMessage;
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
