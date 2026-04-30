"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SectionPage } from "@/components/dashboard/section-page";

export default function AdminProfilePage() {
  return (
    <DashboardLayout role="admin">
      <SectionPage
        title="Profile"
        description="View and manage profile details, contact information, and account preferences."
      />
    </DashboardLayout>
  );
}
