import { PropsWithChildren } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AdminLayout({ children }: PropsWithChildren) {
  return <DashboardLayout role="admin">{children}</DashboardLayout>;
}
