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

  const params: Record<string, string | number> = { page, page_size: pageSize };
  if (filters.entity_name) params.entity_name = filters.entity_name;
  if (filters.log_type) params.log_type = filters.log_type;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;

  try {
    const response = await api.get<AuditLogPaginatedResponse>("/api/audit/my-activity", {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to fetch activity logs"));
  }
}
