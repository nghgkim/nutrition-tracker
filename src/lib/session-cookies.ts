import type { NextResponse } from "next/server";
import { signToken, AUTH_COOKIE } from "./auth";
import { createRefreshToken, REFRESH_COOKIE, refreshCookieOptions } from "./refresh-token";

const ACCESS_MAX_AGE = 7 * 24 * 60 * 60;

/** Sets a fresh access JWT plus a refresh cookie. Pass an already-rotated token to avoid double insert. */
export async function setSessionCookies(
  res: NextResponse,
  userId: string,
  email: string,
  rotatedRefresh?: string,
): Promise<void> {
  const access = await signToken({ userId, email });
  const refresh = rotatedRefresh ?? (await createRefreshToken(userId));
  res.cookies.set(AUTH_COOKIE, access, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookies.set(REFRESH_COOKIE, refresh, refreshCookieOptions());
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(AUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...refreshCookieOptions(), maxAge: 0 });
}
