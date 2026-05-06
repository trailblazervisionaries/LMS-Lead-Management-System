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
  const [rememberMe, setRememberMe] = useState(true);
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
    <div className="w-full max-w-[460px]">
      <div className="mb-8 space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-700 dark:text-slate-100 sm:text-4xl">Welcome to LeadOrbit!</h1>
        <p className="text-lg leading-relaxed text-slate-500 dark:text-slate-400 sm:text-2xl sm:leading-tight">
          Please sign-in to your account and start the adventure
        </p>
      </div>
   
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <label className="block text-xl font-semibold text-slate-600 dark:text-slate-200 sm:text-2xl" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@lms.com"
            className="h-14 rounded-2xl border-slate-300 bg-slate-200 px-5 text-xl text-slate-900 shadow-none placeholder:text-slate-500 focus:border-brand-500 focus:ring-brand-200 sm:h-16 sm:rounded-3xl sm:px-7 sm:text-2xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-brand-900"
            {...register("email")}
          />
          {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="block text-xl font-semibold text-slate-600 dark:text-slate-200 sm:text-2xl" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="********"
              className="h-14 rounded-2xl border-slate-300 bg-slate-200 px-5 pr-14 text-xl text-slate-900 shadow-none placeholder:text-slate-500 focus:border-brand-500 focus:ring-brand-200 sm:h-16 sm:rounded-3xl sm:px-7 sm:pr-20 sm:text-2xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-brand-900"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2 inline-flex w-12 items-center justify-center text-slate-500 transition-colors hover:text-slate-700 sm:right-3 sm:w-14 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 1 0 2.8 2.8" />
                  <path d="M9.9 4.2A10 10 0 0 1 21 12a10.3 10.3 0 0 1-3.2 4.7" />
                  <path d="M6.1 6.1A10.8 10.8 0 0 0 3 12a10 10 0 0 0 14 7.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2.1 12a10.7 10.7 0 0 1 19.8 0 10.7 10.7 0 0 1-19.8 0z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password ? <p className="text-sm text-red-600">{errors.password.message}</p> : null}
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2.5 text-base font-medium text-slate-700 sm:text-[1.15rem] dark:text-slate-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-5 w-5 rounded-md border-slate-300 text-brand-600 accent-brand-600 sm:h-7 sm:w-7"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-base font-semibold text-brand-500 hover:underline sm:text-[1.15rem] dark:text-brand-300">
            Forgot password?
          </Link>
        </div>
        {loginMutation.error ? (
          <p className="text-base text-red-600">{loginMutation.error instanceof Error ? loginMutation.error.message : "Login failed"}</p>
        ) : null}
        <Button
          type="submit"
          className="h-14 w-half  bg-gradient-to-r from-brand-500 to-[#8b5cf6] text-m font-semibold text-white shadow-[0_14px_30px_rgba(124,58,237,0.35)] transition hover:brightness-105 sm:h-20 sm:rounded-3xl sm:text-2xl dark:from-brand-500 dark:to-[#8b5cf6]"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? "Logging in..." : "Log In"}
        </Button>
      </form>
  
    </div>
  );
}

