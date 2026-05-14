import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Shivaliva Leveling",
  description: "How Shivaliva Leveling collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 py-16 px-6">
      <article className="max-w-2xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-6">
          <p className="text-[10px] tracking-[0.4em] text-cyan-300 uppercase mb-3">
            [ Legal ]
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-cyan-100 mb-2">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500">
            Last updated: 2026-04-22
          </p>
        </header>

        <Section title="1. Who we are">
          Shivaliva Leveling (&quot;the app&quot;) is a solo-developed web
          application operated by Trojan Bulldog. Contact:{" "}
          <a
            href="mailto:trojanato@gmail.com"
            className="text-cyan-300 hover:text-cyan-200 underline"
          >
            trojanato@gmail.com
          </a>
          .
        </Section>

        <Section title="2. What we collect">
          <ul className="list-disc list-outside pl-5 space-y-2">
            <li>
              <strong className="text-slate-200">Account data</strong>:
              name and email, provided by you via Google sign-in (handled
              by Clerk).
            </li>
            <li>
              <strong className="text-slate-200">Hunter name</strong>: the
              display name you choose during Awakening.
            </li>
            <li>
              <strong className="text-slate-200">
                Your progress records
              </strong>{" "}
             , dungeon runs, event logs (relapses, workouts, exposures,
              victories), daily quest completions, and derived statistics
              (XP, level, rank, dimension totals).
            </li>
            <li>
              <strong className="text-slate-200">
                Optional profile picture
              </strong>{" "}
             , if you upload one, it is stored via Clerk.
            </li>
            <li>
              <strong className="text-slate-200">Technical data</strong>:
              browser session cookies used by Clerk for authentication.
              We do not serve third-party advertising and do not embed
              cross-site trackers.
            </li>
          </ul>
        </Section>

        <Section title="3. Why we collect it">
          Solely to operate the app on your behalf, to authenticate you,
          track your progress, display your profile, and persist your
          data between sessions. We do not sell your data, share it with
          advertisers, or use it to profile you for external purposes.
        </Section>

        <Section title="4. Who we share it with">
          We rely on a small number of infrastructure providers who
          process data on our behalf:
          <ul className="list-disc list-outside pl-5 mt-3 space-y-2">
            <li>
              <strong className="text-slate-200">Clerk</strong>:
              authentication and account management.
            </li>
            <li>
              <strong className="text-slate-200">Neon</strong>: database
              hosting for your progress records.
            </li>
            <li>
              <strong className="text-slate-200">Vercel</strong>:
              application hosting and delivery.
            </li>
          </ul>
          <p className="mt-3">
            Each provider operates under its own privacy policy. We do
            not share your data with any other third party.
          </p>
        </Section>

        <Section title="5. How long we keep it">
          For as long as you keep your account active. When you delete
          your account, associated progress records are removed from our
          database on the next cleanup pass.
        </Section>

        <Section title="6. Your rights">
          You can delete your account and all associated data directly
          from{" "}
          <a
            href="/settings"
            className="text-cyan-300 hover:text-cyan-200 underline"
          >
            Settings
          </a>{" "}
          (Danger Zone). For access to, correction of, or export of
          your data, email{" "}
          <a
            href="mailto:trojanato@gmail.com"
            className="text-cyan-300 hover:text-cyan-200 underline"
          >
            trojanato@gmail.com
          </a>
          . If you are in a jurisdiction with specific data-protection
          rights (GDPR, UAE PDPL, etc.), those rights apply.
        </Section>

        <Section title="7. Security">
          Data is transmitted over HTTPS and stored with our
          infrastructure providers, who maintain their own security
          controls. No system is perfectly secure; do not treat the app
          as a vault for sensitive information beyond what it is designed
          to track.
        </Section>

        <Section title="8. Children">
          The app is not intended for users under 16. If you believe a
          minor has created an account, contact us and we will remove it.
        </Section>

        <Section title="9. Changes">
          We may update this policy. Material changes will be reflected
          by updating the date above. Continued use after changes
          constitutes acceptance.
        </Section>

        <footer className="pt-8 border-t border-slate-800">
          <Link
            href="/"
            className="text-xs text-cyan-300 hover:text-cyan-200 tracking-[0.3em] uppercase transition-colors"
          >
            ← Back to Shivaliva Leveling
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-cyan-100 uppercase tracking-wider">
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}