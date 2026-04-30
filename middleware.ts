import { NextRequest, NextResponse } from "next/server";
import { authCookieKeys } from "@/utils/cookies";

const PUBLIC_PATHS = ["/login", "/forgot-password"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

function getDashboardPath(role: string | undefined) {
  if (role === "admin") return "/admin";
  if (role === "sales") return "/assistant";
  if (role === "assistant") return "/assistant";
  return "/login";
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(authCookieKeys.token)?.value;
  const role = request.cookies.get(authCookieKeys.role)?.value;
  const isAuthenticated = Boolean(token);

  if (isPublicPath(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/assistant", request.url));
    }
  }

  if (pathname.startsWith("/assistant")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (role !== "assistant") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  if (pathname.startsWith("/sales")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL("/assistant", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/forgot-password", "/admin/:path*", "/assistant/:path*", "/sales/:path*"]
};
