import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";
import { CreateMeetingPayload, UpdateMeetingPayload, MeetingRecord } from "@/types/assistant/meeting";

function getAssistantToken() {
  if (typeof document === "undefined") return null;
  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token=") || cookie.startsWith("auth="))
    ?.split("=")[1];
  if (!tokenFromCookie) return null;
  return decodeURIComponent(tokenFromCookie);
}

function authHeaders() {
  const token = getAssistantToken();
  if (!token) throw new Error("Assistant authentication required. Please log in again.");
  return { Authorization: `Bearer ${token}` };
}

export async function getMeetingByLead(leadId: string): Promise<MeetingRecord | null> {
  try {
    const response = await api.get<MeetingRecord>(`/api/meet/get-meeting/${encodeURIComponent(leadId)}`, {
      headers: authHeaders(),
    });
    return response.data ?? null;
  } catch {
    // Return null for 404 (no meeting) and 500 (backend method missing) alike —
    // both should show the empty state, not an error banner.
    return null;
  }
}

export async function createMeeting(payload: CreateMeetingPayload): Promise<MeetingRecord> {
  try {
    const response = await api.post<MeetingRecord>("/api/meet/create-meeting", payload, {
      headers: authHeaders(),
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to schedule meeting."));
  }
}

export async function updateMeeting(meetingId: string, payload: UpdateMeetingPayload): Promise<MeetingRecord> {
  try {
    const response = await api.put<MeetingRecord>(
      `/api/meet/update-meeting/${encodeURIComponent(meetingId)}`,
      payload,
      { headers: authHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update meeting."));
  }
}

export async function deleteMeeting(meetingId: string): Promise<{ message?: string }> {
  try {
    const response = await api.delete<{ message?: string }>(
      `/api/meet/delete-meeting/${encodeURIComponent(meetingId)}`,
      { headers: authHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to cancel meeting."));
  }
}
