export interface AdminAddress {
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  province: string;
  country: string;
  postal_code: string;
}

export interface AdminProfileResponse {
  user_id: string;
  name: string;
  role: "admin" | "assistant";
  email: string;
  profile_image: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string | null;
  address: AdminAddress | null;
}

export interface UpdateAdminPayload {
  name: string;
  role: "admin";
  email: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  province: string;
  country: string;
  postal_code: string;
}

export interface UpdateAdminResponse {
  message?: string;
}

export interface UploadAdminImageResponse {
  message?: string;
  profile_image?: string;
}
