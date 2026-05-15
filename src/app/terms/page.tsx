import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Shivaliva Leveling",
  description: "The agreement between you and Shivaliva Leveling.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 py-16 px-6">
      <article className="max-w-2xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-6">
          <p className="text-[10px] tracking-[0.4em] text-cyan-400/70 uppercase mb-3">
            [ Legal ]
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-cyan-100 mb-2">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500">
            Last updated: 2026-04-22
          </p>
        </header>

        <Section title="1. Acceptance">
          By creating an account or using Shivaliva Leveling (&quot;the
          app&quot;), you agree to these terms. If you do not agree,
          don&apos;t use the app.
        </Section>

        <Section title="2. Who we are">
          The app is operated by Trojan Bulldog, a solo developer. Contact:{" "}
          <a
            href="mailto:trojanato@gmail.com"
            className="text-cyan-300 hover:text-cyan-200 underline"
          >
            trojanato@gmail.com
          </a>
          .
        </Section>

        <Section title="3. What the app is">
          A gamified self-tracking tool. You log your own behavior,
          streaks, workouts, exposures, quest completions, and the app
          visualizes your progress. The app does not provide medical,
          psychological, or professional advice. It is not a substitute
          for therapy, medical treatment, or recovery programs.
        </Section>

        <Section title="4. Your account">
          <ul className="list-disc list-outside pl-5 space-y-2">
            <li>
              You are responsible for the accuracy of what you log.
            </li>
            <li>
              You are responsible for keeping your sign-in credentials
              secure.
            </li>
            <li>
              You must be at least 16 years old to use the app.
            </li>
            <li>
              One account per person. Don&apos;t create accounts on
              behalf of others without permission.
            </li>
          </ul>
        </Section>

        <Section title="5. Acceptable use">
          Don&apos;t abuse the app or the infrastructure behind it.
          Specifically, don&apos;t:
          <ul className="list-disc list-outside pl-5 mt-3 space-y-2">
            <li>
              Attempt to break, scrape, reverse engineer, or overload the
              service.
            </li>
            <li>
              Upload illegal, harmful, or abusive content as your hunter
              name or profile picture.
            </li>
            <li>
              Use the app to harass, impersonate, or harm others.
            </li>
            <li>
              Resell or redistribute the app without permission.
            </li>
          </ul>
        </Section>

        <Section title="6. Your content">
          The data you log (progress records, hunter name, etc.) belongs
          to you. By using the app, you grant us a limited license to
          store, process, and display that data solely to operate the
          app on your behalf.
        </Section>

        <Section title="7. Service availability">
          The app is provided &quot;as is&quot; and &quot;as
          available.&quot; We may change, suspend, or discontinue
          features at any time. We don&apos;t guarantee uninterrupted
          access, the app depends on third-party providers (Clerk,
          Neon, Vercel) and solo maintenance.
        </Section>

        <Section title="8. No warranty">
          To the fullest extent permitted by law, the app is provided
          without warranties of any kind, express or implied, including
          fitness for a particular purpose or non-infringement. You use
          it at your own risk.
        </Section>

        <Section title="9. Limitation of liability">
          To the fullest extent permitted by law, we are not liable for
          indirect, incidental, or consequential damages arising from
          your use of the app. Our total liability is limited to the
          amount you have paid us in the last 12 months (currently:
          zero, for free users).
        </Section>

        <Section title="10. Termination">
          You may delete your account at any time. We may suspend or
          terminate accounts that violate these terms, or if the app is
          discontinued. On deletion, your progress records are removed
          from our database on the next cleanup pass.
        </Section>

        <Section title="11. Changes to these terms">
          We may update these terms. Material changes will be reflected
          by updating the date above. Continued use after changes
          constitutes acceptance.
        </Section>

        <Section title="12. Governing law">
          These terms are governed by the laws of the United Arab
          Emirates, without regard to conflict-of-laws rules. Disputes
          will be resolved in the courts of the UAE, unless mandatory
          local consumer-protection law in your jurisdiction provides
          otherwise.
        </Section>

        <footer className="pt-8 border-t border-slate-800">
          <Link
            href="/"
            className="text-xs text-cyan-400/70 hover:text-cyan-200 tracking-[0.3em] uppercase transition-colors"
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