"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ForgotPasswordEmailSchemaValues,
  forgotPasswordEmailSchema,
  ResetPasswordSchemaValues,
  resetPasswordSchema
} from "@/lib/validators/auth";
import { requestPasswordReset, resetPassword } from "@/features/auth/services/auth-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"requestOtp" | "resetPassword">("requestOtp");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestOtpForm = useForm<ForgotPasswordEmailSchemaValues>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: {
      email: ""
    }
  });

  const resetForm = useForm<ResetPasswordSchemaValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  const onRequestOtp = async (values: ForgotPasswordEmailSchemaValues) => {
    setFormError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const response = await requestPasswordReset({ email: values.email });
      setEmail(values.email);
      setStep("resetPassword");
      setInfoMessage(response.otp ? `OTP sent. Demo OTP: ${response.otp}` : response.message);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to send OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResetPassword = async (values: ResetPasswordSchemaValues) => {
    setFormError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      await resetPassword({
        email,
        otp: values.otp,
        newPassword: values.newPassword
      });
      router.push(`/login?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-6 md:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Forgot password</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {step === "requestOtp"
            ? "Enter your registered email to receive an OTP."
            : `Use the OTP sent to ${email} and set a new password.`}
        </p>
      </div>

      {step === "requestOtp" ? (
        <form className="space-y-4" onSubmit={requestOtpForm.handleSubmit(onRequestOtp)}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
              Registered email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              {...requestOtpForm.register("email")}
            />
            {requestOtpForm.formState.errors.email ? (
              <p className="text-xs text-red-600">{requestOtpForm.formState.errors.email.message}</p>
            ) : null}
          </div>

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          {infoMessage ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{infoMessage}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending OTP..." : "Send OTP"}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={resetForm.handleSubmit(onResetPassword)}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="otp">
              OTP
            </label>
            <Input id="otp" type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP" {...resetForm.register("otp")} />
            {resetForm.formState.errors.otp ? <p className="text-xs text-red-600">{resetForm.formState.errors.otp.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="newPassword">
              New password
            </label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                {...resetForm.register("newPassword")}
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
            {resetForm.formState.errors.newPassword ? <p className="text-xs text-red-600">{resetForm.formState.errors.newPassword.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="confirmPassword">
              Confirm password
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                {...resetForm.register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
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
            {resetForm.formState.errors.confirmPassword ? (
              <p className="text-xs text-red-600">{resetForm.formState.errors.confirmPassword.message}</p>
            ) : null}
          </div>

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          {infoMessage ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{infoMessage}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Resetting..." : "Confirm"}
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
          Back to login
        </Link>
      </p>
    </Card>
  );
}

