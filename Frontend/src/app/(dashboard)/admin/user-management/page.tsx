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
import { createAssistantSchema, CreateAssistantSchemaValues } from "@/lib/validators/user-management";
import { AssistantListItem, CreateAssistantPayload } from "@/types/assistants/user-management";

const PAGE_SIZE = 10;

export default function AdminUserManagementPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [updateSuccessPopup, setUpdateSuccessPopup] = useState<string | null>(null);
  const [editingAssistant, setEditingAssistant] = useState<AssistantListItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  const createAssistantMutation = useCreateAssistant();
  const updateAssistantMutation = useUpdateAssistant();
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
          const successMessage = response.message || "Assistant updated successfully.";
          setSubmitSuccess(null);
          setUpdateSuccessPopup("Assistant updated successfully.");
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

  useEffect(() => {
    if (!updateSuccessPopup) return;
    const timer = setTimeout(() => {
      setUpdateSuccessPopup(null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [updateSuccessPopup]);

  return (
    <>
      <section className="space-y-6">
      

        <Card className="rounded-2xl">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Assistant</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Fill all required details to create a new assistant user.
            </p>
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
                <Input placeholder="chandigarh" {...register("city")} />
                {errors.city ? <p className="text-xs text-red-600">{errors.city.message}</p> : null}
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Province</span>
                <Input placeholder="chandigarh" {...register("province")} />
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

            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
            {submitSuccess ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{submitSuccess}</p> : null}

            <div className="flex flex-wrap gap-3 pt-2">
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

        <Card className="rounded-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Created Users</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Total: {totalCount}
            </span>
          </div>

          {assistantsQuery.isLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading users...</p>
          ) : assistantsQuery.isError ? (
            <p className="text-sm text-red-600">
              {assistantsQuery.error instanceof Error ? assistantsQuery.error.message : "Unable to load users"}
            </p>
          ) : !assistants.length ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No users found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/70">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Profile Image</th>
                    <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Name</th>
                    <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Email</th>
                    <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Role</th>
                    <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Address</th>
                    <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assistants.map((user) => (
                    <tr key={user.user_id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                        {user.profile_image ? (
                          <img
                            src={user.profile_image}
                            alt={`${user.name} profile`}
                            className="h-10 w-10 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {user.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{user.name}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{user.email}</td>
                      <td className="px-3 py-2 uppercase text-slate-500 dark:text-slate-300">{user.role}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                        {user.address
                          ? [
                              user.address.address_line_1,
                              user.address.address_line_2,
                              user.address.city,
                              user.address.province,
                              user.address.country,
                              user.address.postal_code
                            ]
                              .filter(Boolean)
                              .join(", ")
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          onClick={() => openEditModal(user)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
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
        </Card>
      </section>

      {updateSuccessPopup ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-5 py-4 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{updateSuccessPopup}</p>
          </div>
        </div>
      ) : null}

      {editingAssistant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
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
