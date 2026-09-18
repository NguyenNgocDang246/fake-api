import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Next's own redirect answers before middleware and without CORS headers, which a browser
  // calling a mock reads as a failure. `src/middleware.ts` redirects the app's own host instead.
  skipTrailingSlashRedirect: true,
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
