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
