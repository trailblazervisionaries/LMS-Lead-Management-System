"use client";

import { useQuery } from "@tanstack/react-query";
import { getAssistantFollowUps } from "@/services/assistant/follow-ups-service";
import type { AssistantFollowUpItem } from "@/types/assistant/follow-ups";

export function useAssistantFollowUps(startDate: string, endDate: string) {
  return useQuery<AssistantFollowUpItem[]>({
    queryKey: ["assistant-follow-ups", startDate, endDate],
    queryFn: () => getAssistantFollowUps(startDate, endDate),
    enabled: Boolean(startDate && endDate),
    placeholderData: (previousData) => previousData
  });
}
