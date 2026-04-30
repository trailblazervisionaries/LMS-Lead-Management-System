"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SectionPage } from "@/components/dashboard/section-page";

export default function AssistantAssignedLeadsPage() {
  return (
    <DashboardLayout role="assistant">
      <SectionPage
        title="Assigned Leads"
        description="See all assigned leads and follow up quickly based on current task ownership."
      />
    </DashboardLayout>
  );
}
