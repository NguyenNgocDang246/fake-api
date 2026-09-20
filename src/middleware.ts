import { NextRequest, NextResponse } from "next/server";
import authMiddleware from "@/server/middlewares/auth.middleware";
import fakeMiddleware from "@/server/middlewares/fake.middleware";
import guestMiddleware from "@/server/middlewares/guest.middleware";
import { GUEST_SANDBOX_ROUTE } from "@/server/services/guest.constants";
import { API_ROUTES } from "@/app/libs/routes";
import { ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS } from "@/server/services/auth/auth.constants";

export interface MiddlewareContext {
  userId?: string;
  role?: string;
  refreshedAccessToken?: string;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const ctx: MiddlewareContext = {};
  // A mock is decided by host alone and never carries a session, so it goes before any auth work.
  const checkFake = fakeMiddleware(req);
  if (checkFake) return checkFake;

  // `next.config.ts` turns Next's own trailing-slash redirect off for the sake of mock hosts, so the
  // app's host gets it here. A plain `URL`, because with that setting `NextURL` puts the slash back.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    const target = new URL(url.href);
    target.pathname = target.pathname.replace(/\/+$/, "") || "/";
    return NextResponse.redirect(target, 308);
  }

  // guest, both branches are for visitors with no session at all
  if (url.pathname.startsWith(GUEST_SANDBOX_ROUTE)) return NextResponse.next();
  const guestResult = await guestMiddleware(req);
  if (guestResult) return guestResult;
  if (url.pathname.startsWith(API_ROUTES.AUTH.LOGIN)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.REGISTER)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.LOGOUT)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.REFRESH_TOKEN)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.GOOGLE.LOGIN)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.PASSWORD.FORGOT)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.PASSWORD.RESET)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.EMAIL.VERIFY)) return NextResponse.next();
  if (url.pathname.startsWith(API_ROUTES.AUTH.EMAIL.RESEND)) return NextResponse.next();

  const isApiRoute = url.pathname.startsWith("/api/");
  const authResult = await authMiddleware({ req, ctx, isApiRoute });
  if (authResult) return authResult;

  const res = NextResponse.next({ request: req });
  Object.entries(ctx).forEach(([key, value]) => {
    if (key !== "refreshedAccessToken" && value !== undefined) res.headers.set(`x-${key}`, String(value));
  });

  if (ctx.refreshedAccessToken) {
    res.cookies.set("access_token", ctx.refreshedAccessToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS,
      path: "/",
    });
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|css|js|woff2?|ttf|map)$).*)",
    // On a mock host a static-looking path is still a mock path. Next reads `config` without
    // running it, so this is a literal copy of the project id alphabet, kept in step by a test.
    { source: "/:path*", has: [{ type: "host", value: "[2-9a-km-z]{12}\\..+" }] },
  ],
  runtime: "nodejs",
};
