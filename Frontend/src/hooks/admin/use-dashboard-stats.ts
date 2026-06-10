"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminLeadCounters } from "@/services/assistant/dashboard-service";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats", "admin", "lead-counters"],
    queryFn: getAdminLeadCounters
  });
}
