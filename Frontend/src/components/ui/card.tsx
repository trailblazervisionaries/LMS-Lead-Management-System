import { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends PropsWithChildren {
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-950",
        className
      )}
    >
      {children}
    </div>
  );
}
