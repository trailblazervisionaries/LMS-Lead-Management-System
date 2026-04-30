import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const forgotPasswordEmailSchema = z.object({
  email: z.string().email("Please enter a valid email")
});

export const resetPasswordSchema = z
  .object({
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters")
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

export type LoginSchemaValues = z.infer<typeof loginSchema>;
export type ForgotPasswordEmailSchemaValues = z.infer<typeof forgotPasswordEmailSchema>;
export type ResetPasswordSchemaValues = z.infer<typeof resetPasswordSchema>;
