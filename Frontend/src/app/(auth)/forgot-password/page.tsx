import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-slate-50 to-brand-50 px-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <ForgotPasswordForm />
    </main>
  );
}
