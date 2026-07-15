// Shared UI primitives for authentication forms.
// No hooks — safe to import from both server and client components.

export const inputBase =
  "w-full rounded-xl border bg-white/[0.07] py-[13px] text-[13px] text-white placeholder:text-white/30 outline-none transition-all duration-150 focus:bg-white/[0.10] focus:ring-2 focus:ring-violet-500/35 focus:border-violet-500/70";

export const inputBorder = { borderColor: "rgba(139,92,246,0.38)" };

// ─── Field-level validation error ─────────────────────────────────────────────

export function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-400">
      <svg
        className="h-3 w-3 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      {message}
    </p>
  );
}

// ─── Full-width alert banners ──────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border px-3.5 py-3"
      style={{
        borderColor: "rgba(239,68,68,0.15)",
        background: "rgba(239,68,68,0.07)",
      }}
      role="alert"
    >
      <svg
        className="mt-px h-[14px] w-[14px] shrink-0 text-red-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <p className="text-[13px] leading-snug text-red-400">{message}</p>
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border px-3.5 py-3"
      style={{
        borderColor: "rgba(16,185,129,0.15)",
        background: "rgba(16,185,129,0.07)",
      }}
      role="status"
    >
      <svg
        className="mt-px h-[14px] w-[14px] shrink-0 text-emerald-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <p className="text-[13px] leading-snug text-emerald-400">{message}</p>
    </div>
  );
}

// ─── Primary gradient submit button ───────────────────────────────────────────

interface SubmitButtonProps {
  loading: boolean;
  label: string;
  loadingLabel: string;
}

export function SubmitButton({ loading, label, loadingLabel }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative w-full overflow-hidden rounded-xl py-[14px] text-[14px] font-bold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
        boxShadow: "0 4px 24px rgba(124,58,237,0.35), 0 1px 0 rgba(255,255,255,0.08) inset",
      }}
    >
      {/* Hover brightening overlay */}
      <span
        className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)" }}
        aria-hidden="true"
      />
      {/* Shimmer sweep on hover */}
      <span
        className="absolute inset-0 -translate-x-full skew-x-[-20deg] opacity-0 transition-all duration-700 group-hover:translate-x-[200%] group-hover:opacity-100"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)", width: "40%" }}
        aria-hidden="true"
      />
      {loading ? (
        <span className="relative flex items-center justify-center gap-2.5">
          <svg className="h-[15px] w-[15px] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {loadingLabel}
        </span>
      ) : (
        <span className="relative flex items-center justify-center gap-2">
          {label}
          <svg
            className="h-[14px] w-[14px] transition-transform duration-200 group-hover:scale-110"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </span>
      )}
    </button>
  );
}

// ─── Password visibility icons ─────────────────────────────────────────────────

export function EyeOnIcon() {
  return (
    <svg
      className="h-[15px] w-[15px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon() {
  return (
    <svg
      className="h-[15px] w-[15px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
