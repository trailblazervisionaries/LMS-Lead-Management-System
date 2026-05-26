"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";
import { decodeToken } from "@/features/auth/services/auth-service";
import { useAuthStore } from "@/store/auth-store";

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

export default function AssistantProfilePage() {
  const authUser = useAuthStore((state) => state.user);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const authToken = getAuthToken();

  let tokenName = "";
  let tokenEmail = "";
  let tokenRole = "assistant";
  if (authToken) {
    try {
      const payload = decodeToken(authToken);
      tokenName = payload.name?.trim() ?? "";
      tokenEmail = payload.email?.trim() ?? "";
      tokenRole = payload.role;
    } catch {
      tokenName = "";
      tokenEmail = "";
    }
  }

  const displayName =
    authUser?.name?.trim() || tokenName || authUser?.email?.split("@")[0] || tokenEmail.split("@")[0] || "Assistant User";
  const displayEmail = authUser?.email?.trim() || tokenEmail || "-";
  const displayRole = authUser?.role || tokenRole;
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const { firstName, lastName } = splitName(displayName);

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
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, "Unable to change password"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Profile</h2>

      <Card className="rounded-3xl p-7 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-5">
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-brand-100 text-2xl font-semibold text-brand-700 dark:border-slate-700 dark:bg-brand-900/30 dark:text-brand-300">
              {initials || "A"}
            </span>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{displayName}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {toTitleCase(displayRole)} <span className="mx-2 text-slate-300">|</span> -
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-2xl border border-slate-200 px-7 text-sm dark:border-slate-700"
            onClick={() => document.getElementById("assistant-change-password-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            Edit
          </Button>
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
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{displayEmail}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bio</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{toTitleCase(displayRole)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">-</p>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl p-7 md:p-9">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Address</h3>
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-2xl border border-slate-200 px-7 text-sm dark:border-slate-700"
            onClick={() => document.getElementById("assistant-change-password-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            Edit
          </Button>
        </div>
        <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Country</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">-</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">City/State</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">-</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Postal Code</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">-</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Address Line 1</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">-</p>
          </div>
        </div>
      </Card>

      <div id="assistant-change-password-card">
        <Card className="rounded-3xl p-7 md:p-9">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Change Password</h3>
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
      </div>
    </section>
  );
}


