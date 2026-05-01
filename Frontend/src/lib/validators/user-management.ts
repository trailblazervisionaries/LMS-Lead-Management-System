import { z } from "zod";

export const createAssistantSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().email("Please enter a valid email"),
    addressLine1: z.string().trim().min(2, "Address line 1 is required"),
    addressLine2: z.string().trim().min(2, "Address line 2 is required"),
    city: z.string().trim().min(2, "City is required"),
    province: z.string().trim().min(2, "Province is required"),
    country: z.string().trim().min(2, "Country is required"),
    postalCode: z.string().trim().min(3, "Postal code is required")
  });

export type CreateAssistantSchemaValues = z.infer<typeof createAssistantSchema>;
