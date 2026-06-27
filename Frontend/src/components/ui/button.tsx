"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = {
  primary:
    "bg-brand-600 text-white shadow-soft hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400",
  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

