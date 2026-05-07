"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateAssistant } from "@/hooks/use-create-assistant";
import { createAssistantSchema, CreateAssistantSchemaValues } from "@/lib/validators/user-management";
import { AssistantUser, CreateAssistantPayload } from "@/types/assistants/user-management";

export default function AdminUserManagementPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [createdUsers, setCreatedUsers] = useState<AssistantUser[]>([]);
  const createAssistantMutation = useCreateAssistant();
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
        setSubmitSuccess(response.message);
        setCreatedUsers((prev) => [response.assistant, ...prev.filter((user) => user.id !== response.assistant.id)]);
        reset();
      },
      onError: (error) => {
        setSubmitError(error instanceof Error ? error.message : "Unable to create assistant");
      }
    });
  };

  return (
    <>
      <section className="space-y-6">
        {/* <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">User Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create assistant accounts and manage team access from one place.
          </p>
        </div> */}

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
              Total: {createdUsers.length}
            </span>
          </div>

          {!createdUsers.length ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No users created yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/70">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Name</th>
                    <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Email</th>
                    <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Role</th>
                    <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Address</th>
                  </tr>
                </thead>
                {/* <tbody>
                  {createdUsers.map((user) => (
                    <tr key={user.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{user.name}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{user.email}</td>
                      <td className="px-3 py-2 uppercase text-slate-500 dark:text-slate-300">{user.role}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                        {user.address_line_1}, {user.address_line_2}, {user.city}, {user.province}, {user.country} -{" "}
                        {user.postal_code}
                      </td>
                    </tr>
                  ))}
                </tbody> */}
              </table>
            </div>
          )}
        </Card>
      </section>
    </>
  );
}


