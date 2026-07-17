import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";
import { AuditLogItem, AuditLogPaginatedResponse, AuditLogFilters } from "@/types/audit/audit-log";

function getAdminToken() {
  if (typeof document === "undefined") return null;
  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token="))
    ?.split("=")[1];
  return tokenFromCookie ? decodeURIComponent(tokenFromCookie) : null;
}

export async function getAdminAuditLogs(
  page: number,
  pageSize: number,
  filters: AuditLogFilters = {}
): Promise<AuditLogPaginatedResponse> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin authentication required. Please log in again.");

  const params: Record<string, string | number> = { page, page_size: pageSize };
  if (filters.entity_name) params.entity_name = filters.entity_name;
  if (filters.log_type) params.log_type = filters.log_type;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;

  try {
    const response = await api.get<AuditLogPaginatedResponse>("/api/audit/admin/logs", {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to fetch audit logs"));
  }
}

export async function getEntityAuditLogs(entityId: string): Promise<AuditLogItem[]> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin authentication required. Please log in again.");

  try {
    const response = await api.get<AuditLogItem[]>(`/api/audit/admin/entity/${entityId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to fetch entity audit logs"));
  }
}
