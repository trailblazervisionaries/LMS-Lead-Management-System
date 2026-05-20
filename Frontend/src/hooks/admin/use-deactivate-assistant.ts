"use client";

import { useMutation } from "@tanstack/react-query";
import { deactivateAssistant } from "@/services/admin/user-management-service";

export function useDeactivateAssistant() {
  return useMutation({
    mutationFn: (userId: string) => deactivateAssistant(userId)
  });
}
