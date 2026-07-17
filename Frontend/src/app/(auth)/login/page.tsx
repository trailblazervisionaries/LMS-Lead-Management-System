import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/features/auth/components/login-form";

const LOGIN_LOGO_SRC = "/Auth/login-logo.png";

export default function LoginPage() {
  return (
    <main className="h-dvh overflow-hidden [color-scheme:light]">
      <div className="flex h-full flex-col lg:flex-row">

        {/* ════════════════════════════════════════
            LEFT PANEL — lg and above only
        ════════════════════════════════════════ */}
        <section className="relative hidden overflow-hidden lg:flex lg:flex-1">
          <style>{`
            @keyframes lo-float-a { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
            @keyframes lo-float-b { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(8px)}  }
            .lo-chip-1 { animation: lo-float-a 4.2s ease-in-out infinite; }
            .lo-chip-2 { animation: lo-float-b 5.0s ease-in-out infinite 0.8s; }
            .lo-chip-3 { animation: lo-float-a 4.7s ease-in-out infinite 1.4s; }
            .lo-chip-4 { animation: lo-float-b 3.9s ease-in-out infinite 0.3s; }
          `}</style>

          {/* Background */}
          <div className="absolute inset-0 bg-[#05050f]" />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950/90 via-indigo-950/60 to-[#05050f]" />

          {/* Glow orbs */}
          <div className="absolute -left-48 -top-48 h-[640px] w-[640px] rounded-full bg-violet-600/20 blur-[140px]" />
          <div className="absolute -bottom-32 -right-32 h-[560px] w-[560px] rounded-full bg-indigo-700/20 blur-[130px]" />
          <div className="absolute left-[45%] top-[35%] h-[280px] w-[280px] rounded-full bg-purple-500/10 blur-[90px]" />

          {/* Grid */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <pattern id="login-grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="white" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>

          {/* Edge lines */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-violet-500/20 to-transparent" />

          {/* Logo */}
          <div className="absolute left-8 top-8 z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-900/60">
              <Image src={LOGIN_LOGO_SRC} alt="Logo" width={28} height={28} className="h-7 w-7 object-contain" priority />
            </div>
            <p className="text-xl font-extrabold tracking-tight text-white">LeadOrbit</p>
          </div>

          {/* Centre content */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 xl:px-12 2xl:px-20">
            <div className="flex w-full max-w-md flex-col items-center xl:max-w-lg 2xl:max-w-xl">

              {/* Live pill */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1.5 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-violet-300">Live Platform</span>
              </div>

              {/* Headline */}
              <h1 className="mb-2 text-center text-3xl font-black leading-[1.15] tracking-tight text-white xl:text-4xl 2xl:text-5xl">
                Grow Smarter.
                <br />
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  Close Faster.
                </span>
              </h1>
              <p className="mb-6 text-center text-sm leading-relaxed text-slate-400">
                The complete lead intelligence platform
                <br />for high-performance sales teams.
              </p>

              {/* Network visualization */}
              <div className="relative w-full" style={{ minHeight: "260px" }}>
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <defs>
                    <radialGradient id="central-orb" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.45" />
                      <stop offset="65%" stopColor="#6366f1" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <circle cx="210" cy="150" r="128" fill="none" stroke="#7c3aed" strokeOpacity="0.07" strokeWidth="1" strokeDasharray="3 8" className="[transform-box:fill-box] [transform-origin:center] animate-spin [animation-duration:32s] [animation-timing-function:linear]" />
                  <circle cx="210" cy="150" r="88"  fill="none" stroke="#7c3aed" strokeOpacity="0.11" strokeWidth="1" className="[transform-box:fill-box] [transform-origin:center] animate-spin [animation-duration:22s] [animation-timing-function:linear] [animation-direction:reverse]" />
                  <circle cx="210" cy="150" r="50"  fill="none" stroke="#7c3aed" strokeOpacity="0.18" strokeWidth="1.5" />
                  <circle cx="210" cy="150" r="78"  fill="url(#central-orb)" className="animate-pulse [animation-duration:3s]" />
                  <circle cx="210" cy="150" r="33"  fill="#0e0b2a" />
                  <circle cx="210" cy="150" r="31"  fill="none" stroke="#7c3aed" strokeOpacity="0.55" strokeWidth="1.5" />
                  <text x="210" y="155" textAnchor="middle" fontSize="13" fontWeight="800" fill="#a78bfa" fontFamily="system-ui,sans-serif" letterSpacing="1">LO</text>
                  <line x1="210" y1="150" x2="78"  y2="52"  stroke="#7c3aed" strokeOpacity="0.20" strokeWidth="1" />
                  <line x1="210" y1="150" x2="356" y2="62"  stroke="#6366f1" strokeOpacity="0.17" strokeWidth="1" />
                  <line x1="210" y1="150" x2="362" y2="250" stroke="#7c3aed" strokeOpacity="0.17" strokeWidth="1" />
                  <line x1="210" y1="150" x2="52"  y2="247" stroke="#6366f1" strokeOpacity="0.14" strokeWidth="1" />
                  <line x1="210" y1="150" x2="210" y2="20"  stroke="#a78bfa" strokeOpacity="0.17" strokeWidth="1" />
                  <circle cx="78"  cy="52"  r="6" fill="#7c3aed" fillOpacity="0.75" />
                  <circle cx="78"  cy="52"  r="6" fill="#7c3aed" fillOpacity="0.35" className="[transform-box:fill-box] [transform-origin:center] animate-ping [animation-duration:2.8s]" />
                  <circle cx="356" cy="62"  r="5" fill="#6366f1" fillOpacity="0.75" />
                  <circle cx="356" cy="62"  r="5" fill="#6366f1" fillOpacity="0.35" className="[transform-box:fill-box] [transform-origin:center] animate-ping [animation-duration:3.4s] [animation-delay:0.6s]" />
                  <circle cx="362" cy="250" r="7" fill="#7c3aed" fillOpacity="0.60" />
                  <circle cx="362" cy="250" r="7" fill="#7c3aed" fillOpacity="0.30" className="[transform-box:fill-box] [transform-origin:center] animate-ping [animation-duration:2.4s] [animation-delay:1.2s]" />
                  <circle cx="52"  cy="247" r="5" fill="#6366f1" fillOpacity="0.55" />
                  <circle cx="52"  cy="247" r="5" fill="#6366f1" fillOpacity="0.28" className="[transform-box:fill-box] [transform-origin:center] animate-ping [animation-duration:3.1s] [animation-delay:0.9s]" />
                  <circle cx="210" cy="20"  r="4" fill="#a78bfa" fillOpacity="0.85" />
                  <circle cx="210" cy="20"  r="4" fill="#a78bfa" fillOpacity="0.35" className="[transform-box:fill-box] [transform-origin:center] animate-ping [animation-duration:2.6s] [animation-delay:1.8s]" />
                  <circle cx="144" cy="36"  r="2"   fill="#7c3aed" fillOpacity="0.32" />
                  <circle cx="290" cy="32"  r="1.5" fill="#6366f1" fillOpacity="0.38" />
                  <circle cx="385" cy="148" r="2"   fill="#7c3aed" fillOpacity="0.28" />
                  <circle cx="32"  cy="152" r="1.5" fill="#6366f1" fillOpacity="0.32" />
                  <circle cx="147" cy="278" r="2"   fill="#7c3aed" fillOpacity="0.28" />
                  <circle cx="275" cy="282" r="1.5" fill="#a78bfa" fillOpacity="0.33" />
                </svg>

                <div className="lo-chip-1 absolute left-0 top-5 flex items-center gap-2 rounded-xl border border-white/[0.09] bg-[#05050f]/80 px-3 py-2 backdrop-blur-md">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                    <svg className="h-3.5 w-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div><p className="text-xs font-bold text-white">2,847</p><p className="text-[9px] text-slate-500">Total Leads</p></div>
                  <span className="ml-1 text-[9px] font-bold text-emerald-400">+12%</span>
                </div>

                <div className="lo-chip-2 absolute right-0 top-14 flex items-center gap-2 rounded-xl border border-white/[0.09] bg-[#05050f]/80 px-3 py-2 backdrop-blur-md">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20">
                    <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  </div>
                  <div><p className="text-xs font-bold text-white">68%</p><p className="text-[9px] text-slate-500">Win Rate</p></div>
                  <span className="ml-1 text-[9px] font-bold text-emerald-400">+5%</span>
                </div>

                <div className="lo-chip-3 absolute bottom-6 left-0 flex items-center gap-2 rounded-xl border border-white/[0.09] bg-[#05050f]/80 px-3 py-2 backdrop-blur-md">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                    <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div><p className="text-xs font-bold text-white">$1.2M</p><p className="text-[9px] text-slate-500">Pipeline</p></div>
                  <span className="ml-1 text-[9px] font-bold text-emerald-400">+9%</span>
                </div>

                <div className="lo-chip-4 absolute bottom-4 right-0 flex items-center gap-2 rounded-xl border border-white/[0.09] bg-[#05050f]/80 px-3 py-2 backdrop-blur-md">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/20">
                    <svg className="h-3.5 w-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <div><p className="text-xs font-bold text-white">384</p><p className="text-[9px] text-slate-500">Converted</p></div>
                  <span className="ml-1 text-[9px] font-bold text-emerald-400">+8%</span>
                </div>
              </div>

              {/* Feature pills */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {(
                  [
                    { d: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", label: "Real-time tracking" },
                    { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", label: "Team collaboration" },
                    { d: "M18 20V10M12 20V4M6 20v-6", label: "Advanced analytics" },
                  ] as { d: string; label: string }[]
                ).map((f) => (
                  <div key={f.label} className="flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.05] px-3 py-1.5 backdrop-blur-sm">
                    <svg className="h-3 w-3 shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.d} />
                    </svg>
                    <span className="whitespace-nowrap text-[10px] font-semibold text-slate-300">{f.label}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            RIGHT PANEL — all screen sizes
            h-full locks it to the viewport height.
            Inner div uses overflow-y-auto so the
            form can internally scroll on very small
            screens without the page ever scrolling.
        ════════════════════════════════════════ */}
        <section className="relative flex h-full w-full flex-col bg-[#f8f7ff] lg:w-[440px] lg:shrink-0 xl:w-[500px] 2xl:w-[560px]">

          {/* Dot grid */}
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <pattern id="r-dots" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="#7c3aed" fillOpacity="0.06" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#r-dots)" />
          </svg>

          {/* Glow orbs */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-[160px] w-[160px] rounded-full bg-violet-300/25 blur-[60px] sm:-right-14 sm:-top-14 sm:h-[240px] sm:w-[240px] sm:blur-[80px] lg:h-[280px] lg:w-[280px] lg:blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-[140px] w-[140px] rounded-full bg-indigo-200/30 blur-[50px] sm:-bottom-10 sm:-left-8 sm:h-[200px] sm:w-[200px] sm:blur-[70px] lg:h-[240px] lg:w-[240px] lg:blur-[90px]" />

          {/* Left-edge accent — desktop only */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-violet-400/25 to-transparent lg:block" />
          {/* Top-edge highlight — mobile / tablet only */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-300/30 via-indigo-300/20 to-transparent lg:hidden" />

          {/*
            Scrollable inner area fills the full section height.
            my-auto on the content block = safe CSS centering:
              • fits viewport  → auto margins center it vertically
              • overflows      → margins collapse, content starts at top and scrolls inside
          */}
          <div className="relative z-10 flex h-full w-full flex-col items-center overflow-y-auto">
            <div className="my-auto flex w-full flex-col items-center px-5 py-8 sm:px-10 md:px-16 lg:px-10 xl:px-12 2xl:px-16">

              {/* Logo — mobile / tablet only */}
              <div className="mb-6 flex items-center gap-2.5 lg:hidden">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-200">
                  <Image src={LOGIN_LOGO_SRC} alt="Logo" width={24} height={24} className="h-6 w-6 object-contain" priority />
                </div>
                <p className="text-lg font-extrabold tracking-tight text-violet-700">LeadOrbit</p>
              </div>

              {/* Form */}
              <div className="w-full max-w-[300px] sm:max-w-sm md:max-w-[380px] lg:max-w-[320px] xl:max-w-sm 2xl:max-w-[400px]">
                <Suspense fallback={null}>
                  <LoginForm />
                </Suspense>
              </div>

            </div>
          </div>

          {/* Copyright — always pinned to bottom of the fixed-height section */}
          <p className="absolute bottom-4 left-0 right-0 z-20 text-center text-[11px] text-slate-400">
            © {new Date().getFullYear()} LeadOrbit · All rights reserved
          </p>
        </section>

      </div>
    </main>
  );
}
