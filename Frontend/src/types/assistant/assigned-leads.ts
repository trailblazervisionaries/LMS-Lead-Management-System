export interface AssistantAssignedLeadItem {
  id: string;
  template_id?: string;
  admin_id?: string;
  submitted_data?: Record<string, unknown> | null;
  created_at?: string | null;
  status?: string | null;
  assigned_assistant?: string | null;
}

export interface AssistantAssignedLeadsResponse {
  items: AssistantAssignedLeadItem[];
  total_count: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface AssistantAssignedLeadRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  assignedAssistant: string;
  createdAt: string;
}

export interface AssistantLeadDetails {
  id: string;
  template_id?: string | null;
  admin_id?: string | null;
  submitted_data?: Record<string, unknown> | null;
  created_at?: string | null;
  status?: string | null;
  updated_at?: string | null;
  assigned_assistant?: unknown;
}

export interface AssistantLeadHistoryItem {
  id: string;
  lead_id: string;
  status: string | null;
  changed_by: string | null;
  created_at: string | null;
}

export interface AssistantLeadStatusUpdatePayload {
  status: string;
  remarks: string;
  next_follow_up_date: string;
  is_completed: boolean;
}

export interface AssistantLeadRemarkUpdatePayload {
  remarks: string;
  is_completed: boolean;
}

export interface AssistantLeadRemarkStatusHistoryItem {
  id: string;
  lead_id: string;
  status: string | null;
  changed_by: string | null;
  is_deleted: boolean;
  created_at: string | null;
}

export interface AssistantLeadRemarkItem {
  id: string;
  for_lead: string;
  remarks: string | null;
  next_follow_up_date: string | null;
  is_completed: boolean;
  is_deleted: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AssistantLeadRemarkDetails {
  lead_id: string;
  status_history: AssistantLeadRemarkStatusHistoryItem[];
  remarks: AssistantLeadRemarkItem[];
}
