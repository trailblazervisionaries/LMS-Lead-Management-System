import { DashboardStat } from "@/types/dashboard";
import { UserRole } from "@/types/auth/auth";
import api from "@/api/axios";
import axios from "axios";
import { getApiErrorMessage } from "@/utils/api-error";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const ADMIN_STATS: DashboardStat[] = [
  { label: "Total Leads", value: 1280, trend: "+8.2% this month" },
  { label: "Converted Leads", value: 842, trend: "+4.1% this week" },
  { label: "Canceled Leads", value: 27, trend: "+1.6% vs last month" },
  { label: "Active Team Users", value: 24, trend: "+3 new this quarter" }
];

const ASSISTANT_STATS: DashboardStat[] = [
  { label: "My Assigned Leads", value: 73, trend: "+5 this week" },
  { label: "Follow-ups Due", value: 16, trend: "3 overdue tasks" },
  { label: "Converted Leads", value: 21, trend: "+2.3% this month" },
  { label: "Open Opportunities", value: 13, trend: "Value up 9.4%" }
];

interface LeadCountersResponse {
  total_created: number;
  total_assigned: number;
  total_contacted: number;
  total_interested: number;
  total_converted: number;
}

function getAssistantToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token=") || cookie.startsWith("auth="))
    ?.split("=")[1];

  if (!tokenFromCookie) {
    return null;
  }

  return decodeURIComponent(tokenFromCookie);
}

function mapLeadCountersToStats(counters: LeadCountersResponse): DashboardStat[] {
  return [
    { label: "Total Assigned", value: counters.total_assigned, trend: "Assigned leads" },
    { label: "Total Contacted", value: counters.total_contacted, trend: "Contacted leads" },
    { label: "Total Interested", value: counters.total_interested, trend: "Interested leads" },
    { label: "Total Converted", value: counters.total_converted, trend: "Converted leads" }
  ];
}

function mapAdminLeadCountersToStats(counters: LeadCountersResponse): DashboardStat[] {
  return [
    { label: "Total Created", value: counters.total_created, trend: "Created leads" },
    { label: "Total Assigned", value: counters.total_assigned, trend: "Assigned leads" },
    { label: "Total Contacted", value: counters.total_contacted, trend: "Contacted leads" },
    { label: "Total Interested", value: counters.total_interested, trend: "Interested leads" },
    { label: "Total Converted", value: counters.total_converted, trend: "Converted leads" }
  ];
}

export async function getAssistantLeadCounters(): Promise<DashboardStat[]> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Assistant authentication required. Please log in again.");
  }

  try {
    const response = await api.get<LeadCountersResponse>("/api/lead/lead-counters", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return mapLeadCountersToStats(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to fetch lead counters."));
  }
}

export async function getAdminLeadCounters(): Promise<DashboardStat[]> {
  const token = getAssistantToken();
  if (!token) {
    throw new Error("Admin authentication required. Please log in again.");
  }

  try {
    const response = await api.get<LeadCountersResponse>("/api/lead/lead-counters", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return mapAdminLeadCountersToStats(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to fetch lead counters."));
  }
}

export async function getDashboardStats(role: UserRole): Promise<DashboardStat[]> {
  if (!API_BASE_URL) {
    return role === "admin" ? ADMIN_STATS  : ASSISTANT_STATS;
  }

  try {
    const response = await api.get<DashboardStat[]>(`/dashboard/${role}/stats`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      if (responseData && typeof responseData === "object" && "message" in responseData) {
        const message = (responseData as { message?: unknown }).message;
        if (typeof message === "string") {
          throw new Error(message);
        }
      }
    }

    throw new Error("Unable to fetch dashboard stats");
  }
}
