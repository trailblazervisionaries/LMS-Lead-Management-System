"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
      <section className="space-y-6 lg:space-y-8">
        <Card className="overflow-hidden rounded-3xl border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-0 shadow-md dark:border-slate-700 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <div className="flex flex-col gap-5 px-5 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">Admin Console</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">User Management</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Create, update, activate or deactivate assistant accounts from a single dashboard.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950/80">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{totalCount}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-center shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Active</p>
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{activeCount}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-center shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300">Inactive</p>
                <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{inactiveCount}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 p-6 shadow-sm dark:border-slate-700 sm:p-7">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Assistant</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Fill all required details to create a new assistant user.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Name</span>
                <Input placeholder="Assistant Name" {...register("name")} />
                {errors.name ? <p className="text-xs text-red-600">{errors.name.message}</p> : null}
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Email</span>
                <Input type="email" placeholder="assistant@company.com" {...register("email")} />
                {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Address line 1</span>
                <Input placeholder="House no. 67" {...register("addressLine1")} />
                {errors.addressLine1 ? <p className="text-xs text-red-600">{errors.addressLine1.message}</p> : null}
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Address line 2</span>
                <Input placeholder="chandigarh" {...register("addressLine2")} />
                {errors.addressLine2 ? <p className="text-xs text-red-600">{errors.addressLine2.message}</p> : null}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">City</span>
                <Input placeholder="chandigarh" {...register("city")} />
                {errors.city ? <p className="text-xs text-red-600">{errors.city.message}</p> : null}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Province</span>
                <Input placeholder="chandigarh" {...register("province")} />
                {errors.province ? <p className="text-xs text-red-600">{errors.province.message}</p> : null}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Country</span>
                <Input placeholder="India" {...register("country")} />
                {errors.country ? <p className="text-xs text-red-600">{errors.country.message}</p> : null}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Postal code</span>
                <Input placeholder="108306" {...register("postalCode")} />
                {errors.postalCode ? <p className="text-xs text-red-600">{errors.postalCode.message}</p> : null}
              </label>
            </div>

            {submitError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {submitError}
              </p>
            ) : null}
            {submitSuccess ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                {submitSuccess}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="submit" disabled={createAssistantMutation.isPending}>
                {createAssistantMutation.isPending ? "Creating..." : "Create Assistant"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  reset();
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
                disabled={createAssistantMutation.isPending}
              >
                Reset
              </Button>
            </div>
          </form>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 p-0 shadow-sm dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-slate-700 sm:px-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Created Users</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage status and account details</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              Total: {totalCount}
            </span>
          </div>

          <div className="p-5 sm:p-6">
            {assistantsQuery.isLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading users...</p>
            ) : assistantsQuery.isError ? (
              <p className="text-sm text-red-600">
                {assistantsQuery.error instanceof Error ? assistantsQuery.error.message : "Unable to load users"}
              </p>
            ) : !assistants.length ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No users found.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-950/70">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Profile</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Name</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Email</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Role</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Status</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assistants.map((user) => (
                        <tr key={user.user_id} className="border-t border-slate-200 align-top dark:border-slate-700">
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                            {user.profile_image ? (
                              <Image
                                src={user.profile_image}
                                alt={`${user.name} profile`}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                {user.name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{user.name}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{user.email}</td>
                          <td className="px-4 py-3 uppercase text-slate-500 dark:text-slate-300">{user.role}</td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                user.is_active
                                  ? "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                                  : "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                              }
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-8 px-3 text-xs"
                                onClick={() => openEditModal(user)}
                                disabled={
                                  deletingAssistantId === user.user_id ||
                                  activatingAssistantId === user.user_id ||
                                  deactivatingAssistantId === user.user_id
                                }
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className={
                                  user.is_active
                                    ? "h-8 border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                    : "h-8 border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                }
                                onClick={() =>
                                  user.is_active ? void onDeactivateAssistant(user) : void onActivateAssistant(user)
                                }
                                disabled={
                                  deletingAssistantId === user.user_id ||
                                  activatingAssistantId === user.user_id ||
                                  deactivatingAssistantId === user.user_id
                                }
                              >
                                {activatingAssistantId === user.user_id
                                  ? "Activating..."
                                  : deactivatingAssistantId === user.user_id
                                    ? "Deactivating..."
                                    : user.is_active
                                      ? "Deactivate"
                                      : "Activate"}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-8 border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                                onClick={() => onDeleteAssistant(user)}
                                disabled={
                                  deletingAssistantId === user.user_id ||
                                  activatingAssistantId === user.user_id ||
                                  deactivatingAssistantId === user.user_id
                                }
                              >
                                {deletingAssistantId === user.user_id ? "Deleting..." : "Delete"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {assistants.map((user) => (
                    <div
                      key={user.user_id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {user.profile_image ? (
                            <Image
                              src={user.profile_image}
                              alt={`${user.name} profile`}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                              {user.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                          </div>
                        </div>
                        <span
                          className={
                            user.is_active
                              ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                              : "rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                          }
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</p>
                        <p className="text-sm uppercase text-slate-700 dark:text-slate-300">{user.role}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          onClick={() => openEditModal(user)}
                          disabled={
                            deletingAssistantId === user.user_id ||
                            activatingAssistantId === user.user_id ||
                            deactivatingAssistantId === user.user_id
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className={
                            user.is_active
                              ? "h-8 border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-950/30"
                              : "h-8 border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                          }
                          onClick={() => (user.is_active ? void onDeactivateAssistant(user) : void onActivateAssistant(user))}
                          disabled={
                            deletingAssistantId === user.user_id ||
                            activatingAssistantId === user.user_id ||
                            deactivatingAssistantId === user.user_id
                          }
                        >
                          {activatingAssistantId === user.user_id
                            ? "Activating..."
                            : deactivatingAssistantId === user.user_id
                              ? "Deactivating..."
                              : user.is_active
                                ? "Deactivate"
                                : "Activate"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                          onClick={() => onDeleteAssistant(user)}
                          disabled={
                            deletingAssistantId === user.user_id ||
                            activatingAssistantId === user.user_id ||
                            deactivatingAssistantId === user.user_id
                          }
                        >
                          {deletingAssistantId === user.user_id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {deleteError ? <p className="mt-3 text-sm text-red-600">{deleteError}</p> : null}
            {activateError ? <p className="mt-3 text-sm text-red-600">{activateError}</p> : null}
            {deactivateError ? <p className="mt-3 text-sm text-red-600">{deactivateError}</p> : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {startItem}-{endItem} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1 || isPaginationDisabled}
                >
                  Previous
                </Button>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  Page {currentPage} of {Math.max(totalPages, 1)}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.max(totalPages, 1)))}
                  disabled={currentPage >= Math.max(totalPages, 1) || isPaginationDisabled}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {updateSuccessPopup ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-xl dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{updateSuccessPopup}</p>
          </div>
        </div>
      ) : null}

      {assistantToDelete ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete Assistant</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Do you Really Wanted To Delete This assistant ({assistantToDelete.name})?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeDeleteModal} disabled={Boolean(deletingAssistantId)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                onClick={() => void confirmDeleteAssistant()}
                disabled={Boolean(deletingAssistantId)}
              >
                {deletingAssistantId ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editingAssistant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Update Assistant</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Edit assistant details and save changes.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={closeEditModal}>
                Close
              </Button>
            </div>

            <form className="space-y-4" onSubmit={handleEditSubmit(onUpdateSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Name</span>
                  <Input placeholder="Assistant Name" {...registerEdit("name")} />
                  {editErrors.name ? <p className="text-xs text-red-600">{editErrors.name.message}</p> : null}
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Email</span>
                  <Input type="email" placeholder="assistant@company.com" {...registerEdit("email")} />
                  {editErrors.email ? <p className="text-xs text-red-600">{editErrors.email.message}</p> : null}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Address line 1</span>
                  <Input placeholder="House no. 67" {...registerEdit("addressLine1")} />
                  {editErrors.addressLine1 ? (
                    <p className="text-xs text-red-600">{editErrors.addressLine1.message}</p>
                  ) : null}
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Address line 2</span>
                  <Input placeholder="chandigarh" {...registerEdit("addressLine2")} />
                  {editErrors.addressLine2 ? (
                    <p className="text-xs text-red-600">{editErrors.addressLine2.message}</p>
                  ) : null}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">City</span>
                  <Input placeholder="chandigarh" {...registerEdit("city")} />
                  {editErrors.city ? <p className="text-xs text-red-600">{editErrors.city.message}</p> : null}
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Province</span>
                  <Input placeholder="chandigarh" {...registerEdit("province")} />
                  {editErrors.province ? <p className="text-xs text-red-600">{editErrors.province.message}</p> : null}
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Country</span>
                  <Input placeholder="India" {...registerEdit("country")} />
                  {editErrors.country ? <p className="text-xs text-red-600">{editErrors.country.message}</p> : null}
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Postal code</span>
                  <Input placeholder="108306" {...registerEdit("postalCode")} />
                  {editErrors.postalCode ? <p className="text-xs text-red-600">{editErrors.postalCode.message}</p> : null}
                </label>
              </div>

              {editError ? <p className="text-sm text-red-600">{editError}</p> : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" disabled={updateAssistantMutation.isPending}>
                  {updateAssistantMutation.isPending ? "Saving..." : "Save Changes"}
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


