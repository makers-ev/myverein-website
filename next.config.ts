import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Dockerfile.website's multi-stage build (copies .next/standalone).
  output: "standalone",
  allowedDevOrigins: ['192.168.0.201','localhost'],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Defense in depth alongside src/proxy.ts's per-request CSP /
          // X-Frame-Options / Referrer-Policy -- Permissions-Policy isn't
          // set there, so it's added here.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
