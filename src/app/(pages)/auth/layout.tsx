import type { Metadata } from "next";

// Every page under /auth is thin, sign-in-only content. Layout metadata merges down, so
// this one export covers login, register, email verification and both password flows.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
