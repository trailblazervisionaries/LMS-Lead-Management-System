"use client";

import { useQuery } from "@tanstack/react-query";
import { getAssistantLeadCounters } from "@/services/assistant/dashboard-service";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats", "assistant", "lead-counters"],
    queryFn: getAssistantLeadCounters
  });
}
