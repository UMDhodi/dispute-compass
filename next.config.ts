import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "@prisma/client", "pdfjs-dist"],

  // ── Security: HTTP response headers ──────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Stop referrer leakage
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy — disable unneeded browser APIs
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js hot-reload + Google Fonts styles
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Google Fonts font files
              "font-src 'self' https://fonts.gstatic.com",
              // Next.js inlines scripts; allow same-origin scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // API calls: same origin + NVIDIA NIM
              "connect-src 'self' https://integrate.api.nvidia.com",
              // No framing allowed
              "frame-ancestors 'none'",
              // No plugins
              "object-src 'none'",
              // Upgrade insecure requests in production
              ...(process.env.NODE_ENV === "production"
                ? ["upgrade-insecure-requests"]
                : []),
            ].join("; "),
          },
          // HSTS — only in production
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
