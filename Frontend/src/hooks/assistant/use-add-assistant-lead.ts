"use client";

import { useMutation } from "@tanstack/react-query";
import { addAssistantLead } from "@/services/assistant/lead-service";

interface AddAssistantLeadInput {
  templateId: string;
  submittedData: Record<string, string>;
}

export function useAddAssistantLead() {
  return useMutation({
    mutationFn: ({ templateId, submittedData }: AddAssistantLeadInput) => addAssistantLead(templateId, submittedData)
  });
}
