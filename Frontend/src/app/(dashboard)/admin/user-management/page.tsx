"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SectionPage } from "@/components/dashboard/section-page";

export default function AdminUserManagementPage() {
  return (
    <DashboardLayout role="admin">
      <SectionPage
        title="User Management"
        description="Manage team users, permissions, and account access for administrators and assistants."
      />
    </DashboardLayout>
  );
}
