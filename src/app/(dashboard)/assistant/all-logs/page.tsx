"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SectionPage } from "@/components/dashboard/section-page";

export default function AssistantAllLogsPage() {
  return (
    <DashboardLayout role="assistant">
      <SectionPage
        title="All Logs"
        description="Review operational logs and recent lead workflow updates."
      />
    </DashboardLayout>
  );
}
