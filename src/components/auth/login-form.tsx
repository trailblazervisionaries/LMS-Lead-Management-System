"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginSchemaValues } from "@/lib/validators/auth";
import { useLogin } from "@/hooks/use-login";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = (values: LoginSchemaValues) => {
    loginMutation.mutate(values);
  };

  useEffect(() => {
    const email = searchParams.get("email");
    if (email) {
      setValue("email", email);
    }
  }, [searchParams, setValue]);

  return (
    <Card className="w-full max-w-md rounded-2xl border-slate-200/80 p-6 shadow-soft md:p-8 dark:border-slate-800">
      <div className="mb-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
            L
          </span>
          Lead Management
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Sign in</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Access your lead management workspace.</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
            Email
          </label>
          <Input id="email" type="email" autoComplete="email" placeholder="name@company.com" {...register("email")} />
          {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">
              Forgot password?
            </Link>
          </div>
         
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-10"
              {...register("password")}
            />
            
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 1 0 2.8 2.8" />
                  <path d="M9.9 4.2A10 10 0 0 1 21 12a10.3 10.3 0 0 1-3.2 4.7" />
                  <path d="M6.1 6.1A10.8 10.8 0 0 0 3 12a10 10 0 0 0 14 7.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2.1 12a10.7 10.7 0 0 1 19.8 0 10.7 10.7 0 0 1-19.8 0z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password ? <p className="text-xs text-red-600">{errors.password.message}</p> : null}
        </div>

        {loginMutation.error ? (
          <p className="text-sm text-red-600">{loginMutation.error instanceof Error ? loginMutation.error.message : "Login failed"}</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
        Use your registered email and password to continue.
      </p>
    </Card>
  );
}
