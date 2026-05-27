"use client";

import { useQuery } from "@tanstack/react-query";
import type { AssistantAssignedLeadsResponse } from "@/types/assistant/assigned-leads";
import { getAssistantAssignedLeads } from "@/services/assistant/assigned-leads-service";

export function useAssistantAssignedLeads(page: number, size: number) {
  return useQuery<AssistantAssignedLeadsResponse>({
    queryKey: ["assistant-assigned-leads", page, size],
    queryFn: () => getAssistantAssignedLeads(page, size),
    placeholderData: (previousData) => previousData
  });
}
