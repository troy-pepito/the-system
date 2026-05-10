import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/guide", "/ranks", "/privacy", "/terms"],
        disallow: [
          "/settings",
          "/profile",
          "/leaderboard",
          "/guilds",
          "/g/",
          "/h/",
          "/portals",
          "/path",
          "/api/",
        ],
      },
    ],
    sitemap: "https://shivalivaleveling.com/sitemap.xml",
  };
}
