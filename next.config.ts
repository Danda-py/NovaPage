import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * CSP per le pagine dell'app (dashboard, editor, account…). Le landing hanno la
 * loro, più permissiva sugli stili inline perché il contenuto è dell'utente.
 * Next inietta script inline propri: servono 'unsafe-inline' (e 'unsafe-eval'
 * solo in sviluppo, dove React lo usa per il debug).
 */
const appCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https:${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https:",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const APP_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot",
  "/reset/:path*",
  "/dashboard/:path*",
  "/editor/:path*",
  "/sites/:path*",
  "/leads/:path*",
  "/account/:path*",
  "/privacy",
  "/termini",
  "/cookie",
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Il contenuto delle landing arriva dagli utenti: qui si nega tutto ciò che
        // la sanificazione dovesse lasciar passare (plugin, <base> iniettati, framing).
        source: "/s/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self' https:",
          },
        ],
      },
      ...APP_PATHS.map((source) => ({
        source,
        headers: [{ key: "Content-Security-Policy", value: appCsp }],
      })),
      {
        source: "/:path*",
        headers:
          process.env.NODE_ENV === "production"
            ? [
                ...securityHeaders,
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : securityHeaders,
      },
    ];
  },
};

export default nextConfig;
