"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAssistantProfile } from "@/hooks/assistant/use-assistant-profile";
import { useUpdateAssistantProfile } from "@/hooks/assistant/use-update-assistant-profile";
import { createAssistantSchema, CreateAssistantSchemaValues } from "@/lib/validators/user-management";
import { UpdateAssistantProfilePayload } from "@/types/assistant/assistant-profile";
import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";

interface ChangePasswordResponse {
  message?: string;
}

function getAuthToken() {
  if (typeof document === "undefined") return null;
  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token="))
    ?.split("=")[1];
  if (tokenFromCookie) return decodeURIComponent(tokenFromCookie);
  return null;
}

function getImageUrl(profileImage: string | null) {
  if (!profileImage) return null;
  if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) return profileImage;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const normalizedBase = apiBaseUrl.replace(/\/$/, "");
  const normalizedPath = profileImage.replace(/^\//, "");
  return `${normalizedBase}/${normalizedPath}`;
}

interface FormSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function FormSection({ icon, title, description, children }: FormSectionProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-black">
      <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="px-6 py-6 sm:px-8">{children}</div>
    </div>
  );
}

interface AlertProps {
  type: "success" | "error";
  message: string;
}

function Alert({ type, message }: AlertProps) {
  const styles = {
    success: {
      wrapper: "border-emerald-100 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20",
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
      text: "text-emerald-700 dark:text-emerald-400",
    },
    error: {
      wrapper: "border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20",
      icon: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
      text: "text-red-700 dark:text-red-400",
    },
  };
  const s = styles[type];

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${s.wrapper}`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.icon}`}>
        {type === "success" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        )}
      </div>
      <p className={`text-sm font-medium ${s.text}`}>{message}</p>
    </div>
  );
}

export default function AssistantProfileEditPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useAssistantProfile();
  const updateAssistantProfileMutation = useUpdateAssistantProfile();
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAssistantSchemaValues>({
    resolver: zodResolver(createAssistantSchema),
    defaultValues: {
      name: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      province: "",
      country: "",
      postalCode: "",
    },
  });

  useEffect(() => {
    if (!data) return;
    reset({
      name: data.name ?? "",
      email: data.email ?? "",
      addressLine1: data.address?.address_line_1 ?? "",
      addressLine2: data.address?.address_line_2 ?? "",
      city: data.address?.city ?? "",
      province: data.address?.province ?? "",
      country: data.address?.country ?? "",
      postalCode: data.address?.postal_code ?? "",
    });
  }, [data, reset]);

  const onSubmit = (values: CreateAssistantSchemaValues) => {
    setUpdateError(null);
    setUpdateSuccess(null);

    if (!data?.user_id) {
      setUpdateError("Assistant profile is not available yet.");
      return;
    }

    const payload: UpdateAssistantProfilePayload = {
      name: values.name.trim(),
      role: "assistant",
      email: values.email.trim(),
      address_line_1: values.addressLine1.trim(),
      address_line_2: values.addressLine2.trim(),
      city: values.city.trim(),
      province: values.province.trim(),
      country: values.country.trim(),
      postal_code: values.postalCode.trim(),
    };

    updateAssistantProfileMutation.mutate(
      { userId: data.user_id, payload },
      {
        onSuccess: (response) => {
          setUpdateSuccess(response.message ?? "Profile updated successfully.");
          queryClient.invalidateQueries({ queryKey: ["assistant-profile"] });
        },
        onError: (mutationError) => {
          setUpdateError(mutationError instanceof Error ? mutationError.message : "Unable to update profile");
        },
      }
    );
  };

  const onChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    const trimmedPassword = newPassword.trim();
    if (!trimmedPassword) {
      setPasswordError("New password is required");
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setPasswordError("Authentication required. Please log in again.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const response = await api.put<ChangePasswordResponse>(
        "/api/users/change-password",
        { new_password: trimmedPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordSuccess(response.data.message ?? "Password changed successfully.");
      setNewPassword("");
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, "Unable to change password"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const initials =
    data?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";
  const profileImageUrl = getImageUrl(data?.profile_image ?? null);

  return (
    <section className="space-y-5 pb-10">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link
            href="/assistant/profile"
            className="inline-flex items-center gap-1 font-medium transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Profile
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-slate-100">Edit</span>
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Edit Profile</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Update your personal information and account settings.
        </p>
      </div>

      {/* ── Loading ── */}
      {isLoading ? (
        <div className="animate-pulse space-y-5">
          <div className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-950" />
          <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-950" />
          <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-950" />
        </div>
      ) : null}

      {/* ── Error ── */}
      {isError ? (
        <Alert type="error" message={error instanceof Error ? error.message : "Unable to fetch profile"} />
      ) : null}

      {data ? (
        <>
          {/* ── Avatar Card ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-black">
            <div className="relative h-20 bg-gradient-to-r from-brand-600 via-brand-500 to-blue-400">
              <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <pattern id="edit-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M32 0H0v32" fill="none" stroke="white" strokeWidth="0.6" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#edit-grid)" />
              </svg>
            </div>
            <div className="flex items-end gap-4 px-6 pb-5 sm:px-8">
              <div className="-mt-10 shrink-0">
                {profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImageUrl}
                    alt={`${data.name} profile`}
                    className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-md dark:border-slate-900"
                  />
                ) : (
                  <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-brand-400 to-brand-700 text-xl font-extrabold text-white shadow-md dark:border-slate-900">
                    {initials}
                  </span>
                )}
              </div>
              <div className="mt-12">
                <p className="font-bold text-slate-900 dark:text-slate-100">{data.name}</p>
                <p className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">{data.role}</p>
              </div>
            </div>
          </div>

          {/* ── Update Profile Form ── */}
          <FormSection
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20a8 8 0 0 1 16 0" />
              </svg>
            }
            title="Personal Information"
            description="Update your name, email address, and location details."
          >
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {/* Name + Email */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Full Name
                  </label>
                  <Input placeholder="Assistant Name" {...register("name")} />
                  {errors.name ? <p className="text-xs font-medium text-red-600">{errors.name.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Email Address
                  </label>
                  <Input type="email" placeholder="assistant@company.com" {...register("email")} />
                  {errors.email ? <p className="text-xs font-medium text-red-600">{errors.email.message}</p> : null}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-950" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Address</span>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-950" />
              </div>

              {/* Address lines */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Address Line 1
                  </label>
                  <Input placeholder="House no. 89" {...register("addressLine1")} />
                  {errors.addressLine1 ? (
                    <p className="text-xs font-medium text-red-600">{errors.addressLine1.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Address Line 2
                  </label>
                  <Input placeholder="Sector 20" {...register("addressLine2")} />
                  {errors.addressLine2 ? (
                    <p className="text-xs font-medium text-red-600">{errors.addressLine2.message}</p>
                  ) : null}
                </div>
              </div>

              {/* City / Province / Country / Postal */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    City
                  </label>
                  <Input placeholder="Mohali" {...register("city")} />
                  {errors.city ? <p className="text-xs font-medium text-red-600">{errors.city.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Province
                  </label>
                  <Input placeholder="Punjab" {...register("province")} />
                  {errors.province ? (
                    <p className="text-xs font-medium text-red-600">{errors.province.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Country
                  </label>
                  <Input placeholder="India" {...register("country")} />
                  {errors.country ? <p className="text-xs font-medium text-red-600">{errors.country.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Postal Code
                  </label>
                  <Input placeholder="107305" {...register("postalCode")} />
                  {errors.postalCode ? (
                    <p className="text-xs font-medium text-red-600">{errors.postalCode.message}</p>
                  ) : null}
                </div>
              </div>

              {/* Feedback */}
              {updateError ? <Alert type="error" message={updateError} /> : null}
              {updateSuccess ? <Alert type="success" message={updateSuccess} /> : null}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <Button type="submit" disabled={updateAssistantProfileMutation.isPending} className="gap-2 px-6">
                  {updateAssistantProfileMutation.isPending ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={updateAssistantProfileMutation.isPending}
                  className="border border-slate-200 px-6 dark:border-slate-700"
                  onClick={() => {
                    if (!data) return;
                    reset({
                      name: data.name ?? "",
                      email: data.email ?? "",
                      addressLine1: data.address?.address_line_1 ?? "",
                      addressLine2: data.address?.address_line_2 ?? "",
                      city: data.address?.city ?? "",
                      province: data.address?.province ?? "",
                      country: data.address?.country ?? "",
                      postalCode: data.address?.postal_code ?? "",
                    });
                    setUpdateError(null);
                    setUpdateSuccess(null);
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
          </FormSection>

          {/* ── Change Password ── */}
          <FormSection
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
            title="Change Password"
            description="Set a new secure password for your account."
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    className="pr-16"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex items-center gap-1 px-3 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {passwordError ? <Alert type="error" message={passwordError} /> : null}
              {passwordSuccess ? <Alert type="success" message={passwordSuccess} /> : null}

              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Button
                  type="button"
                  onClick={() => void onChangePassword()}
                  disabled={isChangingPassword}
                  className="gap-2 px-6"
                >
                  {isChangingPassword ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </div>
          </FormSection>
        </>
      ) : null}
    </section>
  );
}
