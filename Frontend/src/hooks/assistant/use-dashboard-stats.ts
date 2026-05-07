"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/services/assistant/dashboard-service";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats", "assistant"],
    queryFn: () => getDashboardStats("assistant")
  });
}
