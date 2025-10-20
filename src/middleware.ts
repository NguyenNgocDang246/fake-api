import { NextRequest, NextResponse } from "next/server";
import authMiddleware from "@/server/middlewares/auth.middleware";
import fakeMiddleware, { FakeAPIPrefix } from "@/server/middlewares/fake.middleware";
import { API_ROUTES } from "@/app/libs/routes";

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
  if (url.pathname.startsWith(API_ROUTES.AUTH.LOGIN)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.REGISTER)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.REFRESH_TOKEN)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.GOOGLE.LOGIN)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.PASSWORD.FORGOT)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.PASSWORD.RESET)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.EMAIL.VERIFY)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.EMAIL.RESEND)) return NextResponse.next();

  if (url.pathname.startsWith("/api/")) {
    const res = await authMiddleware({ ctx });
    if (res) return res;
  }
  // check fake
  const segments = url.pathname.split("/").filter(Boolean);
  const publicId = segments[0] ?? "";
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
