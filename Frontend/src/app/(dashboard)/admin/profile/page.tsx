"use client";

import { Card } from "@/components/ui/card";
import { useAdminProfile } from "@/hooks/admin/use-admin-profile";

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

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function AdminProfilePage() {
  const { data, isLoading, isError, error } = useAdminProfile();
  const initials = data?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "U";
  const profileImageUrl = getImageUrl(data?.profile_image ?? null);

  return (
    <>
      <section className="space-y-6">
        {/* <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Profile</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View account details and address information from your admin profile.
          </p>
        </div> */}

        {isLoading ? (
          <Card className="rounded-2xl">
            <p className="text-base text-slate-600 dark:text-slate-300">Loading profile...</p>
          </Card>
        ) : null}

        {isError ? (
          <Card className="rounded-2xl">
            <p className="text-base text-red-600">{error instanceof Error ? error.message : "Unable to fetch profile"}</p>
          </Card>
        ) : null}

        {data ? (
          <>
            <Card className="rounded-2xl">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="h-40 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
                <div className="-mt-16 px-4 pb-6">
                  <div className="mx-auto w-fit">
                    {profileImageUrl ? (
                      // Using img here because profile image can be dynamic from backend uploads.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileImageUrl}
                        alt={`${data.name} profile`}
                        className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-md dark:border-slate-900"
                      />
                    ) : (
                      <span className="inline-flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-brand-100 text-3xl font-semibold text-brand-700 shadow-md dark:border-slate-900 dark:bg-brand-900/30 dark:text-brand-300">
                        {initials}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-1 text-center">
                    <h3 className="text-base font-normal text-slate-900 dark:text-slate-100">{data.name}</h3>
                    <p className="text-base text-slate-500 dark:text-slate-400">{data.email}</p>
                    <p className="text-base uppercase tracking-wide text-slate-500 dark:text-slate-400">{data.role}</p>
                  </div>
                </div>
              </div>
            {/* </Card> */}

            {/* <Card className="rounded-2xl"> */}
              <h3 className="mb-6 text-center text-base font-normal text-slate-900 dark:text-slate-100">Account Details</h3>
              <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-6 text-center md:grid-cols-3 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">User ID</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{data.user_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">Role</p>
                  <p className="text-base font-normal uppercase text-slate-800 dark:text-slate-100">{data.role}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">Active</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{data.is_active ? "Yes" : "No"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">Deleted</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{data.is_deleted ? "Yes" : "No"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">Created At</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{formatDateTime(data.created_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">Updated At</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{formatDateTime(data.updated_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">Address Line 1</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{data.address?.address_line_1 ?? "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">Address Line 2</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{data.address?.address_line_2 ?? "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">City</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{data.address?.city ?? "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">Province</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{data.address?.province ?? "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">Country</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{data.address?.country ?? "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-slate-500 dark:text-slate-400">Postal Code</p>
                  <p className="text-base font-normal text-slate-800 dark:text-slate-100">{data.address?.postal_code ?? "-"}</p>
                </div>
              </div>
            {/* </Card> */}
              </Card>
          </>
        ) : null}
      </section>
    </>
  );
}
