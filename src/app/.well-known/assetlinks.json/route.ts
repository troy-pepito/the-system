import { NextResponse } from "next/server";

/**
 * Digital Asset Links, proves to Android that shivalivaleveling.com
 * and the Play Store TWA package are operated by the same entity.
 * Without this file, the TWA opens with a "Running in Chrome" address
 * bar instead of full-screen native chrome.
 *
 * The TWA tooling (Bubblewrap) generates the SHA-256 fingerprint of
 * the app signing key. Two fingerprints are listed here:
 *  1. The local debug keystore, for testing the TWA build before
 *     submission.
 *  2. The Play App Signing key, Google re-signs the upload with
 *     their managed key; the fingerprint shows up under
 *     Play Console → Setup → App integrity.
 *
 * Both fingerprints can coexist in the array. Add the Play one once
 * the app is uploaded and Google has issued it.
 *
 * Hosted as a route handler (not a static file in /public/.well-known)
 * because Next.js public/ has historical quirks serving dotfile
 * directories. Same URL, /.well-known/assetlinks.json, either way.
 */

const PACKAGE_NAME = "com.shivaliva.leveling";

const SHA256_FINGERPRINTS: string[] = [
  // Upload key, the PWA Builder local signing.keystore generated on
  // 2026-05-11. Used to sign the .aab uploaded to Play Console.
  "09:6C:31:CA:E7:7C:FE:F8:EA:49:98:63:CA:B7:E8:2D:70:F1:64:3F:58:6D:F8:B2:EF:C2:E4:18:F2:37:4E:1A",
  // App Signing key, Play re-signs the upload with their managed key
  // and ships THAT to user devices. Copied from Play Console → App
  // integrity → Play app signing → App signing key certificate on
  // 2026-05-19. This is the fingerprint the installed TWA verifies
  // against, without it the app opens in Chrome Custom Tabs instead
  // of full-screen native chrome.
  "BA:D4:6F:5C:C7:21:6F:D0:0D:F1:1B:2E:18:F8:AB:72:3A:61:86:74:0E:E7:24:52:24:DF:B1:BF:AB:A0:2A:EC",
];

export async function GET() {
  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: SHA256_FINGERPRINTS,
      },
    },
  ];

  return NextResponse.json(body, {
    headers: {
      // Long cache OK, Android only refetches periodically. If we
      // change fingerprints, deploy and the TWA will eventually pick
      // it up; users on existing installs aren't affected since the
      // initial verification is what matters.
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
