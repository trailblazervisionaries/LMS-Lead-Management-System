"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/services/assistant/dashboard-service";
import { UserRole } from "@/types/auth";

export function useDashboardStats(role: UserRole) {
  return useQuery({
    queryKey: ["dashboard-stats", role],
    queryFn: () => getDashboardStats(role)
  });
}
