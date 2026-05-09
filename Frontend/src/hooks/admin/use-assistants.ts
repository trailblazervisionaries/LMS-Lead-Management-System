"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAssistants } from "@/services/admin/user-management-service";

export function useAssistants(page: number, size: number) {
  return useQuery({
    queryKey: ["assistants", page, size],
    queryFn: () => getAssistants(page, size),
    placeholderData: keepPreviousData
  });
}
