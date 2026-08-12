import { NextRequest, NextResponse } from "next/server";

// 백엔드 SESSION_COOKIE_NAME(BACKEND_SPEC.md 1장)과 동일해야 한다.
const SESSION_COOKIE_NAME = "bbot_sid";

export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasSession ? "/dashboard" : "/login", req.url),
    );
  }

  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) &&
    !hasSession
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/admin/:path*"],
};
