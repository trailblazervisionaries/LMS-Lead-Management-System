import { CreateAssistantPayload, CreateAssistantResponse } from "@/types/user-management";

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

  const response = await fetch(`${API_BASE_URL}/users/assistants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? "Unable to create assistant");
  }

  return response.json();
}
