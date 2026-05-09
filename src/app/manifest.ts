import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Stable identifier independent of the URL — lets browsers and OS
    // recognize the same PWA across URL changes (e.g. domain swaps).
    // Once shipped, never change this string or installs become ghosts.
    id: "/?source=pwa",
    name: "Shivaliva Leveling: The System",
    short_name: "The System",
    description: "Gamified self-improvement. Rank up in real life.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // display_override lets us opt into newer display modes when the
    // OS supports them, falling back to `display: standalone` otherwise.
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#22d3ee",
    lang: "en",
    dir: "ltr",
    categories: ["productivity", "lifestyle", "health"],
    // Tell the browser to prefer the installed PWA over a native app
    // listing, even after we ship to Play Store. Without this, Chrome
    // can deep-link to the Play Store install instead of opening the PWA.
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      // 512×512 served twice — once as `any` (all browsers / OG-style
      // contexts) and once as `maskable` (Android adaptive icon, what
      // the TWA on Play Store pulls for the launcher). Same source
      // file; icon1.tsx is laid out with a safe zone so the asset
      // works for both purposes. The Next.js manifest type rejects
      // space-separated purposes despite the W3C spec allowing them,
      // so we split into two entries instead of "any maskable".
      {
        src: "/icon1",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}