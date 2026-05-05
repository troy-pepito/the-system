// Stamps public/sw.js with a unique BUILD_ID per deploy so the
// service worker's cache keys (system-static-{BUILD_ID},
// system-runtime-{BUILD_ID}) change every release. Browsers see a
// byte-different sw.js, install the new SW, and its activate handler
// drops the old caches — so users always run the latest JS chunks
// after a deploy instead of being served stale ones for days.
//
// Vercel sets VERCEL_GIT_COMMIT_SHA in build envs. Locally / outside
// Vercel we fall back to a timestamp so dev builds still get a unique
// stamp (which doesn't matter much because ServiceWorkerRegistration
// unregisters the SW in NODE_ENV !== "production" anyway).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SW_PATH = join(__dirname, "..", "public", "sw.js");

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || `local-${Date.now()}`;

const original = readFileSync(SW_PATH, "utf-8");
const stamped = original.replace(
  /const BUILD_ID = "[^"]*";/,
  `const BUILD_ID = "${buildId}";`
);

if (stamped === original) {
  // The placeholder is missing — fail loudly rather than ship an
  // unversioned SW that re-uses the previous cache forever.
  console.error(
    "[stamp-sw] BUILD_ID placeholder not found in public/sw.js. Refusing to build."
  );
  process.exit(1);
}

writeFileSync(SW_PATH, stamped);
console.log(`[stamp-sw] wrote BUILD_ID="${buildId}" to public/sw.js`);
