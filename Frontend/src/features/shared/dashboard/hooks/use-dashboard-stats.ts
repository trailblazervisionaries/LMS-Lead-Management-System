"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/features/shared/dashboard/services/dashboard-service";
import { UserRole } from "@/features/auth/types/auth";

export function useDashboardStats(role: UserRole) {
  return useQuery({
    queryKey: ["dashboard-stats", role],
    queryFn: () => getDashboardStats(role)
  });
}

