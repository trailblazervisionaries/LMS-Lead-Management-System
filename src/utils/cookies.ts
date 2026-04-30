const TOKEN_KEY = "lms_token";
const ROLE_KEY = "lms_role";

const DEFAULT_COOKIE_OPTIONS = "Path=/; SameSite=Lax";

export function setAuthCookies(token: string, role: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_KEY}=${token}; ${DEFAULT_COOKIE_OPTIONS}`;
  document.cookie = `${ROLE_KEY}=${role}; ${DEFAULT_COOKIE_OPTIONS}`;
}

export function clearAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_KEY}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${ROLE_KEY}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export const authCookieKeys = {
  token: TOKEN_KEY,
  role: ROLE_KEY
};
