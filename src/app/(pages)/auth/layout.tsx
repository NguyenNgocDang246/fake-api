import type { Metadata } from "next";

// Every page under /auth is thin, sign-in-only content. Layout metadata merges down, so
// this one export covers login, register, email verification and both password flows.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // These pages are short enough that the card ends up sitting right on top of the shared
  // footer, so they carry their own bottom gap rather than every page paying for one.
  return <div className="pb-16">{children}</div>;
}
