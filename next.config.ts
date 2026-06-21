import type { NextConfig } from "next";

const baseSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

// React i dev-läge kräver eval() för bl.a. felsökning/HMR. Tillåt 'unsafe-eval'
// ENBART i utveckling – produktionens CSP förblir strikt.
const isDev = process.env.NODE_ENV !== "production";
const siteScriptSrc = [
  "script-src",
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://maps.googleapis.com",
  "https://connect.facebook.net",
].join(" ");

const siteCsp = [
  "default-src 'self'",
  siteScriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https://cdn.sanity.io https://*.googleapis.com https://*.gstatic.com https://www.facebook.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://www.facebook.com https://connect.facebook.net",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const studioCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://cdn.sanity.io https://*.sanity.io",
  "connect-src 'self' https://*.sanity.io wss://*.sanity.io https://*.apicdn.sanity.io https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "frame-src 'self' https://*.sanity.io",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  transpilePackages: ["next-sanity"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/besiktning",
        destination: "/analys",
        permanent: true,
      },
      {
        source: "/artiklar/driftkostnad-hus-vad-kostar-det-att-aga-ett-hus",
        destination: "/artiklar/driftkostnad-villa-vad-kostar-det-aga-hus",
        permanent: true,
      },
      {
        source: "/artiklar/overlatelsebesiktning-vad-ar-det-och-vad-kostar-det",
        destination:
          "/artiklar/overlatelsebesiktning-vad-ar-det-vad-kostar-det-vem-betalar",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/studio/:path*",
        headers: [
          ...baseSecurityHeaders,
          { key: "Content-Security-Policy", value: studioCsp },
        ],
      },
      {
        source: "/((?!studio).*)",
        headers: [
          ...baseSecurityHeaders,
          { key: "Content-Security-Policy", value: siteCsp },
        ],
      },
    ];
  },
};

export default nextConfig;
