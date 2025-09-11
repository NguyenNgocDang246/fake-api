import { NextRequest, NextResponse } from "next/server";
import authMiddleware from "./middlewares/auth.middleware";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  if (url.pathname.startsWith("/api/auth/login")) return NextResponse.next();
  if (url.pathname.startsWith("/api/auth/register")) return NextResponse.next();
  if (url.pathname.startsWith("/api/auth/refresh-token")) return NextResponse.next();
  if (url.pathname.startsWith("/api")) return authMiddleware(req);
  return NextResponse.next();
}
