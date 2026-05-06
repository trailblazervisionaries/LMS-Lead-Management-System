import { PropsWithChildren } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AssistantLayout({ children }: PropsWithChildren) {
  return <DashboardLayout role="assistant">{children}</DashboardLayout>;
}
