"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAssistantProfile } from "@/hooks/assistant/use-assistant-profile";
import { useAuthStore } from "@/store/auth-store";

function getImageUrl(profileImage: string | null) {
  if (!profileImage) {
    return null;
  }

  if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) {
    return profileImage;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const normalizedBase = apiBaseUrl.replace(/\/$/, "");
  const normalizedPath = profileImage.replace(/^\//, "");
  return `${normalizedBase}/${normalizedPath}`;
}

function splitName(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { firstName: "-", lastName: "-" };
  }

  const [firstName, ...rest] = trimmedName.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" ") || "-"
  };
}

function toTitleCase(value: string) {
  if (!value) {
    return "-";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getLocationLabel(city?: string | null, province?: string | null, country?: string | null) {
  return [city, province, country].filter(Boolean).join(", ") || "-";
}

export default function AssistantProfilePage() {
  const { data, isLoading, isError, error } = useAssistantProfile();
  const authUser = useAuthStore((state) => state.user);
  const displayName = data?.name?.trim() || authUser?.name?.trim() || data?.email?.split("@")[0] || "User";
  const initials = displayName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "U";
  const profileImageUrl = getImageUrl(data?.profile_image ?? null);
  const { firstName, lastName } = splitName(displayName);
  const locationLabel = getLocationLabel(data?.address?.city, data?.address?.province, data?.address?.country);

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Profile</h2>

      {isLoading ? (
        <Card className="rounded-3xl p-7">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading profile...</p>
        </Card>
      ) : null}

      {isError ? (
        <Card className="rounded-3xl p-7">
          <p className="text-sm text-red-600">{error instanceof Error ? error.message : "Unable to fetch profile"}</p>
        </Card>
      ) : null}

      {data ? (
        <>
          <Card className="rounded-3xl p-7 md:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-5">
                {profileImageUrl ? (
                  // Using img here because profile image can be dynamic from backend uploads.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImageUrl}
                    alt={`${displayName} profile`}
                    className="h-20 w-20 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                  />
                ) : (
                  <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-brand-100 text-2xl font-semibold text-brand-700 dark:border-slate-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {initials}
                  </span>
                )}
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{displayName}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {toTitleCase(data.role)} <span className="mx-2 text-slate-300">|</span> {locationLabel}
                  </p>
                </div>
              </div>
              <Link href="/assistant/profile/edit">
                <Button type="button" variant="secondary" className="h-10 rounded-2xl border border-slate-200 px-7 text-sm dark:border-slate-700">
                  <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                  Edit
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">First Name</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{firstName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Last Name</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{lastName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Email address</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{data.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Bio</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{toTitleCase(data.role)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">-</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">User ID</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{data.user_id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{data.is_active ? "Active" : "Inactive"}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl p-7 md:p-9">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Address</h3>
              <Link href="/assistant/profile/edit">
                <Button type="button" variant="secondary" className="h-10 rounded-2xl border border-slate-200 px-7 text-sm dark:border-slate-700">
                  <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                  Edit
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Country</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{data.address?.country ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">City/State</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {getLocationLabel(data.address?.city, data.address?.province, data.address?.country)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Postal Code</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{data.address?.postal_code ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Address Line 1</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{data.address?.address_line_1 ?? "-"}</p>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
