import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://ai.sumopod.com https://oaidalleapiprodscus.blob.core.windows.net https://*.fal.media https://*.fal.ai https://storage.googleapis.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ai.sumopod.com https://api.iconify.design",
      "media-src 'self' blob: https://*.supabase.co https://*.fal.media https://*.fal.ai https://storage.googleapis.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Standalone output for Docker deployment
  output: "standalone",

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "ai.sumopod.com",
      },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
      },
      // fal.ai CDN for generated images
      {
        protocol: "https",
        hostname: "**.fal.media",
      },
      {
        protocol: "https",
        hostname: "fal.media",
      },
      {
        protocol: "https",
        hostname: "v3.fal.media",
      },
      {
        protocol: "https",
        hostname: "**.fal.ai",
      },
      // Google Cloud Storage (Kling AI videos)
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Enable compression
  compress: true,

  // Bundle optimization
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
