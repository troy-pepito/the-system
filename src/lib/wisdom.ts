/**
 * Curated daily-wisdom pool. Drawn from Troy's actual influences:
 *   - Sadhguru (primary)
 *   - Osho (full corpus — books, talks, commentaries)
 *   - Bhagavad Gita / Mahabharata / Krishna
 *   - Shiva — 112 methods of meditation (Vigyan Bhairav Tantra,
 *     via Osho's Book of Secrets)
 *   - Kevin Trudeau (Wish Is Your Command, Natural Cures, Mega Memory)
 *   - Jason Capital (introduced Troy to Osho)
 *   - Buddha, Krishna, Khalil Gibran, Zig Ziglar, Jesus Christ,
 *     Confucius, Lao Tzu
 *   - Original Hunter-coded lines that match the System's voice
 *
 * Each entry fits a push-notification body (~120 chars). Add freely.
 * pickWisdomQuote() picks deterministically by date so all users see
 * the same line on the same day.
 */

export interface WisdomQuote {
  title: string;
  body: string;
}

const QUOTES: WisdomQuote[] = [
  // — Sadhguru
  {
    title: "✦ Sadhguru",
    body: "If you do not know how to keep yourself joyful, you will become a source of misery to yourself and to others.",
  },
  {
    title: "✦ Sadhguru",
    body: "Yoga is not about touching your toes. It's about what you learn on the way down.",
  },
  {
    title: "✦ Sadhguru",
    body: "The very fact that you are alive means there is enough energy for you to be ecstatic.",
  },
  {
    title: "✦ Sadhguru",
    body: "Suffering is in the mind. Mind is not your friend — mind is just an accumulation.",
  },
  {
    title: "✦ Sadhguru",
    body: "If you do not know to keep yourself peaceful and joyful, no other achievement is going to mean anything.",
  },
  {
    title: "✦ Sadhguru",
    body: "Inclusion is not a process. It is a state of being.",
  },
  {
    title: "✦ Sadhguru",
    body: "Fasting is to give the body a break — not to torture yourself. Let the digestive fire rest.",
  },
  {
    title: "✦ Sadhguru",
    body: "If you handle your body, your mind, your emotions, your energy — you handle your life.",
  },
  {
    title: "✦ Sadhguru",
    body: "When you sit quietly, you don't shrink. You expand into what you've always been.",
  },
  {
    title: "✦ Sadhguru",
    body: "The spiritual process is not about becoming somebody. It is about dismantling the somebody you became.",
  },
  {
    title: "✦ Sadhguru",
    body: "Anger and frustration come because the way you think life should happen is not happening.",
  },
  {
    title: "✦ Sadhguru",
    body: "You are the only one stopping you. You are the only one who can move you.",
  },

  // — Osho
  {
    title: "✦ Osho",
    body: "Drop the idea of becoming someone, because you are already a masterpiece. You only need to discover it.",
  },
  {
    title: "✦ Osho",
    body: "Be — don't try to become.",
  },
  {
    title: "✦ Osho",
    body: "Life begins where fear ends.",
  },
  {
    title: "✦ Osho",
    body: "Truth is not something outside to be discovered. It is something inside to be realized.",
  },
  {
    title: "✦ Osho",
    body: "Nobody can be exactly like you. Try your best to be yourself.",
  },
  {
    title: "✦ Osho",
    body: "Sannyas means: I am ready to live dangerously.",
  },
  {
    title: "✦ Osho",
    body: "Don't seek, don't search, don't ask, don't knock. Just be — and it is there.",
  },
  {
    title: "✦ Osho",
    body: "Friendship is the purest love. The highest form of love where nothing is asked, nothing is expected.",
  },
  {
    title: "✦ Osho",
    body: "Love is a fragrance of meditation. It comes when you are unburdened from within.",
  },
  {
    title: "✦ Osho",
    body: "The real question is not whether life exists after death. The real question is whether you are alive before death.",
  },
  {
    title: "✦ Osho",
    body: "Courage is moving into the unknown despite all the fears.",
  },
  {
    title: "✦ Osho",
    body: "The moment you become aware you have been carrying a cross, the cross will fall away.",
  },

  // — Bhagavad Gita / Krishna
  {
    title: "✦ Krishna · Gita",
    body: "Better one's own duty done imperfectly than another's done well. — BG 3.35",
  },
  {
    title: "✦ Krishna · Gita",
    body: "You have the right to perform your duty, but not to the fruits of your action. — BG 2.47",
  },
  {
    title: "✦ Krishna · Gita",
    body: "The mind is restless and difficult to restrain, but it is subdued by practice. — BG 6.35",
  },
  {
    title: "✦ Krishna · Gita",
    body: "When meditation is mastered, the mind is unwavering — like a lamp in a windless place. — BG 6.19",
  },
  {
    title: "✦ Krishna · Gita",
    body: "Whatever happened was for the good. Whatever is happening is for the good. Whatever will happen, will be for the good.",
  },
  {
    title: "✦ Krishna · Gita",
    body: "Whenever righteousness declines and evil rises, I manifest myself. — BG 4.7",
  },

  // — Shiva · 112 methods (Vigyan Bhairav Tantra / Book of Secrets)
  {
    title: "✦ Shiva · 112",
    body: "Watch the gap between two breaths. There, find the Self.",
  },
  {
    title: "✦ Shiva · 112",
    body: "When in any worldly activity, suddenly become aware of the gap between two thoughts.",
  },
  {
    title: "✦ Shiva · 112",
    body: "Stop in the middle of an action. Awareness floods in.",
  },
  {
    title: "✦ Shiva · 112",
    body: "Treat the friend the same as the stranger, and joy itself becomes your background.",
  },
  {
    title: "✦ Shiva · 112",
    body: "On the in-breath, on the out-breath — between them lies the eternal.",
  },

  // — Kevin Trudeau
  {
    title: "✦ Trudeau",
    body: "Decide what you want. Decide it firmly. Then move toward it without explaining yourself.",
  },
  {
    title: "✦ Trudeau",
    body: "Memory is a muscle. The more you train recall, the more reality becomes recallable.",
  },
  {
    title: "✦ Trudeau",
    body: "Most things are simpler than the system makes them seem. Trust your body. Trust your eyes.",
  },
  {
    title: "✦ Trudeau",
    body: "The wish is the command. Not the wishing — the certainty behind it.",
  },

  // — Jason Capital
  {
    title: "✦ Capital",
    body: "Speak less. Speak slower. Speak with finality. The frame you set is the reality others enter.",
  },
  {
    title: "✦ Capital",
    body: "High-status men don't explain themselves. They act, then move.",
  },
  {
    title: "✦ Capital",
    body: "Confidence isn't earned by results. Results come because confidence was already there.",
  },
  {
    title: "✦ Capital",
    body: "Master yourself first. The world conforms to a mastered man, never to a scattered one.",
  },

  // — Buddha
  {
    title: "✦ Buddha",
    body: "What we think, we become. Watch the thoughts before they harden into action.",
  },
  {
    title: "✦ Buddha",
    body: "Three things cannot be long hidden: the sun, the moon, and the truth.",
  },
  {
    title: "✦ Buddha",
    body: "Holding onto anger is like drinking poison and expecting the other person to die.",
  },
  {
    title: "✦ Buddha",
    body: "You only lose what you cling to.",
  },
  {
    title: "✦ Buddha",
    body: "Peace comes from within. Do not seek it without.",
  },

  // — Lao Tzu
  {
    title: "✦ Lao Tzu",
    body: "A journey of a thousand miles begins beneath your feet.",
  },
  {
    title: "✦ Lao Tzu",
    body: "Knowing others is intelligence. Knowing yourself is true wisdom.",
  },
  {
    title: "✦ Lao Tzu",
    body: "Mastering others is strength. Mastering yourself is true power.",
  },
  {
    title: "✦ Lao Tzu",
    body: "When I let go of what I am, I become what I might be.",
  },
  {
    title: "✦ Lao Tzu",
    body: "Nature does not hurry, yet everything is accomplished.",
  },
  {
    title: "✦ Lao Tzu",
    body: "Silence is a source of great strength.",
  },

  // — Confucius
  {
    title: "✦ Confucius",
    body: "The man who moves a mountain begins by carrying away small stones.",
  },
  {
    title: "✦ Confucius",
    body: "It does not matter how slowly you go, as long as you do not stop.",
  },
  {
    title: "✦ Confucius",
    body: "Wherever you go, go with all your heart.",
  },
  {
    title: "✦ Confucius",
    body: "Real knowledge is to know the extent of one's ignorance.",
  },

  // — Jesus Christ
  {
    title: "✦ Christ",
    body: "The kingdom of God is within you. — Luke 17:21",
  },
  {
    title: "✦ Christ",
    body: "Whoever wants to be first must be last. — Mark 9:35",
  },
  {
    title: "✦ Christ",
    body: "Knock and the door will be opened. Seek and you will find. — Matthew 7:7",
  },
  {
    title: "✦ Christ",
    body: "What does it profit a man to gain the whole world and lose his soul?",
  },

  // — Khalil Gibran
  {
    title: "✦ Gibran",
    body: "Out of suffering have emerged the strongest souls. The most massive characters are seared with scars.",
  },
  {
    title: "✦ Gibran",
    body: "The deeper that sorrow carves into your being, the more joy you can contain.",
  },
  {
    title: "✦ Gibran",
    body: "Your pain is the breaking of the shell that encloses your understanding.",
  },
  {
    title: "✦ Gibran",
    body: "Yesterday is but today's memory, and tomorrow is today's dream.",
  },

  // — Zig Ziglar
  {
    title: "✦ Ziglar",
    body: "You don't have to be great to start, but you have to start to be great.",
  },
  {
    title: "✦ Ziglar",
    body: "Motivation doesn't last. Neither does bathing — that's why we recommend it daily.",
  },
  {
    title: "✦ Ziglar",
    body: "Your attitude, not your aptitude, will determine your altitude.",
  },
  {
    title: "✦ Ziglar",
    body: "If you can dream it, you can achieve it. Belief is the first foothold.",
  },

  // — Hunter / System-coded originals
  {
    title: "✦ Hunter's Code",
    body: "An E-rank Hunter who shows up daily becomes an S-rank in the only way it's ever happened — slowly, then suddenly.",
  },
  {
    title: "✦ Hunter's Code",
    body: "A real Hunter doesn't measure himself against others. Only against the dungeon inside.",
  },
  {
    title: "✦ Hunter's Code",
    body: "The System doesn't ask if you're ready. It asks what you'll do today.",
  },
  {
    title: "✦ The Climb",
    body: "Every cleared day is a stone in the wall between you and your old self. Lay one more.",
  },
  {
    title: "✦ The Climb",
    body: "Rank doesn't come from one perfect day. It comes from refusing to quit on the messy ones.",
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
