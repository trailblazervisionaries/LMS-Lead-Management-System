"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginSchemaValues } from "@/lib/validators/auth";
import { useLogin } from "@/features/auth/hooks/use-login";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<LoginSchemaValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = (values: LoginSchemaValues) => {
    loginMutation.mutate(values);
  };

  useEffect(() => {
    const email = searchParams.get("email");
    if (email) setValue("email", email);
  }, [searchParams, setValue]);

  return (
    <div className="w-full">

      {/* Brand mark */}
      <div className="mb-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-extrabold text-white shadow-lg">
          L
        </span>
      </div>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to your LeadOrbit workspace to continue.
        </p>
      </div>

      {/* Form */}
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-[11px] font-bold uppercase tracking-widest text-slate-400"
          >
            Email address
          </label>
          <div className="group relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-300 transition-colors duration-150 group-focus-within:text-violet-400">
              <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </span>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              className="pl-10"
              {...register("email")}
            />
          </div>
          {errors.email ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {errors.email.message}
            </p>
          ) : null}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-[11px] font-bold uppercase tracking-widest text-slate-400"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-violet-600 underline underline-offset-2 transition-colors hover:text-violet-800"
            >
              Forgot password?
            </Link>
          </div>
          <div className="group relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-300 transition-colors duration-150 group-focus-within:text-violet-400">
              <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-10 pr-11"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-300 transition-colors hover:text-violet-500"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {/* Server error */}
        {loginMutation.error ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <p className="text-sm font-medium text-red-700">
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : "Login failed. Please check your credentials."}
            </p>
          </div>
        ) : null}

        {/* Submit button */}
        <Button
          type="submit"
          disabled={loginMutation.isPending}
          className="relative h-11 w-full overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-md hover:from-violet-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-60"
        >
          {loginMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Signing in...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Sign in
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-8 space-y-5">
        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-100" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Secured by LeadOrbit
          </span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        {/* Trust badges — wrap on small screens */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            256-bit encrypted
          </div>
          <span className="hidden h-3.5 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            SOC 2 compliant
          </div>
          <span className="hidden h-3.5 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            99.9% uptime
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          Use your registered email and password to continue.
        </p>
      </div>
    </div>
  );
}
