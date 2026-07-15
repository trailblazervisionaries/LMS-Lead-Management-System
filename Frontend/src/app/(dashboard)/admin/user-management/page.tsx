"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateAssistant } from "@/hooks/admin/use-create-assistant";
import { useAssistants } from "@/hooks/admin/use-assistants";
import { useUpdateAssistant } from "@/hooks/admin/use-update-assistant";
import { useDeleteAssistant } from "@/hooks/admin/use-delete-assistant";
import { useActivateAssistant } from "@/hooks/admin/use-activate-assistant";
import { useDeactivateAssistant } from "@/hooks/admin/use-deactivate-assistant";
import { createAssistantSchema, CreateAssistantSchemaValues } from "@/lib/validators/user-management";
import { AssistantListItem, CreateAssistantPayload } from "@/types/assistants/user-management";

function getImageUrl(profileImage: string | null | undefined) {
  if (!profileImage) return null;
  if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) return profileImage;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${apiBaseUrl.replace(/\/$/, "")}/${profileImage.replace(/^\//, "")}`;
}

const PAGE_SIZE = 10;

export default function AdminUserManagementPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [updateSuccessPopup, setUpdateSuccessPopup] = useState<string | null>(null);
  const [editingAssistant, setEditingAssistant] = useState<AssistantListItem | null>(null);
  const [assistantToDelete, setAssistantToDelete] = useState<AssistantListItem | null>(null);
  const [deletingAssistantId, setDeletingAssistantId] = useState<string | null>(null);
  const [activatingAssistantId, setActivatingAssistantId] = useState<string | null>(null);
  const [deactivatingAssistantId, setDeactivatingAssistantId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  const createAssistantMutation = useCreateAssistant();
  const updateAssistantMutation = useUpdateAssistant();
  const deleteAssistantMutation = useDeleteAssistant();
  const activateAssistantMutation = useActivateAssistant();
  const deactivateAssistantMutation = useDeactivateAssistant();
  const assistantsQuery = useAssistants(currentPage, PAGE_SIZE);
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
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors }
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

  const onSubmit = (values: CreateAssistantSchemaValues) => {
    setSubmitError(null);
    setSubmitSuccess(null);

    const payload: CreateAssistantPayload = {
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

    createAssistantMutation.mutate(payload, {
      onSuccess: (response) => {
        const successMessage = response.message || "Assistant created successfully.";
        setSubmitSuccess(successMessage);
        reset();
        setCurrentPage(1);
        queryClient.invalidateQueries({ queryKey: ["assistants"] });
      },
      onError: (error) => {
        setSubmitError(error instanceof Error ? error.message : "Unable to create assistant");
      }
    });
  };

  const openEditModal = (assistant: AssistantListItem) => {
    setEditError(null);
    setSubmitSuccess(null);
    setEditingAssistant(assistant);
    resetEdit({
      name: assistant.name ?? "",
      email: assistant.email ?? "",
      addressLine1: assistant.address?.address_line_1 ?? "",
      addressLine2: assistant.address?.address_line_2 ?? "",
      city: assistant.address?.city ?? "",
      province: assistant.address?.province ?? "",
      country: assistant.address?.country ?? "",
      postalCode: assistant.address?.postal_code ?? ""
    });
  };

  const closeEditModal = () => {
    setEditingAssistant(null);
    setEditError(null);
  };

  const onDeleteAssistant = (assistant: AssistantListItem) => {
    setDeleteError(null);
    setActivateError(null);
    setDeactivateError(null);
    setAssistantToDelete(assistant);
  };

  const closeDeleteModal = () => {
    if (deletingAssistantId) {
      return;
    }
    setAssistantToDelete(null);
  };

  const confirmDeleteAssistant = async () => {
    if (!assistantToDelete) {
      return;
    }

    setDeleteError(null);
    setDeletingAssistantId(assistantToDelete.user_id);

    try {
      await deleteAssistantMutation.mutateAsync(assistantToDelete.user_id);
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
      setAssistantToDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete assistant");
    } finally {
      setDeletingAssistantId(null);
    }
  };

  const onActivateAssistant = async (assistant: AssistantListItem) => {
    if (assistant.is_active) {
      return;
    }

    setActivateError(null);
    setDeactivateError(null);
    setDeleteError(null);
    setActivatingAssistantId(assistant.user_id);

    try {
      await activateAssistantMutation.mutateAsync(assistant.user_id);
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
    } catch (error) {
      setActivateError(error instanceof Error ? error.message : "Unable to activate assistant");
    } finally {
      setActivatingAssistantId(null);
    }
  };

  const onDeactivateAssistant = async (assistant: AssistantListItem) => {
    if (!assistant.is_active) {
      return;
    }

    setDeactivateError(null);
    setActivateError(null);
    setDeleteError(null);
    setDeactivatingAssistantId(assistant.user_id);

    try {
      await deactivateAssistantMutation.mutateAsync(assistant.user_id);
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
    } catch (error) {
      setDeactivateError(error instanceof Error ? error.message : "Unable to deactivate assistant");
    } finally {
      setDeactivatingAssistantId(null);
    }
  };

  const onUpdateSubmit = (values: CreateAssistantSchemaValues) => {
    if (!editingAssistant) {
      return;
    }

    setEditError(null);

    const payload: CreateAssistantPayload = {
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

    updateAssistantMutation.mutate(
      { userId: editingAssistant.user_id, payload },
      {
        onSuccess: (response) => {
          setSubmitSuccess(null);
          setUpdateSuccessPopup(response.message || "Assistant updated successfully.");
          closeEditModal();
          queryClient.invalidateQueries({ queryKey: ["assistants"] });
        },
        onError: (error) => {
          setEditError(error instanceof Error ? error.message : "Unable to update assistant");
        }
      }
    );
  };

  const assistants = assistantsQuery.data?.items ?? [];
  const totalCount = assistantsQuery.data?.total_count ?? 0;
  const totalPages = assistantsQuery.data?.total_pages ?? 1;
  const isPaginationDisabled = assistantsQuery.isLoading || assistantsQuery.isFetching;
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, totalCount);
  const activeCount = assistants.filter((user) => user.is_active).length;
  const inactiveCount = Math.max(totalCount - activeCount, 0);

  useEffect(() => {
    if (!updateSuccessPopup) return;
    const timer = setTimeout(() => {
      setUpdateSuccessPopup(null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [updateSuccessPopup]);

  return (
    <>
      <section className="mx-auto w-full space-y-5 lg:space-y-6">

        {/* ── PAGE HEADER ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-indigo-400 to-brand-500 dark:from-brand-800 dark:via-indigo-700 dark:to-brand-800" />
          <div className="px-6 py-6 sm:px-7 sm:py-7">
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-300">
              Admin Console
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              User Management
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Create, update, activate or deactivate assistant accounts from a single dashboard.
            </p>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-3">
              <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total</p>
                <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{totalCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Assistants</p>
              </div>
              <div className="flex flex-col gap-1 border-r border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Active</p>
                <p className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{activeCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">This page</p>
              </div>
              <div className="flex flex-col gap-1 px-6 py-4 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Inactive</p>
                <p className="text-3xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">{inactiveCount}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Suspended</p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── CREATE ASSISTANT ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Create Assistant</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Fill all required details to create a new assistant account.</p>
          </div>

          <form className="space-y-5 px-5 py-5 sm:px-6 sm:py-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Full Name</span>
                <Input placeholder="Assistant Name" {...register("name")} />
                {errors.name ? <p className="text-xs text-red-500">{errors.name.message}</p> : null}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Email Address</span>
                <Input type="email" placeholder="assistant@company.com" {...register("email")} />
                {errors.email ? <p className="text-xs text-red-500">{errors.email.message}</p> : null}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Address Line 1</span>
                <Input placeholder="House no. 67" {...register("addressLine1")} />
                {errors.addressLine1 ? <p className="text-xs text-red-500">{errors.addressLine1.message}</p> : null}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Address Line 2</span>
                <Input placeholder="Street / Area" {...register("addressLine2")} />
                {errors.addressLine2 ? <p className="text-xs text-red-500">{errors.addressLine2.message}</p> : null}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">City</span>
                <Input placeholder="Chandigarh" {...register("city")} />
                {errors.city ? <p className="text-xs text-red-500">{errors.city.message}</p> : null}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Province</span>
                <Input placeholder="Punjab" {...register("province")} />
                {errors.province ? <p className="text-xs text-red-500">{errors.province.message}</p> : null}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Country</span>
                <Input placeholder="India" {...register("country")} />
                {errors.country ? <p className="text-xs text-red-500">{errors.country.message}</p> : null}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Postal Code</span>
                <Input placeholder="160001" {...register("postalCode")} />
                {errors.postalCode ? <p className="text-xs text-red-500">{errors.postalCode.message}</p> : null}
              </label>
            </div>

            {submitError ? (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
                <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{submitError}</p>
              </div>
            ) : null}
            {submitSuccess ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{submitSuccess}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <Button type="submit" disabled={createAssistantMutation.isPending} className="inline-flex items-center gap-2">
                {createAssistantMutation.isPending ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating…
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create Assistant
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { reset(); setSubmitError(null); setSubmitSuccess(null); }}
                disabled={createAssistantMutation.isPending}
              >
                Reset
              </Button>
            </div>
          </form>
        </Card>

        {/* ── USERS TABLE ── */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Assistant Accounts</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Manage status and account details</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {totalCount} total
            </span>
          </div>

          {/* action errors */}
          {(deleteError || activateError || deactivateError) ? (
            <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800 sm:px-6">
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
                <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {deleteError ?? activateError ?? deactivateError}
                </p>
              </div>
            </div>
          ) : null}

          {assistantsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-14">
              <svg className="h-4 w-4 animate-spin text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading users…</p>
            </div>
          ) : assistantsQuery.isError ? (
            <div className="flex items-center justify-center gap-2 py-14">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {assistantsQuery.error instanceof Error ? assistantsQuery.error.message : "Unable to load users"}
              </p>
            </div>
          ) : !assistants.length ? (
            <div className="flex flex-col items-center gap-2.5 py-14">
              <svg className="h-9 w-9 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No assistant accounts found.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">User</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Email</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Role</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Status</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {assistants.map((user) => {
                      const isBusy = deletingAssistantId === user.user_id || activatingAssistantId === user.user_id || deactivatingAssistantId === user.user_id;
                      return (
                        <tr key={user.user_id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60">
                          <td className="px-5 py-3.5 sm:px-6">
                            <div className="flex items-center gap-3">
                              {getImageUrl(user.profile_image) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={getImageUrl(user.profile_image)!}
                                  alt={`${user.name} profile`}
                                  className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                                />
                              ) : (
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-[11px] font-extrabold uppercase text-white">
                                  {user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                                </span>
                              )}
                              <span className="font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 sm:px-6">{user.email}</td>
                          <td className="px-5 py-3.5 sm:px-6">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 sm:px-6">
                            <span className={[
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              user.is_active
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400"
                            ].join(" ")}>
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 sm:px-6">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(user)}
                                disabled={isBusy}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                </svg>
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => user.is_active ? void onDeactivateAssistant(user) : void onActivateAssistant(user)}
                                disabled={isBusy}
                                className={[
                                  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                                  user.is_active
                                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                ].join(" ")}
                              >
                                {activatingAssistantId === user.user_id || deactivatingAssistantId === user.user_id ? (
                                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={user.is_active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                  </svg>
                                )}
                                {activatingAssistantId === user.user_id ? "Activating…" : deactivatingAssistantId === user.user_id ? "Deactivating…" : user.is_active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteAssistant(user)}
                                disabled={isBusy}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                {deletingAssistantId === user.user_id ? (
                                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                )}
                                {deletingAssistantId === user.user_id ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 p-4 md:hidden sm:p-5">
                {assistants.map((user) => {
                  const isBusy = deletingAssistantId === user.user_id || activatingAssistantId === user.user_id || deactivatingAssistantId === user.user_id;
                  return (
                    <div key={user.user_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {getImageUrl(user.profile_image) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getImageUrl(user.profile_image)!}
                              alt={`${user.name} profile`}
                              className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                            />
                          ) : (
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-[11px] font-extrabold uppercase text-white">
                              {user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                            </span>
                          )}
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                          </div>
                        </div>
                        <span className={[
                          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          user.is_active
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400"
                        ].join(" ")}>
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => openEditModal(user)} disabled={isBusy} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                          Edit
                        </button>
                        <button type="button" onClick={() => user.is_active ? void onDeactivateAssistant(user) : void onActivateAssistant(user)} disabled={isBusy} className={["inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-50", user.is_active ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400"].join(" ")}>
                          {activatingAssistantId === user.user_id ? "Activating…" : deactivatingAssistantId === user.user_id ? "Deactivating…" : user.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" onClick={() => onDeleteAssistant(user)} disabled={isBusy} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                          {deletingAssistantId === user.user_id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {!assistantsQuery.isLoading && !assistantsQuery.isError && assistants.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {startItem}–{endItem} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1 || isPaginationDisabled}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  ← Previous
                </button>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {currentPage} / {Math.max(totalPages, 1)}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.max(totalPages, 1)))}
                  disabled={currentPage >= Math.max(totalPages, 1) || isPaginationDisabled}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next →
                </button>
              </div>
            </div>
          ) : null}
        </Card>
      </section>

      {/* ── UPDATE SUCCESS TOAST ── */}
      {updateSuccessPopup ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-6 sm:items-center">
          <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-2xl dark:border-emerald-800/40 dark:bg-slate-950">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{updateSuccessPopup}</p>
          </div>
        </div>
      ) : null}

      {/* ── DELETE CONFIRM MODAL ── */}
      {assistantToDelete ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="h-0.5 w-full bg-gradient-to-r from-red-500 to-rose-400" />
            <div className="p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30">
                  <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Delete Assistant</h3>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                    Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-slate-100">{assistantToDelete.name}</span>? This action cannot be undone.
                  </p>
                </div>
              </div>
              {deleteError ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-950/20">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300">{deleteError}</p>
                </div>
              ) : null}
              <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={Boolean(deletingAssistantId)}
                  className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDeleteAssistant()}
                  disabled={Boolean(deletingAssistantId)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
                >
                  {deletingAssistantId ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  {deletingAssistantId ? "Deleting…" : "Delete Assistant"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── EDIT MODAL ── */}
      {editingAssistant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-indigo-400 to-brand-500 dark:from-brand-800 dark:via-indigo-700 dark:to-brand-800" />
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Edit Assistant</h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Updating details for <span className="font-semibold text-slate-700 dark:text-slate-200">{editingAssistant.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="space-y-5 px-5 py-5 sm:px-6 sm:py-6" onSubmit={handleEditSubmit(onUpdateSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Full Name</span>
                  <Input placeholder="Assistant Name" {...registerEdit("name")} />
                  {editErrors.name ? <p className="text-xs text-red-500">{editErrors.name.message}</p> : null}
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Email Address</span>
                  <Input type="email" placeholder="assistant@company.com" {...registerEdit("email")} />
                  {editErrors.email ? <p className="text-xs text-red-500">{editErrors.email.message}</p> : null}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Address Line 1</span>
                  <Input placeholder="House no. 67" {...registerEdit("addressLine1")} />
                  {editErrors.addressLine1 ? <p className="text-xs text-red-500">{editErrors.addressLine1.message}</p> : null}
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Address Line 2</span>
                  <Input placeholder="Street / Area" {...registerEdit("addressLine2")} />
                  {editErrors.addressLine2 ? <p className="text-xs text-red-500">{editErrors.addressLine2.message}</p> : null}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">City</span>
                  <Input placeholder="Chandigarh" {...registerEdit("city")} />
                  {editErrors.city ? <p className="text-xs text-red-500">{editErrors.city.message}</p> : null}
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Province</span>
                  <Input placeholder="Punjab" {...registerEdit("province")} />
                  {editErrors.province ? <p className="text-xs text-red-500">{editErrors.province.message}</p> : null}
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Country</span>
                  <Input placeholder="India" {...registerEdit("country")} />
                  {editErrors.country ? <p className="text-xs text-red-500">{editErrors.country.message}</p> : null}
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Postal Code</span>
                  <Input placeholder="160001" {...registerEdit("postalCode")} />
                  {editErrors.postalCode ? <p className="text-xs text-red-500">{editErrors.postalCode.message}</p> : null}
                </label>
              </div>

              {editError ? (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
                  <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">{editError}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <Button type="submit" disabled={updateAssistantMutation.isPending} className="inline-flex items-center gap-2">
                  {updateAssistantMutation.isPending ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving…
                    </>
                  ) : "Save Changes"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeEditModal} disabled={updateAssistantMutation.isPending}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}


