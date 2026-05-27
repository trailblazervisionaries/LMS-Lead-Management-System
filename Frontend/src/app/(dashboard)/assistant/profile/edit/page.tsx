"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
  if (typeof document === "undefined") {
    return null;
  }

  const tokenFromCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("lms_token="))
    ?.split("=")[1];

  if (tokenFromCookie) {
    return decodeURIComponent(tokenFromCookie);
  }

  return null;
}

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
    formState: { errors }
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
      postalCode: ""
    }
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    reset({
      name: data.name ?? "",
      email: data.email ?? "",
      addressLine1: data.address?.address_line_1 ?? "",
      addressLine2: data.address?.address_line_2 ?? "",
      city: data.address?.city ?? "",
      province: data.address?.province ?? "",
      country: data.address?.country ?? "",
      postalCode: data.address?.postal_code ?? ""
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
      postal_code: values.postalCode.trim()
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
        }
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
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setPasswordSuccess(response.data.message ?? "Password changed successfully.");
      setNewPassword("");
    } catch (requestError) {
      setPasswordError(getApiErrorMessage(requestError, "Unable to change password"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const initials = data?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "U";
  const profileImageUrl = getImageUrl(data?.profile_image ?? null);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Edit Profile</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Update your assistant profile details and save changes.</p>
      </div>

      {isLoading ? (
        <Card className="rounded-2xl">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading profile...</p>
        </Card>
      ) : null}

      {isError ? (
        <Card className="rounded-2xl">
          <p className="text-sm text-red-600">{error instanceof Error ? error.message : "Unable to fetch profile"}</p>
        </Card>
      ) : null}

      {data ? (
        <>
          <Card className="rounded-2xl">
            <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
              {profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImageUrl}
                  alt={`${data.name} profile`}
                  className="h-24 w-24 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                />
              ) : (
                <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-2xl font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                  {initials}
                </span>
              )}

              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{data.name}</h3>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{data.role}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Update Profile</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update your name, email, and address details.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Name</span>
                  <Input placeholder="Assistant Name" {...register("name")} />
                  {errors.name ? <p className="text-xs text-red-600">{errors.name.message}</p> : null}
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Email</span>
                  <Input type="email" placeholder="assistant@company.com" {...register("email")} />
                  {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Address line 1</span>
                  <Input placeholder="House no. 67" {...register("addressLine1")} />
                  {errors.addressLine1 ? <p className="text-xs text-red-600">{errors.addressLine1.message}</p> : null}
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Address line 2</span>
                  <Input placeholder="chandigarh" {...register("addressLine2")} />
                  {errors.addressLine2 ? <p className="text-xs text-red-600">{errors.addressLine2.message}</p> : null}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">City</span>
                  <Input placeholder="Chandigarh" {...register("city")} />
                  {errors.city ? <p className="text-xs text-red-600">{errors.city.message}</p> : null}
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Province</span>
                  <Input placeholder="Chandigarh" {...register("province")} />
                  {errors.province ? <p className="text-xs text-red-600">{errors.province.message}</p> : null}
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Country</span>
                  <Input placeholder="India" {...register("country")} />
                  {errors.country ? <p className="text-xs text-red-600">{errors.country.message}</p> : null}
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Postal code</span>
                  <Input placeholder="108306" {...register("postalCode")} />
                  {errors.postalCode ? <p className="text-xs text-red-600">{errors.postalCode.message}</p> : null}
                </label>
              </div>

              {updateError ? <p className="text-sm text-red-600">{updateError}</p> : null}
              {updateSuccess ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{updateSuccess}</p> : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" disabled={updateAssistantProfileMutation.isPending}>
                  {updateAssistantProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!data) {
                      return;
                    }

                    reset({
                      name: data.name ?? "",
                      email: data.email ?? "",
                      addressLine1: data.address?.address_line_1 ?? "",
                      addressLine2: data.address?.address_line_2 ?? "",
                      city: data.address?.city ?? "",
                      province: data.address?.province ?? "",
                      country: data.address?.country ?? "",
                      postalCode: data.address?.postal_code ?? ""
                    });
                    setUpdateError(null);
                    setUpdateSuccess(null);
                  }}
                  disabled={updateAssistantProfileMutation.isPending}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Card>

          <Card className="rounded-2xl">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Password</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set a new account password.</p>
            </div>

            <div className="space-y-4">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">New password</span>
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
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
              {passwordSuccess ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{passwordSuccess}</p> : null}

              <div className="flex flex-wrap gap-3 pt-1">
                <Button type="button" onClick={() => void onChangePassword()} disabled={isChangingPassword}>
                  {isChangingPassword ? "Updating..." : "Change Password"}
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
