"use client";

import { useMutation } from "@tanstack/react-query";
import { deleteAssistant } from "@/services/admin/user-management-service";

export function useDeleteAssistant() {
  return useMutation({
    mutationFn: (userId: string) => deleteAssistant(userId)
  });
}
