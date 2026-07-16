"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getMyActivityLogs } from "@/services/assistant/audit-log-service";
import { AuditLogFilters } from "@/types/audit/audit-log";

export function useMyActivity(page: number, pageSize: number, filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["my-activity", page, pageSize, filters],
    queryFn: () => getMyActivityLogs(page, pageSize, filters),
    placeholderData: keepPreviousData,
  });
}
