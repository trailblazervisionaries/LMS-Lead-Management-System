import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";
import { AuditLogPaginatedResponse, AuditLogFilters } from "@/types/audit/audit-log";

function getAssistantToken() {
  if (typeof document === "undefined") return null;
  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token="))
    ?.split("=")[1];
  return tokenFromCookie ? decodeURIComponent(tokenFromCookie) : null;
}

export async function getMyActivityLogs(
  page: number,
  pageSize: number,
  filters: AuditLogFilters = {}
): Promise<AuditLogPaginatedResponse> {
  const token = getAssistantToken();
  if (!token) throw new Error("Authentication required. Please log in again.");

  try {
    const response = await api.get<AuditLogPaginatedResponse>("/api/audit/my-activity", {
      params: {
        page,
        page_size: pageSize,
        entity_name: filters.entity_name || undefined,
        log_type: filters.log_type || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to fetch activity logs"));
  }
}
