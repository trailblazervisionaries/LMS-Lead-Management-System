export interface AuditLogItem {
  id: string;
  entity_name: string;
  entity_id: string;
  log_type: string;
  performed_by: string;
  performed_by_name: string;
  performed_by_role: string;
  description: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogPaginatedResponse {
  items: AuditLogItem[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLogFilters {
  entity_name?: string;
  log_type?: string;
  from_date?: string;
  to_date?: string;
}
