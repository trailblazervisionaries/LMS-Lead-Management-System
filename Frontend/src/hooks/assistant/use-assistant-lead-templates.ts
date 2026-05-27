"use client";

import { useQuery } from "@tanstack/react-query";
import { getAssistantLeadTemplates } from "@/services/assistant/lead-service";

export function useAssistantLeadTemplates(adminId: string) {
  return useQuery({
    queryKey: ["assistant-lead-templates", adminId],
    queryFn: () => getAssistantLeadTemplates(adminId),
    enabled: Boolean(adminId)
  });
}
