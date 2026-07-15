"use client";
import { useMutation } from "@tanstack/react-query";
import { uploadAssistantImage } from "@/services/assistant/profile-service";

export function useUploadAssistantImage() {
  return useMutation({
    mutationFn: (file: File) => uploadAssistantImage(file)
  });
}
