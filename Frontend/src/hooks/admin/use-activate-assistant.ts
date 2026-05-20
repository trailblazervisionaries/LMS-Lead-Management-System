"use client";

import { useMutation } from "@tanstack/react-query";
import { activateAssistant } from "@/services/admin/user-management-service";

export function useActivateAssistant() {
  return useMutation({
    mutationFn: (userId: string) => activateAssistant(userId)
  });
}
