import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getSecret } from "@/lib/secret";

function jwtSecret(): Uint8Array {
  return new TextEncoder().encode(getSecret("JWT_SECRET"));
}

const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/reminders/tick"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/icon") || pathname.startsWith("/logo") || pathname.startsWith("/manifest") || pathname.startsWith("/sw.js")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("nt_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, jwtSecret());
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
