import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

let client: OAuth2Client | undefined;

export function getOauth2Client() {
  if (!client) {
    const DOMAIN = process.env["DOMAIN"];
    client = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"]!,
      process.env["GOOGLE_CLIENT_SECRET"]!,
      `${DOMAIN}/api/auth/google/callback`
    );
  }

  return client;
}
