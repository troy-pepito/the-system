/**
 * Curated daily-wisdom pool used as the fallback push when no state-specific
 * nudge applies. Each entry is short enough to fit a push notification body
 * (~120 chars) and aligned with the app's themes — discipline, presence,
 * fighting compulsion, the long climb.
 *
 * Add freely. The day-of-year index modulates which quote fires, so a longer
 * pool means each one repeats less often.
 */

export interface WisdomQuote {
  title: string;
  body: string;
}

const QUOTES: WisdomQuote[] = [
  {
    title: "✦ Discipline",
    body: "Discipline equals freedom. The more rules you keep, the more space inside you grows.",
  },
  {
    title: "✦ Presence",
    body: "If you're truly here, even washing a dish is meditation. — Sadhguru",
  },
  {
    title: "✦ Resistance",
    body: "The compulsion isn't you. It's a current you can choose to step out of, one moment at a time.",
  },
  {
    title: "✦ Naval",
    body: "The most important skill for getting rich is becoming a perpetual learner. — Naval Ravikant",
  },
  {
    title: "✦ Marcus",
    body: "You have power over your mind — not outside events. Realize this, and you will find strength. — Marcus Aurelius",
  },
  {
    title: "✦ Goggins",
    body: "The only person you've got to beat is who you were yesterday. Show up.",
  },
  {
    title: "✦ Buddha",
    body: "What we think, we become. Watch the thoughts before they harden into action.",
  },
  {
    title: "✦ Hunter",
    body: "An E-rank Hunter who shows up daily becomes an S-rank in the only way it's ever happened — slowly, then suddenly.",
  },
  {
    title: "✦ Sadhguru",
    body: "If you do not know how to keep yourself joyful, you will become a source of misery to yourself and to others. — Sadhguru",
  },
  {
    title: "✦ Osho",
    body: "Drop the idea of becoming someone, because you are already a masterpiece. You only need to discover it. — Osho",
  },
  {
    title: "✦ One Day",
    body: "One clean day is a vote for the person you're becoming. Cast it.",
  },
  {
    title: "✦ Stoic",
    body: "Don't explain your philosophy. Embody it. — Epictetus",
  },
  {
    title: "✦ Lao Tzu",
    body: "A journey of a thousand miles begins beneath your feet. Take the first step today.",
  },
  {
    title: "✦ The Climb",
    body: "Rank doesn't come from one perfect day. It comes from refusing to quit on the messy ones.",
  },
  {
    title: "✦ Sadhguru",
    body: "When you fast, your body learns it does not need everything it craves. — Sadhguru",
  },
  {
    title: "✦ Bruce Lee",
    body: "Long-term consistency beats short-term intensity. Show up small, every day.",
  },
  {
    title: "✦ Aurelius",
    body: "Waste no more time arguing what a good man should be. Be one. — Marcus Aurelius",
  },
  {
    title: "✦ The Trap",
    body: "The dopamine hit feels like reward. It's actually a tax on your future self. Pay less.",
  },
  {
    title: "✦ Rumi",
    body: "The wound is the place where the light enters you. — Rumi",
  },
  {
    title: "✦ The Hunter",
    body: "A real Hunter doesn't measure himself against others. Only against the dungeon inside.",
  },
  {
    title: "✦ Jung",
    body: "What you resist not only persists, but grows in size. Face the shadow. — Carl Jung",
  },
  {
    title: "✦ Naval",
    body: "Earn with your mind, not your time. Train your mind first. — Naval Ravikant",
  },
  {
    title: "✦ Daily Vow",
    body: "You don't need to feel motivated. You need to honor the vow you made to yourself. Show up.",
  },
  {
    title: "✦ Sadhguru",
    body: "Yoga is not about touching your toes. It's about what you learn on the way down. — Sadhguru",
  },
  {
    title: "✦ Goggins",
    body: "Suffer now and live the rest of your life as a champion. — David Goggins",
  },
  {
    title: "✦ The Drift",
    body: "If today drifts, tomorrow follows. Anchor it now — one quest, one breath, one cleared day.",
  },
  {
    title: "✦ Seneca",
    body: "We suffer more in imagination than in reality. — Seneca",
  },
  {
    title: "✦ The Fire",
    body: "Lust burns. Discipline lights. Choose what you carry into the day.",
  },
  {
    title: "✦ Krishna",
    body: "Better is one's own duty, though imperfect, than the duty of another well done. — Bhagavad Gita",
  },
  {
    title: "✦ Hunter's Code",
    body: "The System doesn't ask if you're ready. It asks what you'll do today.",
  },
  {
    title: "✦ Tao",
    body: "Knowing others is intelligence; knowing yourself is true wisdom. — Lao Tzu",
  },
  {
    title: "✦ Osho",
    body: "Be — don't try to become. — Osho",
  },
  {
    title: "✦ The Climb",
    body: "Every cleared day is a stone in the wall between you and your old self. Lay one more.",
  },
  {
    title: "✦ Aurelius",
    body: "Confine yourself to the present. — Marcus Aurelius",
  },
  {
    title: "✦ Naval",
    body: "Read what you love until you love to read. — Naval Ravikant",
  },
  {
    title: "✦ The Quiet Win",
    body: "Nobody's watching the small choice you're about to make. That's exactly why it counts.",
  },
];

/**
 * Returns a deterministic quote for the given calendar date — same date
 * yields the same quote so all users see the same one that day.
 */
export function pickWisdomQuote(dateIso: string): WisdomQuote {
  const [y, m, d] = dateIso.split("-").map(Number);
  // Day-of-year-ish hash: stable across years, rotates daily.
  const dayHash = y * 372 + m * 31 + d;
  const idx = dayHash % QUOTES.length;
  return QUOTES[idx];
}
