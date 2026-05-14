"use client";

import { useEffect } from "react";

/**
 * Side-effect-only client component mounted on /g/[slug] to record
 * when the viewer last saw the guild feed. The Navbar reads this
 * timestamp to decide whether to show the "new activity" dot on the
 * Guilds tab.
 *
 * Renders nothing. Per-device via localStorage — multi-device users
 * may see the dot persist on their other phone/laptop until they
 * also visit there, accepted as a trade-off to avoid a schema change.
 */
const GUILD_FEED_LAST_SEEN_KEY = "system:guild-feed-last-seen";

export default function MarkGuildFeedSeen() {
  useEffect(() => {
    try {
      localStorage.setItem(GUILD_FEED_LAST_SEEN_KEY, new Date().toISOString());
    } catch {}
  }, []);
  return null;
}
