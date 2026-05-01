"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SectionPage } from "@/components/dashboard/section-page";

export default function AdminLeadFormsPage() {
  return (
    <DashboardLayout role="admin">
      <SectionPage
        title="Lead Forms"
        description="Create, review, and manage lead capture forms used across your campaigns and channels."
      />
    </DashboardLayout>
  );
}
