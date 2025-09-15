import { NextRequest, NextResponse } from "next/server";
import authMiddleware from "@/server/middlewares/auth.middleware";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  // server
  if (url.pathname.startsWith("/api/auth/login")) return NextResponse.next();
  if (url.pathname.startsWith("/api/auth/register")) return NextResponse.next();
  if (url.pathname.startsWith("/api/auth/refresh-token")) return NextResponse.next();
  if (url.pathname.startsWith("/api")) return await authMiddleware();

  return NextResponse.next();
}
