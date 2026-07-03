"use client";

import Link from "next/link";
import { useAssistantProfile } from "@/hooks/assistant/use-assistant-profile";
import { useAuthStore } from "@/store/auth-store";

function getImageUrl(profileImage: string | null) {
  if (!profileImage) return null;
  if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) return profileImage;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const normalizedBase = apiBaseUrl.replace(/\/$/, "");
  const normalizedPath = profileImage.replace(/^\//, "");
  return `${normalizedBase}/${normalizedPath}`;
}

function splitName(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return { firstName: "-", lastName: "-" };
  const [firstName, ...rest] = trimmedName.split(/\s+/);
  return { firstName, lastName: rest.join(" ") || "-" };
}

function toTitleCase(value: string) {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getLocationLabel(city?: string | null, province?: string | null, country?: string | null) {
  return [city, province, country].filter(Boolean).join(", ") || "-";
}

interface InfoFieldProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoField({ icon, label, value }: InfoFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
        <div className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</div>
      </div>
    </div>
  );
}

export default function AssistantProfilePage() {
  const { data, isLoading, isError, error } = useAssistantProfile();
  const authUser = useAuthStore((state) => state.user);
  const displayName =
    data?.name?.trim() || authUser?.name?.trim() || data?.email?.split("@")[0] || "User";
  const initials =
    displayName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";
  const profileImageUrl = getImageUrl(data?.profile_image ?? null);
  const { firstName, lastName } = splitName(displayName);
  const locationLabel = getLocationLabel(
    data?.address?.city,
    data?.address?.province,
    data?.address?.country
  );

  return (
    <section className="space-y-5 pb-10">
      {/* ── Loading Skeleton ── */}
      {isLoading ? (
        <div className="animate-pulse space-y-5">
          <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-950" />
          <div className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-950" />
        </div>
      ) : null}

      {/* ── Error State ── */}
      {isError ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-5 dark:border-red-900/30 dark:bg-red-950/20">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {error instanceof Error ? error.message : "Unable to fetch profile"}
          </p>
        </div>
      ) : null}

      {data ? (
        <>
          {/* ── Hero Card ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-black">
            {/* Gradient Banner */}
            <div className="relative h-52 bg-gradient-to-br from-brand-700 via-brand-600 to-blue-400 sm:h-50">
              <svg
                className="absolute inset-0 h-full w-full opacity-10"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <defs>
                  <pattern id="profile-hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0v40" fill="none" stroke="white" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#profile-hero-grid)" />
              </svg>
              {/* Edit button */}
              <div className="absolute right-4 top-4 sm:right-6 sm:top-5">
                <Link href="/assistant/profile/edit">
                  <button className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                    Edit Profile
                  </button>
                </Link>
              </div>
            </div>

            {/* Profile content */}
            <div className="px-6 pb-8 sm:px-8">
              {/* Avatar row */}
              <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
                <div className="flex items-end gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    {profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileImageUrl}
                        alt={`${displayName} profile`}
                        className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg dark:border-slate-900"
                      />
                    ) : (
                      <span className="inline-flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-brand-400 to-brand-700 text-2xl font-extrabold text-white shadow-lg dark:border-slate-900">
                        {initials}
                      </span>
                    )}
                    {data.is_active ? (
                      <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-400 shadow dark:border-slate-900">
                        <span className="h-2 w-2 rounded-full bg-white" />
                      </span>
                    ) : null}
                  </div>

                  {/* Name + badges */}
                  <div className="mt-20">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{displayName}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-800">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="5" y="2" width="14" height="20" rx="2" />
                          <path d="M12 18h.01" />
                        </svg>
                        {toTitleCase(data.role)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                          data.is_active
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800"
                            : "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:ring-slate-700"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${data.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {data.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {locationLabel !== "-" ? (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                          <circle cx="12" cy="9" r="2.5" />
                        </svg>
                        {locationLabel}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* ── Personal Info Grid ── */}
              <div className="mt-8 border-t border-slate-100 pt-8 dark:border-slate-800">
                <p className="mb-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Personal Information
                </p>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <InfoField
                    icon={
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20a8 8 0 0 1 16 0" />
                      </svg>
                    }
                    label="First Name"
                    value={firstName}
                  />
                  <InfoField
                    icon={
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20a8 8 0 0 1 16 0" />
                      </svg>
                    }
                    label="Last Name"
                    value={lastName}
                  />
                  <InfoField
                    icon={
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="m3 7 9 6 9-6" />
                      </svg>
                    }
                    label="Email Address"
                    value={data.email}
                  />
                  <InfoField
                    icon={
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="2" width="14" height="20" rx="2" />
                        <path d="M9 7h6M9 11h6M9 15h4" />
                      </svg>
                    }
                    label="Role"
                    value={toTitleCase(data.role)}
                  />
                  <InfoField
                    icon={
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="8" width="18" height="13" rx="2" />
                        <path d="M8 8V5a4 4 0 0 1 8 0v3" />
                      </svg>
                    }
                    label="User ID"
                    value={
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{data.user_id}</span>
                    }
                  />
                  <InfoField
                    icon={
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    }
                    label="Account Status"
                    value={
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                          data.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${data.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {data.is_active ? "Active" : "Inactive"}
                      </span>
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Address Card ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-black">
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Address</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Your registered location details</p>
                </div>
              </div>
              <Link href="/assistant/profile/edit">
                <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-700">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                  Edit
                </button>
              </Link>
            </div>

            {/* Address fields */}
            <div className="grid gap-5 px-6 py-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
              <InfoField
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                }
                label="Country"
                value={data.address?.country ?? "-"}
              />
              <InfoField
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                  </svg>
                }
                label="City / State"
                value={getLocationLabel(data.address?.city, data.address?.province, data.address?.country)}
              />
              <InfoField
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <path d="M22 10H2M6 14h2M10 14h2" />
                  </svg>
                }
                label="Postal Code"
                value={data.address?.postal_code ?? "-"}
              />
              <InfoField
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                }
                label="Address Line 1"
                value={data.address?.address_line_1 ?? "-"}
              />
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
