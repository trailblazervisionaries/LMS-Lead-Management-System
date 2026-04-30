"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SectionPage } from "@/components/dashboard/section-page";

export default function AdminAssignedLeadsPage() {
  return (
    <DashboardLayout role="admin">
      <SectionPage
        title="Assigned Leads"
        description="View and manage leads that are currently assigned to users for active follow-up."
      />
    </DashboardLayout>
  );
}
