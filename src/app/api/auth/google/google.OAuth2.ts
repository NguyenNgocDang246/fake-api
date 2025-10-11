import { google } from "googleapis";
const DOMAIN = process.env["DOMAIN"];
const oauth2Client = new google.auth.OAuth2(
  process.env["GOOGLE_CLIENT_ID"]!,
  process.env["GOOGLE_CLIENT_SECRET"]!,
  `${DOMAIN}/api/auth/google/callback`
);

export { oauth2Client };
