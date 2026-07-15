"use client";

import { useMutation } from "@tanstack/react-query";
import { uploadAdminImage } from "@/services/admin/user-management-service";

export function useUploadAdminImage() {
  return useMutation({
    mutationFn: (file: File) => uploadAdminImage(file)
  });
}
