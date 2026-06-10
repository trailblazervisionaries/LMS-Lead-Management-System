export interface AssistantFollowUpItem {
  id: string;
  for_lead?: string | null;
  lead_id?: string | null;
  remarks?: string | null;
  next_follow_up_date?: string | null;
  is_completed?: boolean;
  is_deleted?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}
