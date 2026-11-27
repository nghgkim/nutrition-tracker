import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { setSessionCookies } from "@/lib/session-cookies";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json(problemResponse("Email and password required", 400), { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(problemResponse("Password must be at least 6 characters", 400), { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(problemResponse("Email already registered", 409), { status: 409 });
    }
    const user = await prisma.user.create({
      data: { email, name: name ?? null, password: await hashPassword(password) },
    });
    await prisma.goal.create({ data: { userId: user.id } });
    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
    await setSessionCookies(res, user.id, user.email);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(problemResponse("Server error", 500), { status: 500 });
  }
}
