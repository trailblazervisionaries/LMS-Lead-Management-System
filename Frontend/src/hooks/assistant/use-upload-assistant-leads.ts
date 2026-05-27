"use client";

import { useMutation } from "@tanstack/react-query";
import { uploadAssistantLeads } from "@/services/assistant/lead-service";

interface UploadAssistantLeadsInput {
  templateId: string;
  adminId: string;
  file: File;
}

export function useUploadAssistantLeads() {
  return useMutation({
    mutationFn: ({ templateId, adminId, file }: UploadAssistantLeadsInput) => uploadAssistantLeads(templateId, adminId, file)
  });
}
