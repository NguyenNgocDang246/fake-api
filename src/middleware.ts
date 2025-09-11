import { NextRequest, NextResponse } from "next/server";
import authMiddleware from "./middlewares/auth.middleware";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  if (url.pathname.startsWith("/api/auth")) return authMiddleware(req);
  return NextResponse.next();
}
