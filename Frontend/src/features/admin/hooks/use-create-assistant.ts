"use client";

import { useMutation } from "@tanstack/react-query";
import { createAssistant } from "@/features/admin/services/user-management-service";
import { CreateAssistantPayload } from "@/features/admin/types/user-management";

export function useCreateAssistant() {
  return useMutation({
    mutationFn: (payload: CreateAssistantPayload) => createAssistant(payload)
  });
}

