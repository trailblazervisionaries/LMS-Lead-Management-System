"use client";

import { Card } from "@/components/ui/card";

interface SectionPageProps {
  title: string;
  description: string;
}

export function SectionPage({ title, description }: SectionPageProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <Card className="rounded-2xl">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This page is ready. You can now add full {title.toLowerCase()} content here.
        </p>
      </Card>
    </section>
  );
}


