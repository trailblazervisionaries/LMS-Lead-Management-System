"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminProfile } from "@/features/admin/services/user-management-service";

export function useAdminProfile() {
  return useQuery({
    queryKey: ["admin-profile"],
    queryFn: getAdminProfile
  });
}

