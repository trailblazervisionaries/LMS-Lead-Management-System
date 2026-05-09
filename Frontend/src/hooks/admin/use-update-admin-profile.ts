"use client";

import { useMutation } from "@tanstack/react-query";
import { updateAdminProfile } from "@/services/admin/user-management-service";
import { UpdateAdminPayload } from "@/types/admin/admin-profile";

export function useUpdateAdminProfile() {
  return useMutation({
    mutationFn: (payload: UpdateAdminPayload) => updateAdminProfile(payload)
  });
}
