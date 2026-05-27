"use client";

import { useMutation } from "@tanstack/react-query";
import { updateAssistantProfile } from "@/services/assistant/profile-service";
import { UpdateAssistantProfilePayload } from "@/types/assistant/assistant-profile";

interface UpdateAssistantProfileInput {
  userId: string;
  payload: UpdateAssistantProfilePayload;
}

export function useUpdateAssistantProfile() {
  return useMutation({
    mutationFn: ({ userId, payload }: UpdateAssistantProfileInput) => updateAssistantProfile(userId, payload)
  });
}
