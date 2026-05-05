import { jwtDecode } from "jwt-decode";
import axios from "axios";
import api from "@/api/axios";
import {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginPayload,
  LoginResponse,
  JwtPayload,
  ResetPasswordPayload,
  ResetPasswordResponse
} from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";

const MOCK_RESET_OTP = new Map<string, { otp: string; expiresAt: number }>();
const MOCK_PASSWORD_RESET_USERS = new Map<string, string>();

interface LoginApiResponse {
  user_id: string;
  email: string;
  role: "admin" | "assistant";
  access_token: string;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === "string") {
      return responseData;
    }
    if (responseData && typeof responseData === "object" && "message" in responseData) {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === "string") {
        return message;
      }
    }
    if (responseData && typeof responseData === "object" && "detail" in responseData) {
      const detail = (responseData as { detail?: unknown }).detail;
      if (typeof detail === "string") {
        return detail;
      }
    }
  }

  return fallbackMessage;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  try {
    const response = await api.post<LoginApiResponse>("/api/users/public/login", payload);
    const displayName = response.data.email.split("@")[0];

    return {
      token: response.data.access_token,
      user: {
        id: response.data.user_id,
        email: response.data.email,
        name: displayName,
        role: response.data.role
      }
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Login failed"));
  }
}

export async function requestPasswordReset(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
  if (USE_MOCK_AUTH || !API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 350));

    const otp = generateOtp();
    MOCK_RESET_OTP.set(payload.email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    MOCK_PASSWORD_RESET_USERS.set(payload.email, payload.email);

    return {
      message: "OTP sent to your email",
      otp
    };
  }

  try {
    const response = await api.post<ForgotPasswordResponse>("/auth/forgot-password", payload);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to send OTP"));
  }
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  if (USE_MOCK_AUTH || !API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const userExists = MOCK_PASSWORD_RESET_USERS.has(payload.email);
    if (!userExists) {
      throw new Error("No account found for this email");
    }

    const otpRecord = MOCK_RESET_OTP.get(payload.email);
    if (!otpRecord) {
      throw new Error("Please request OTP first");
    }

    if (Date.now() > otpRecord.expiresAt) {
      MOCK_RESET_OTP.delete(payload.email);
      throw new Error("OTP expired. Please request a new one");
    }

    if (otpRecord.otp !== payload.otp) {
      throw new Error("Invalid OTP");
    }

    MOCK_RESET_OTP.delete(payload.email);

    return { message: "Password reset successful" };
  }

  try {
    const response = await api.post<ResetPasswordResponse>("/auth/reset-password", payload);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to reset password"));
  }
}

export function decodeToken(token: string): JwtPayload {
  return jwtDecode<JwtPayload>(token);
}
