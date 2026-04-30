"use client";

import type { DashboardStat } from "@/types/dashboard";
import { StatsCard } from "@/components/dashboard/stats-card";

interface DashboardContainerProps {
  title: string;
  description: string;
  stats: DashboardStat[];
}

export function DashboardContainer({ title, description, stats }: DashboardContainerProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatsCard key={item.label} label={item.label} value={item.value} trend={item.trend} />
        ))}
      </div>
    </section>
  );
}
