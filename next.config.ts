import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
