"use client";

import { useQuery } from "@tanstack/react-query";
import { getAssistantProfile } from "@/services/assistant/profile-service";

export function useAssistantProfile() {
  return useQuery({
    queryKey: ["assistant-profile"],
    queryFn: getAssistantProfile
  });
}
