import { NextResponse } from "next/server";

/**
 * Digital Asset Links — proves to Android that shivalivaleveling.com
 * and the Play Store TWA package are operated by the same entity.
 * Without this file, the TWA opens with a "Running in Chrome" address
 * bar instead of full-screen native chrome.
 *
 * The TWA tooling (Bubblewrap) generates the SHA-256 fingerprint of
 * the app signing key. Two fingerprints are listed here:
 *  1. The local debug keystore — for testing the TWA build before
 *     submission.
 *  2. The Play App Signing key — Google re-signs the upload with
 *     their managed key; the fingerprint shows up under
 *     Play Console → Setup → App integrity.
 *
 * Both fingerprints can coexist in the array. Add the Play one once
 * the app is uploaded and Google has issued it.
 *
 * Hosted as a route handler (not a static file in /public/.well-known)
 * because Next.js public/ has historical quirks serving dotfile
 * directories. Same URL — /.well-known/assetlinks.json — either way.
 */

const PACKAGE_NAME = "com.shivaliva.leveling";

const SHA256_FINGERPRINTS: string[] = [
  // TODO(playstore): paste the Bubblewrap-generated debug-keystore
  // fingerprint here, then add the Play App Signing fingerprint after
  // first upload. Format: "AB:CD:12:34:..." (64 hex chars, colon-
  // separated). Get them via:
  //   bubblewrap fingerprint    → for local debug
  //   Play Console → App integrity → SHA-256 cert fingerprint
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
      // Long cache OK — Android only refetches periodically. If we
      // change fingerprints, deploy and the TWA will eventually pick
      // it up; users on existing installs aren't affected since the
      // initial verification is what matters.
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
