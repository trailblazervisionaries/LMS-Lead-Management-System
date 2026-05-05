import { CreateAssistantPayload, CreateAssistantResponse } from "@/types/user-management";
import axios from "axios";
import api from "@/api/axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const USE_MOCK_USERS = process.env.NEXT_PUBLIC_USE_MOCK_USERS !== "false";

let mockAssistantCounter = 1000;

export async function createAssistant(payload: CreateAssistantPayload): Promise<CreateAssistantResponse> {
  if (USE_MOCK_USERS || !API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    mockAssistantCounter += 1;

    return {
      message: "Assistant created successfully",
      assistant: {
        id: String(mockAssistantCounter),
        role: "assistant",
        ...payload
      }
    };
  }

  try {
    const response = await api.post<CreateAssistantResponse>("/users/assistants", payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      if (typeof responseData === "string") {
        throw new Error(responseData);
      }
      if (responseData && typeof responseData === "object" && "message" in responseData) {
        const message = (responseData as { message?: unknown }).message;
        if (typeof message === "string") {
          throw new Error(message);
        }
      }
    }

    throw new Error("Unable to create assistant");
  }
}
