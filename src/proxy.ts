import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Permanent redirect from the legacy Vercel-assigned URL to the
// production domain. Anyone with the old URL bookmarked, an old PWA
// install pointing at it, or a stale link gets bounced to the new
// domain with a `?migrated=1` flag — MigrationBanner reads that flag
// and explains the fresh-start situation (Clerk userIds don't carry
// across instances, so existing data needs manual restoration).
//
// Deliberately only matches the legacy production hostname. Vercel
// preview URLs (per-branch deploys) are left alone so previews stay
// accessible during development.
const LEGACY_HOST = "trojanatoplat-system.vercel.app";
const PRODUCTION_HOST = "shivalivaleveling.com";

export default clerkMiddleware(async (_auth, req) => {
  const host = req.headers.get("host");
  if (host === LEGACY_HOST) {
    const url = new URL(req.url);
    url.protocol = "https:";
    url.host = PRODUCTION_HOST;
    url.searchParams.set("migrated", "1");
    return NextResponse.redirect(url, 308);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};