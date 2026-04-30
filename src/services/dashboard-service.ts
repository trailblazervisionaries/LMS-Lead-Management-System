import { DashboardStat } from "@/types/dashboard";
import { UserRole } from "@/types/auth";

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

export async function getDashboardStats(role: UserRole): Promise<DashboardStat[]> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return role === "admin" ? ADMIN_STATS : ASSISTANT_STATS;
  }

  const response = await fetch(`${API_BASE_URL}/dashboard/${role}/stats`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to fetch dashboard stats");
  }

  return response.json();
}
