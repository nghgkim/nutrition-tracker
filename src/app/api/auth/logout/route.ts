import { NextResponse } from "next/server";
import { revokeRefreshToken } from "@/lib/refresh-token";
import { clearSessionCookies } from "@/lib/session-cookies";

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const raw = cookie.split(";").map(c => c.trim()).find(c => c.startsWith("nt_refresh="))?.slice("nt_refresh=".length);
  await revokeRefreshToken(raw);
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
