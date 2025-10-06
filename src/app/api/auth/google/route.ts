import { oauth2Client } from "@/app/api/auth/google/google.OAuth2";
import { NextResponse } from "next/server";

export async function GET() {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
  });

  return NextResponse.redirect(url);
}
