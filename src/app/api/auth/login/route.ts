import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { setSessionCookies } from "@/lib/session-cookies";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(problemResponse("Email and password required", 400), { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(problemResponse("Invalid credentials", 401), { status: 401 });
    }
    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    await setSessionCookies(res, user.id, user.email);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(problemResponse("Server error", 500), { status: 500 });
  }
}
