import { jwtDecode } from "jwt-decode";
import api from "@/api/axios";
import { getApiErrorMessage } from "@/utils/api-error";
import {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginPayload,
  LoginResponse,
  JwtPayload,
  ResetPasswordPayload,
  ResetPasswordResponse
} from "@/types/auth/auth";

interface LoginApiResponse {
  user_id: string;
  email: string;
  role: "admin" | "assistant";
  access_token: string;
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
  try {
    const response = await api.post<ForgotPasswordResponse>("/api/users/public/forgot-password", payload);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to send OTP"));
  }
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  try {
    const response = await api.post<ResetPasswordResponse>("/api/users/public/reset-password", {
      email: payload.email,
      otp: payload.otp,
      new_password: payload.newPassword
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to reset password"));
  }
}

export async function logoutUser() {
  try {
    await api.post("/api/users/logout");
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Logout failed"));
  }
}

export function decodeToken(token: string): JwtPayload {
  return jwtDecode<JwtPayload>(token);
}

