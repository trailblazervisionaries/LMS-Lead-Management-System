export interface CreateMeetingPayload {
  lead_id: string;
  topic: string;
  start_time: string;
  duration_minutes: number;
  recipient_email: string;
}

export interface UpdateMeetingPayload {
  topic: string;
  start_time: string;
  duration_minutes: number;
}

export interface MeetingRecord {
  id: string;
  meeting_id?: string | number;
  lead_id?: string;
  topic: string;
  start_time: string;
  duration_minutes?: number;
  duration?: number;
  join_url?: string;
  status?: string;
  agenda?: string | null;
  recipient_email?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MeetingApiResponse {
  message?: string;
  data?: MeetingRecord;
}
