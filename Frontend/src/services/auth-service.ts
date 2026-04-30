import { jwtDecode } from "jwt-decode";
import {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginPayload,
  LoginResponse,
  JwtPayload,
  ResetPasswordPayload,
  ResetPasswordResponse,
  UserRole
} from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";

const MOCK_USERS: Record<string, { id: string; name: string; password: string; role: UserRole }> = {
  "admin@lms.com": {
    id: "1",
    name: "System Admin",
    password: "admin123",
    role: "admin"
  },
  "assistant@lms.com": {
    id: "2",
    name: "CRM Assistant",
    password: "assistant123",
    role: "assistant"
  },
  "sales@lms.com": {
    id: "2",
    name: "CRM Assistant",
    password: "sales123",
    role: "assistant"
  }
};

const MOCK_RESET_OTP = new Map<string, { otp: string; expiresAt: number }>();

function encodeJwt(payload: JwtPayload) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function buildMockLogin(payload: LoginPayload): LoginResponse {
  const found = MOCK_USERS[payload.email];
  if (!found || found.password !== payload.password) {
    throw new Error("Invalid credentials");
  }

  const token = encodeJwt({
    sub: found.id,
    email: payload.email,
    name: found.name,
    role: found.role
  });

  return {
    token,
    user: {
      id: found.id,
      email: payload.email,
      name: found.name,
      role: found.role
    }
  };
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  if (USE_MOCK_AUTH || !API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return buildMockLogin(payload);
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  return response.json();
}

export async function requestPasswordReset(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
  if (USE_MOCK_AUTH || !API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const user = MOCK_USERS[payload.email];
    if (!user) {
      throw new Error("No account found for this email");
    }

    const otp = generateOtp();
    MOCK_RESET_OTP.set(payload.email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    return {
      message: "OTP sent to your email",
      otp
    };
  }

  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Unable to send OTP");
  }

  return response.json();
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  if (USE_MOCK_AUTH || !API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const user = MOCK_USERS[payload.email];
    if (!user) {
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

    user.password = payload.newPassword;
    MOCK_RESET_OTP.delete(payload.email);

    return { message: "Password reset successful" };
  }

  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Unable to reset password");
  }

  return response.json();
}

export function decodeToken(token: string): JwtPayload {
  return jwtDecode<JwtPayload>(token);
}
