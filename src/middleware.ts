import { NextRequest, NextResponse } from "next/server";
import authMiddleware from "@/server/middlewares/auth.middleware";
import fakeMiddleware, { FakeAPIPrefix } from "@/server/middlewares/fake.middleware";

export interface MiddlewareContext {
  userId?: string;
  role?: string;
  fake?: { projectId: bigint; pathname: string };
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const ctx: MiddlewareContext = {};
  // fake
  if (url.pathname.startsWith(FakeAPIPrefix)) return NextResponse.next();
  // server
  if (url.pathname.startsWith("/api/auth/login")) return NextResponse.next();
  if (url.pathname.startsWith("/api/auth/register")) return NextResponse.next();
  if (url.pathname.startsWith("/api/auth/refresh-token")) return NextResponse.next();
  if (url.pathname.startsWith("/api/auth/google")) return NextResponse.next();

  if (url.pathname.startsWith("/api/")) {
    const res = await authMiddleware({ ctx });
    if (res) return res;
  }
  // check fake
  const segments = url.pathname.split("/").filter(Boolean);
  const publicId = segments[0];
  const checkFake = fakeMiddleware(req, publicId);
  if (checkFake) return checkFake;

  const res = NextResponse.next();
  Object.entries(ctx).forEach(([key, value]) => {
    if (value !== undefined) res.headers.set(`x-${key}`, String(value));
  });

  return res;
}

export const config = {
  matcher: ["/((?!_next|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|css|js|woff2?|ttf|map)$).*)"],
};
