"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SectionPage } from "@/components/dashboard/section-page";

export default function AdminAllLogsPage() {
  return (
    <DashboardLayout role="admin">
      <SectionPage
        title="All Logs"
        description="Review system activity logs and recent actions across the dashboard."
      />
    </DashboardLayout>
  );
}
