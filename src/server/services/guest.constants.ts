// Literals and enums only: `src/middleware.ts` imports this file, so it must never pull in
// Prisma or a service.

export const GUEST_EMAIL = "guest@guest.local";
export const GUEST_EMAIL_SUFFIX = "@guest.local";
export const GUEST_USER_NAME = "Guest";

export const GUEST_PROJECT_LIFETIME_IN_SECONDS = 24 * 60 * 60;

export const GUEST_SANDBOX_ROUTE = "/api/guest/sandbox";
export const GUEST_PROXY_PREFIX = "/api/guest/project/";
export const PROJECT_API_PREFIX = "/api/project/";

export const GUEST_RATE_LIMIT_CALLS = 100;
export const GUEST_RATE_LIMIT_WINDOW_SECONDS = 24 * 60 * 60;

export enum GUEST_MESSAGES {
  TOO_MANY_SANDBOXES = "Too many trial sandboxes from this address. Please try again later.",
  // Separate from the one above: that caller asked too often, this one arrived while every
  // trial slot was taken, and the fix for it is signing up rather than waiting a minute.
  TRIAL_FULL = "The trial is full right now. Please try again later, or create an account.",
  GUEST_EMAIL_NOT_ALLOWED = "This email domain is reserved. Please use a different email.",
}
