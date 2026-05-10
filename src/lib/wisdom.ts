/**
 * Curated daily-wisdom pool. Drawn from Troy's actual influences plus
 * the most relevant timeless voices for an app focused on discipline,
 * presence, recovery, and mastery.
 *
 * Lineages:
 *   Sadhguru (primary) · Osho · Bhagavad Gita / Krishna · Shiva 112
 *   Kevin Trudeau · Jason Capital · Buddha · Lao Tzu · Confucius
 *   Jesus Christ · Khalil Gibran · Zig Ziglar · Marcus Aurelius
 *   Seneca · Epictetus · Carl Jung · Naval Ravikant · David Goggins
 *   Jocko Willink · Bruce Lee · Rumi · Ramana Maharshi · Vivekananda
 *   Thich Nhat Hanh · Eckhart Tolle · J. Krishnamurti · Musashi
 *   Patanjali · Hunter-coded originals
 *
 * Pool is sized at exactly 112, matching Shiva's 112 methods of
 * meditation. pickWisdomQuote() rotates deterministically by date so
 * all users see the same line on the same day.
 *
 * Each entry stays under ~120 chars so it fits a push notification body.
 */

export interface WisdomQuote {
  title: string;
  body: string;
}

const QUOTES: WisdomQuote[] = [
  //, Sadhguru (12)
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
    body: "Suffering is in the mind. Mind is not your friend, mind is just an accumulation.",
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
    body: "Fasting is to give the body a break, not to torture yourself. Let the digestive fire rest.",
  },
  {
    title: "✦ Sadhguru",
    body: "If you handle your body, your mind, your emotions, your energy, you handle your life.",
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

  //, Osho (12)
  {
    title: "✦ Osho",
    body: "Drop the idea of becoming someone, because you are already a masterpiece. You only need to discover it.",
  },
  {
    title: "✦ Osho",
    body: "Be, don't try to become.",
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
    body: "Don't seek, don't search, don't ask, don't knock. Just be, and it is there.",
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
    body: "The real question is not whether life exists after death. It is whether you are alive before death.",
  },
  {
    title: "✦ Osho",
    body: "Courage is moving into the unknown despite all the fears.",
  },
  {
    title: "✦ Osho",
    body: "The moment you become aware you have been carrying a cross, the cross will fall away.",
  },

  //, Bhagavad Gita / Krishna (6)
  {
    title: "✦ Krishna · Gita",
    body: "Better one's own duty done imperfectly than another's done well., BG 3.35",
  },
  {
    title: "✦ Krishna · Gita",
    body: "You have the right to perform your duty, but not to the fruits of your action., BG 2.47",
  },
  {
    title: "✦ Krishna · Gita",
    body: "The mind is restless and difficult to restrain, but it is subdued by practice., BG 6.35",
  },
  {
    title: "✦ Krishna · Gita",
    body: "When meditation is mastered, the mind is unwavering, like a lamp in a windless place., BG 6.19",
  },
  {
    title: "✦ Krishna · Gita",
    body: "Whatever happened was for the good. Whatever is happening is for the good. Whatever will happen, will be for the good.",
  },
  {
    title: "✦ Krishna · Gita",
    body: "Whenever righteousness declines and evil rises, I manifest myself., BG 4.7",
  },

  //, Shiva · 112 methods (Vigyan Bhairav Tantra / Book of Secrets) (5)
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
    body: "On the in-breath, on the out-breath, between them lies the eternal.",
  },

  //, Kevin Trudeau (4)
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
    body: "The wish is the command. Not the wishing, the certainty behind it.",
  },

  //, Jason Capital (4)
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

  //, Buddha (5)
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

  //, Lao Tzu (6)
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

  //, Confucius (3)
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

  //, Jesus Christ (4)
  {
    title: "✦ Christ",
    body: "The kingdom of God is within you., Luke 17:21",
  },
  {
    title: "✦ Christ",
    body: "Whoever wants to be first must be last., Mark 9:35",
  },
  {
    title: "✦ Christ",
    body: "Knock and the door will be opened. Seek and you will find., Matthew 7:7",
  },
  {
    title: "✦ Christ",
    body: "What does it profit a man to gain the whole world and lose his soul?",
  },

  //, Khalil Gibran (4)
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

  //, Zig Ziglar (3)
  {
    title: "✦ Ziglar",
    body: "You don't have to be great to start, but you have to start to be great.",
  },
  {
    title: "✦ Ziglar",
    body: "Motivation doesn't last. Neither does bathing, that's why we recommend it daily.",
  },
  {
    title: "✦ Ziglar",
    body: "Your attitude, not your aptitude, will determine your altitude.",
  },

  //, Marcus Aurelius (4)
  {
    title: "✦ Aurelius",
    body: "You have power over your mind, not outside events. Realize this, and you will find strength.",
  },
  {
    title: "✦ Aurelius",
    body: "Waste no more time arguing what a good man should be. Be one.",
  },
  {
    title: "✦ Aurelius",
    body: "Confine yourself to the present.",
  },
  {
    title: "✦ Aurelius",
    body: "When you arise in the morning, think of what a precious privilege it is to be alive.",
  },

  //, Seneca (3)
  {
    title: "✦ Seneca",
    body: "We suffer more in imagination than in reality.",
  },
  {
    title: "✦ Seneca",
    body: "It is not that we have a short time to live, but that we waste much of it.",
  },
  {
    title: "✦ Seneca",
    body: "Difficulties strengthen the mind, as labor does the body.",
  },

  //, Epictetus (2)
  {
    title: "✦ Epictetus",
    body: "It's not what happens to you, but how you react to it that matters.",
  },
  {
    title: "✦ Epictetus",
    body: "First say to yourself what you would be, then do what you have to do.",
  },

  //, Carl Jung (4), direct fit for compulsion / shadow work
  {
    title: "✦ Jung",
    body: "Until you make the unconscious conscious, it will direct your life and you will call it fate.",
  },
  {
    title: "✦ Jung",
    body: "What you resist not only persists, but will grow in size.",
  },
  {
    title: "✦ Jung",
    body: "The privilege of a lifetime is to become who you truly are.",
  },
  {
    title: "✦ Jung",
    body: "There is no coming to consciousness without pain.",
  },

  //, Naval Ravikant (2)
  {
    title: "✦ Naval",
    body: "Read what you love until you love to read.",
  },
  {
    title: "✦ Naval",
    body: "Desire is a contract you make with yourself to be unhappy until you get what you want.",
  },

  //, David Goggins (3)
  {
    title: "✦ Goggins",
    body: "The only person you've got to beat is who you were yesterday.",
  },
  {
    title: "✦ Goggins",
    body: "Suffer now and live the rest of your life as a champion.",
  },
  {
    title: "✦ Goggins",
    body: "We live in a world where mediocrity is praised. Refuse to be average.",
  },

  //, Jocko Willink (2)
  {
    title: "✦ Jocko",
    body: "Discipline equals freedom.",
  },
  {
    title: "✦ Jocko",
    body: "Don't count on motivation. Count on discipline.",
  },

  //, Bruce Lee (3)
  {
    title: "✦ Bruce Lee",
    body: "Long-term consistency beats short-term intensity.",
  },
  {
    title: "✦ Bruce Lee",
    body: "Knowing is not enough; we must apply. Willing is not enough; we must do.",
  },
  {
    title: "✦ Bruce Lee",
    body: "Absorb what is useful, discard what is useless, add what is essentially your own.",
  },

  //, Rumi (3)
  {
    title: "✦ Rumi",
    body: "The wound is the place where the light enters you.",
  },
  {
    title: "✦ Rumi",
    body: "What you seek is seeking you.",
  },
  {
    title: "✦ Rumi",
    body: "Don't grieve. Anything you lose comes round in another form.",
  },

  //, Ramana Maharshi (2)
  {
    title: "✦ Ramana",
    body: "Your own Self-realization is the greatest service you can render the world.",
  },
  {
    title: "✦ Ramana",
    body: "Silence is never-ending speech. Vocal speech obstructs the other.",
  },

  //, Swami Vivekananda (2)
  {
    title: "✦ Vivekananda",
    body: "Arise, awake, and stop not until the goal is reached.",
  },
  {
    title: "✦ Vivekananda",
    body: "All the powers in the universe are already ours. We put our hands before our eyes and cry that it is dark.",
  },

  //, Thich Nhat Hanh (2)
  {
    title: "✦ Thich Nhat Hanh",
    body: "Walk as if you are kissing the Earth with your feet.",
  },
  {
    title: "✦ Thich Nhat Hanh",
    body: "Smile, breathe and go slowly.",
  },

  //, Eckhart Tolle (2)
  {
    title: "✦ Tolle",
    body: "Realize deeply that the present moment is all you ever have.",
  },
  {
    title: "✦ Tolle",
    body: "The voice in your head is not who you are. Awareness of it, that is who you are.",
  },

  //, J. Krishnamurti (2)
  {
    title: "✦ Krishnamurti",
    body: "It is no measure of health to be well-adjusted to a profoundly sick society.",
  },
  {
    title: "✦ Krishnamurti",
    body: "Freedom is found in the choiceless awareness of our daily existence.",
  },

  //, Miyamoto Musashi (2)
  {
    title: "✦ Musashi",
    body: "Today is victory over yourself of yesterday. Tomorrow is your victory over lesser men.",
  },
  {
    title: "✦ Musashi",
    body: "Do nothing that is of no use.",
  },

  //, Patanjali · Yoga Sutras (1)
  {
    title: "✦ Patanjali",
    body: "Yoga is the cessation of the fluctuations of the mind., Yoga Sutra 1.2",
  },

  //, Hunter / System-coded originals (5)
  {
    title: "✦ Hunter's Code",
    body: "An E-rank Hunter who shows up daily becomes an S-rank in the only way it's ever happened, slowly, then suddenly.",
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
 * Returns a deterministic quote for the given calendar date, same date
 * yields the same quote so all users see the same one that day.
 */
export function pickWisdomQuote(dateIso: string): WisdomQuote {
  const [y, m, d] = dateIso.split("-").map(Number);
  // Day-of-year-ish hash: stable across years, rotates daily.
  const dayHash = y * 372 + m * 31 + d;
  const idx = dayHash % QUOTES.length;
  return QUOTES[idx];
}
