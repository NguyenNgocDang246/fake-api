import { NextRequest, NextResponse } from "next/server";
import authMiddleware from "@/server/middlewares/auth.middleware";

export interface MiddlewareContext {
  userId?: string;
  role?: string;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const ctx: MiddlewareContext = {};
  // server
  if (url.pathname.startsWith("/api/auth/login")) return NextResponse.next();
  if (url.pathname.startsWith("/api/auth/register")) return NextResponse.next();
  if (url.pathname.startsWith("/api/auth/refresh-token")) return NextResponse.next();

  if (url.pathname.startsWith("/api")) {
    const res = await authMiddleware({ ctx });
    if (res) return res;
  }

  const res = NextResponse.next();
  Object.entries(ctx).forEach(([key, value]) => {
    if (value !== undefined) res.headers.set(`x-${key}`, String(value));
  });

  return res;
}
