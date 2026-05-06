import { CreateAssistantPayload, CreateAssistantResponse } from "@/features/admin/types/user-management";
import { AdminProfileResponse } from "@/features/admin/types/admin-profile";
import axios from "axios";
import api from "@/api/axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const USE_MOCK_USERS = process.env.NEXT_PUBLIC_USE_MOCK_USERS !== "false";

let mockAssistantCounter = 1000;

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
  if (USE_MOCK_USERS || !API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    mockAssistantCounter += 1;

    return {
      message: "Assistant created successfully",
      assistant: {
        id: String(mockAssistantCounter),
        ...payload
      }
    };
  }

  try {
    const response = await api.post<CreateAssistantResponse>("/users/assistants", payload);
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

