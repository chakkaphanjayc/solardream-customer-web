import { resolve as resolvePath } from "node:path";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const isDevelopment = process.env.NODE_ENV === "development";
const isCloudflareBuild = process.env.SOLARDREAM_CLOUDFLARE_BUILD === "1";
const projectRoot = process.cwd();
const cloudflareAotManifestPath = "./.cloudflare/elysia-compiled.mjs";
const configuredDeploymentId = process.env.NEXT_DEPLOYMENT_ID?.trim();
const deploymentId = configuredDeploymentId || (isDevelopment ? `customer-local-${process.pid}` : undefined);

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self' https://*.clarity.ms https://c.bing.com",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://liff.line.me https://unpkg.com https://cdnjs.cloudflare.com https://umami.solar-dream.org https://www.clarity.ms https://*.clarity.ms",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "worker-src 'self' blob: https://unpkg.com https://cdnjs.cloudflare.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://placehold.co https://*.supabase.co https://lh3.googleusercontent.com https://drive.google.com https://*.googleusercontent.com https://*.line-scdn.net https://*.clarity.ms https://c.bing.com",
      "connect-src 'self' https://solar-dream.org https://*.supabase.co https://api.line.me https://access.line.me https://liff.line.me https://static.cloudflareinsights.com https://challenges.cloudflare.com https://geocoding-api.open-meteo.com https://tiles.openfreemap.org https://server.arcgisonline.com https://nominatim.openstreetmap.org wss://*.pusher.com https://*.pusher.com https://unpkg.com https://cdnjs.cloudflare.com https://umami.solar-dream.org https://*.clarity.ms https://c.bing.com",
      "frame-src 'self' https://liff.line.me https://access.line.me https://challenges.cloudflare.com",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-Accel-Buffering", value: "no" },
];

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.93", "192.168.1.119"],
  devIndicators: false,
  productionBrowserSourceMaps: false,
  output: "standalone",
  // Next's Cache Components runtime uses timer-backed cache signals that can
  // outlive the request in Cloudflare Workers. That makes a later request try
  // to perform I/O in the previous request's IoContext and results in a 1101.
  // Keep the Node.js dev/prod runtime aligned so route-level `instant = false`
  // boundaries are compiled and verified the same way locally and in release
  // builds; Cloudflare continues to use the stable Next cache API instead.
  cacheComponents: !isCloudflareBuild,
  outputFileTracingRoot: projectRoot,
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@opentelemetry/api/build/**/*"],
  },
  turbopack:
    isDevelopment
      ? { root: projectRoot }
      : isCloudflareBuild
        ? { resolveAlias: { "elysia/compiled": cloudflareAotManifestPath } }
        : undefined,
  webpack(config) {
    if (isCloudflareBuild) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "elysia/compiled": resolvePath(projectRoot, cloudflareAotManifestPath),
      };
    }
    return config;
  },
  deploymentId,
  serverExternalPackages: [
    "@react-pdf/renderer",
    "pdfjs-dist",
    "pdf-lib",
    "qrcode",
    "sharp",
    "@signpdf/placeholder-pdf-lib",
    "@signpdf/signpdf",
    "@signpdf/signer-p12",
    "node-forge",
    "@qlever-llc/verify-pdf",
    "googleapis",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/asset/sd-logo.png", permanent: true },
      { source: "/:locale/my-proposals", destination: "/:locale/proposals", permanent: true },
      { source: "/my-proposals", destination: "/th/proposals", permanent: true },
    ];
  },
  experimental: {
    webpackBuildWorker: true,
    preloadEntriesOnStart: false,
    turbopackFileSystemCacheForDev: isDevelopment ? false : undefined,
    turbopackSourceMaps: isDevelopment ? false : undefined,
    turbopackInputSourceMaps: isDevelopment ? false : undefined,
    serverActions: { bodySizeLimit: "12mb" },
  },
  images: {
    qualities: [75, 82, 84],
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "delwqrwqkgcrnjypcrlc.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "drive.google.com", pathname: "/**" },
    ],
  },
};

export default withNextIntl(nextConfig);
