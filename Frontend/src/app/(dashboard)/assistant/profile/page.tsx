"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SectionPage } from "@/components/dashboard/section-page";

export default function AssistantProfilePage() {
  return (
    <DashboardLayout role="assistant">
      <SectionPage
        title="Profile"
        description="Manage your assistant profile information and account preferences."
      />
    </DashboardLayout>
  );
}
