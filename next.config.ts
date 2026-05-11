import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Security headers applied to every response. CSP is intentionally
// omitted here, defining one without breaking Clerk, PostHog, the
// service worker, and inline JSON-LD is fragile and worth a focused
// session of its own. The headers below cover the common attack
// surfaces (clickjacking, MIME sniffing, referrer leaks, HSTS, broad
// browser-feature permissions) without that risk.
const SECURITY_HEADERS = [
  {
    // Forces HTTPS for one year, including subdomains. Vercel already
    // serves HTTPS-only, this hardens it against downgrade attempts on
    // first-visit.
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    // Blocks the app from being embedded in iframes on other origins,
    // clickjacking defence. SAMEORIGIN allows the TWA to host the PWA.
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // Stops browsers from MIME-sniffing responses, prevents
    // text/plain from being interpreted as executable JS.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Strips full referrer URL on cross-origin nav, leaving only the
    // origin. Hunters' /h/{id} or /g/{slug} URLs don't leak to third
    // parties when users click outbound links.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Default-deny on sensitive browser features the app doesn't use.
    // Locks down third-party scripts from silently requesting these.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    // Opts into cross-origin isolation for the document. Cheap win
    // since the app doesn't embed cross-origin frames; raises the bar
    // for Spectre-class attacks.
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.115", "192.168.1.*", "*.local"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
