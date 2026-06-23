import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/features/auth/components/login-form";

const LOGIN_SIDE_IMAGE_SRC = "/Auth/login-side-illustration.png";
const LOGIN_LOGO_SRC = "/Auth/login-logo.png";
const LOGIN_TREE_IMAGE_SRC = "/Auth/tree-img.png";

export default function LoginPage() {
  return (
    <main className="min-h-screen [color-scheme:light]">
      <div className="flex min-h-screen flex-col lg:flex-row">

        {/* ── Left Panel — hidden on mobile/tablet, visible lg+ ── */}
        <section className="relative hidden overflow-hidden lg:flex lg:flex-1">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100" />

          {/* Dot grid pattern */}
          <svg
            className="absolute inset-0 h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <pattern id="login-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="#a78bfa" fillOpacity="0.25" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-dots)" />
          </svg>

          {/* Angled bottom accent */}
          <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-r from-violet-100/80 to-indigo-100/80 [clip-path:polygon(0_40%,100%_0,100%_100%,0_100%)]" />

          {/* Logo top-left */}
          <div className="absolute left-8 top-8 z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
              <Image
                src={LOGIN_LOGO_SRC}
                alt="Logo"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <p className="text-xl font-extrabold tracking-tight text-violet-700">
              LeadOrbit
            </p>
          </div>

          {/* Main illustration */}
          <Image
            src={LOGIN_SIDE_IMAGE_SRC}
            alt="Login illustration"
            fill
            priority
            className="z-[1] object-contain object-center px-10 py-24"
            sizes="(min-width: 1024px) 50vw, 0vw"
          />

          {/* Decorative tree */}
          <Image
            src={LOGIN_TREE_IMAGE_SRC}
            alt="Decorative tree"
            width={132}
            height={250}
            className="pointer-events-none absolute bottom-0 left-8 z-[2] h-auto w-[88px] xl:w-[110px]"
            priority
          />

          {/* Feature badges bottom-right */}
          <div className="absolute bottom-8 right-8 z-[3] flex flex-col items-end gap-2">
            {(
              [
                {
                  d: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
                  label: "Real-time lead tracking"
                },
                {
                  d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
                  label: "Team collaboration"
                },
                {
                  d: "M18 20V10M12 20V4M6 20v-6",
                  label: "Advanced analytics"
                }
              ] as { d: string; label: string }[]
            ).map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/60 px-3 py-2 shadow-sm backdrop-blur-sm"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-violet-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={f.d} />
                </svg>
                <span className="whitespace-nowrap text-[11px] font-semibold text-slate-700">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Right Panel — full width on mobile, fixed width on desktop ── */}
        <section className="relative flex min-h-screen w-full flex-col items-center justify-center bg-white px-5 py-12 sm:px-10 lg:min-h-0 lg:w-[480px] lg:shrink-0 lg:px-12 xl:w-[520px] xl:px-16">
          {/* Soft top gradient tint */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-violet-50/50 to-transparent" />

          {/* Mobile logo — only shown when left panel is hidden */}
          <div className="relative z-10 mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
              <Image
                src={LOGIN_LOGO_SRC}
                alt="Logo"
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
                priority
              />
            </div>
            <p className="text-lg font-extrabold tracking-tight text-violet-700">
              LeadOrbit
            </p>
          </div>

          {/* Form */}
          <div className="relative z-10 w-full max-w-sm">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>

          {/* Copyright */}
          <p className="relative z-10 mt-10 text-center text-[11px] text-slate-400 lg:absolute lg:bottom-6 lg:mt-0">
            © {new Date().getFullYear()} LeadOrbit · All rights reserved
          </p>
        </section>

      </div>
    </main>
  );
}
