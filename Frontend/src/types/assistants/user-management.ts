import { UserRole } from "@/types/auth/auth";

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

export interface AssistantAddress {
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

export interface UpdateAssistantResponse {
  message: string;
}

export interface DeleteAssistantResponse {
  message: string;
}

export interface ActivateAssistantResponse {
  message: string;
}

export interface DeactivateAssistantResponse {
  message: string;
}

export interface AssistantListItem {
  user_id: string;
  name: string;
  role: Extract<UserRole, "assistant">;
  email: string;
  profile_image: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string | null;
  address: AssistantAddress | null;
}

export interface AssistantListResponse {
  items: AssistantListItem[];
  total_count: number;
  page: number;
  size: number;
  total_pages: number;
}
