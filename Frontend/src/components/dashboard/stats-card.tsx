import { Card } from "@/components/ui/card";

interface StatsCardProps {
  label: string;
  value: number;
  trend: string;
}

export function StatsCard({ label, value, trend }: StatsCardProps) {
  return (
    <Card>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-300">{trend}</p>
    </Card>
  );
}
