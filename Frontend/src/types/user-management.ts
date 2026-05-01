import { UserRole } from "@/types/auth";

export interface CreateAssistantPayload {
  name: string;
  role: "assistant";
  email: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  province: string;
  country: string;
  postal_code: string;
}

export interface AssistantUser extends CreateAssistantPayload {
  id: string;
  role: Extract<UserRole, "assistant">;
}

export interface CreateAssistantResponse {
  message: string;
  assistant: AssistantUser;
}
