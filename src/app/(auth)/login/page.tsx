import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-slate-50 to-brand-50 px-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <LoginForm />
    </main>
  );
}
