export type LeadFieldKey = "name" | "email" | "phone" | "company" | "source" | "status";

export interface LeadFieldDefinition {
  key: LeadFieldKey;
  label: string;
  placeholder: string;
  aliases: string[];
}

export interface FormTemplateField {
  name?: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  order?: number;
}

export interface FormTemplateItem {
  id: string;
  is_active: boolean;
  schema_definition?: {
    form_id?: string;
    fields?: FormTemplateField[];
  };
}

export interface AssistantLeadAddResponse {
  message?: string;
}

export interface AssistantLeadUploadResponse {
  message?: string;
}
