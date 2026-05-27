export interface AssistantProfileAddress {
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  postal_code: string | null;
}

export interface AssistantProfileResponse {
  user_id: string;
  name: string;
  role: "assistant";
  email: string;
  profile_image: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  admin_id: string;
  updated_at: string | null;
  address: AssistantProfileAddress | null;
}

export interface UpdateAssistantProfilePayload {
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

export interface UpdateAssistantProfileResponse {
  message?: string;
}
