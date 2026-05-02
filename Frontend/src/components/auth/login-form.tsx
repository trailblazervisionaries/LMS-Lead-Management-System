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
    <div className="w-full max-w-[520px] px-1 sm:px-2">
      <div className="mb-8 space-y-2">
        <h1 className="text-[clamp(1.25rem,2vw,2.2rem)] font-semibold leading-tight tracking-tight text-slate-600">Welcome to LeadOrbit!</h1>
        <p className="text-[clamp(0.95rem,1.08vw,1.25rem)] leading-relaxed text-slate-400">Please sign-in to your account and start the adventure</p>
      </div>

  

      <form className="space-y-3 md:space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <div className="relative rounded-xl border border-slate-300 bg-white px-3 pb-2 pt-3">
            <label
              className="absolute -top-2.5 left-3 bg-white px-2 text-[clamp(0.88rem,0.88vw,1rem)] font-medium text-slate-500"
              htmlFor="email"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@leadorbit.com"
              className="h-[clamp(2.2rem,2.5vw,2.8rem)] border-0 bg-transparent px-0 text-[clamp(0.95rem,0.98vw,1.12rem)] text-slate-700 shadow-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:!bg-transparent dark:!text-slate-700 dark:!placeholder:text-slate-400"
              {...register("email")}
            />
          </div>
          {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <div className="relative rounded-xl border border-slate-300 bg-white px-3 pb-2 pt-3">
            <label
              className="absolute -top-2.5 left-3 bg-white px-2 text-[clamp(0.88rem,0.88vw,1rem)] font-medium text-slate-500"
              htmlFor="password"
            >
              Password
            </label>

            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="*****"
              className="h-[clamp(2.2rem,2.5vw,2.8rem)] border-0 bg-transparent px-0 pr-10 text-[clamp(0.95rem,0.98vw,1.12rem)] text-slate-700 shadow-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:!bg-transparent dark:!text-slate-700 dark:!placeholder:text-slate-400"
              {...register("password")}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-1.5 inline-flex w-10 items-center justify-center text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 1 0 2.8 2.8" />
                  <path d="M9.9 4.2A10 10 0 0 1 21 12a10.3 10.3 0 0 1-3.2 4.7" />
                  <path d="M6.1 6.1A10.8 10.8 0 0 0 3 12a10 10 0 0 0 14 7.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2.1 12a10.7 10.7 0 0 1 19.8 0 10.7 10.7 0 0 1-19.8 0z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password ? <p className="text-sm text-red-600">{errors.password.message}</p> : null}
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2.5 text-[clamp(0.92rem,0.9vw,1.08rem)] text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-violet-500 accent-violet-500 sm:h-6 sm:w-6"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-[clamp(0.92rem,0.9vw,1.08rem)] font-medium text-violet-500 hover:underline">
            Forgot password?
          </Link>
        </div>

        {loginMutation.error ? (
          <p className="text-base text-red-600">{loginMutation.error instanceof Error ? loginMutation.error.message : "Login failed"}</p>
        ) : null}

        <Button
          type="submit"
          className="h-[clamp(3rem,3.2vw,4rem)] w-full rounded-2xl bg-violet-500 text-[clamp(1rem,1.04vw,1.35rem)] font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,0.25)] hover:bg-violet-600 dark:!bg-violet-500 dark:hover:!bg-violet-600"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? "Logging in..." : "Log In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[clamp(0.9rem,0.92vw,1.05rem)] text-slate-500 md:mt-8">
        New on our platform? <span className="font-medium text-violet-500">Create an account</span>
      </p>
    </div>
  );
}
