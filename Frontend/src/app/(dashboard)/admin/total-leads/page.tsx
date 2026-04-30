"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SectionPage } from "@/components/dashboard/section-page";

export default function AdminTotalLeadsPage() {
  return (
    <DashboardLayout role="admin">
      <SectionPage
        title="Total Leads"
        description="Track all incoming leads across sources and monitor overall lead volume trends."
      />
    </DashboardLayout>
  );
}
