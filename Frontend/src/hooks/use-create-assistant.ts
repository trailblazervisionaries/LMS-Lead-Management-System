"use client";

import { useMutation } from "@tanstack/react-query";
import { createAssistant } from "@/services/user-management-service";
import { CreateAssistantPayload } from "@/types/user-management";

export function useCreateAssistant() {
  return useMutation({
    mutationFn: (payload: CreateAssistantPayload) => createAssistant(payload)
  });
}
