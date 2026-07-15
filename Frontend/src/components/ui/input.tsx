import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all duration-150",
          "shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(0,0,0,0.04)]",
          "placeholder:text-slate-400",
          "hover:border-slate-300 hover:shadow-[0_1px_4px_rgba(0,0,0,0.09)]",
          "focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08),0_1px_3px_rgba(0,0,0,0.06)]",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
          "dark:hover:border-slate-600",
          "dark:focus:border-violet-500 dark:focus:ring-violet-500/15",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
