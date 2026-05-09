"use client";

import { useMutation } from "@tanstack/react-query";
import { updateAssistant } from "@/services/admin/user-management-service";
import { CreateAssistantPayload } from "@/types/assistants/user-management";

interface UpdateAssistantInput {
  userId: string;
  payload: CreateAssistantPayload;
}

export function useUpdateAssistant() {
  return useMutation({
    mutationFn: ({ userId, payload }: UpdateAssistantInput) => updateAssistant(userId, payload)
  });
}
