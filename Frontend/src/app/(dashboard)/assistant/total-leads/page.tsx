"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SectionPage } from "@/components/dashboard/section-page";

export default function AssistantTotalLeadsPage() {
  return (
    <DashboardLayout role="assistant">
      <SectionPage
        title="Total Leads"
        description="Review total lead volume and keep daily tracking aligned with assistant operations."
      />
    </DashboardLayout>
  );
}
