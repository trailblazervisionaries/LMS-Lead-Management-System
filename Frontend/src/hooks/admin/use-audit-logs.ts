"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAdminAuditLogs } from "@/services/admin/audit-log-service";
import { AuditLogFilters } from "@/types/audit/audit-log";

export function useAdminAuditLogs(page: number, pageSize: number, filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["admin-audit-logs", page, pageSize, filters],
    queryFn: () => getAdminAuditLogs(page, pageSize, filters),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}
