import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { REFRESH_COOKIE, rotateRefreshToken, safeNextPath } from "@/lib/refresh-token";
import { setSessionCookies, clearSessionCookies } from "@/lib/session-cookies";

async function rotate() {
  const raw = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!raw) return null;
  try {
    return await rotateRefreshToken(raw);
  } catch {
    return null;
  }
}

async function emailFor(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return user?.email || "";
}

export async function POST() {
  const result = await rotate();
  if (!result) {
    const res = NextResponse.json(problemResponse("Invalid refresh token", 401), { status: 401 });
    clearSessionCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  await setSessionCookies(res, result.userId, await emailFor(result.userId), result.token);
  return res;
}

export async function GET(req: Request) {
  const next = safeNextPath(new URL(req.url).searchParams.get("next"));
  const result = await rotate();
  // Relative Location: the container sees an internal origin (0.0.0.0:3000),
  // while the browser must stay on the public tunnel host.
  const res = new NextResponse(null, { status: 303, headers: { Location: result ? next : "/login" } });
  if (result) {
    await setSessionCookies(res, result.userId, await emailFor(result.userId), result.token);
  } else {
    clearSessionCookies(res);
  }
  return res;
}
