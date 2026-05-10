import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Chakra_Petch } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AwakeningOverlay from "@/components/AwakeningOverlay";
import AchievementToast from "@/components/AchievementToast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import SignInGate from "@/components/SignInGate";
import PostHogProvider from "@/components/PostHogProvider";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import GrainOverlay from "@/components/GrainOverlay";
import MigrationBanner from "@/components/MigrationBanner";
import PageTransition from "@/components/PageTransition";
import GainToast from "@/components/GainToast";
import SystemNoticeToast from "@/components/SystemNoticeToast";
import LazyCelebrations from "@/components/LazyCelebrations";
import DevTestPanel from "@/components/DevTestPanel";
import BackToTop from "@/components/BackToTop";
import OfflineBanner from "@/components/OfflineBanner";
import CacheWarmer from "@/components/CacheWarmer";
import OfflineSyncManager from "@/components/OfflineSyncManager";
import CrossTabSync from "@/components/CrossTabSync";
import DailyReminderAutoEnroll from "@/components/DailyReminderAutoEnroll";
import GainsLogger from "@/components/GainsLogger";
import { SignedIn, SignedOut } from "@/components/AuthGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shivalivaleveling.com"),
  title: "Shivaliva Leveling · Self-Improvement RPG App",
  description:
    "Shivaliva Leveling is a free self-improvement RPG app. Pick your dungeons (NoFap, doomscroll detox, training, exposure therapy), earn XP, rank up E to S. Web + Android.",
  applicationName: "Shivaliva Leveling",
  keywords: [
    "Shivaliva Leveling",
    "self-improvement app",
    "habit tracker app",
    "gamified self-improvement",
    "Solo Leveling app",
    "NoFap app",
    "discipline app",
    "addiction recovery app",
    "hunter ranks",
    "dungeon habit tracker",
  ],
  appleWebApp: {
    capable: true,
    title: "The System",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Shivaliva Leveling · Self-Improvement RPG App",
    description:
      "A gamified self-improvement app for the battles nobody's watching. Real life is the dungeon. Show up anyway.",
    type: "website",
    siteName: "Shivaliva Leveling",
    url: "https://shivalivaleveling.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shivaliva Leveling · Self-Improvement RPG App",
    description:
      "A gamified self-improvement app for the battles nobody's watching. Real life is the dungeon. Show up anyway.",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  // JSON-LD structured data so Google classifies the site as a
  // SoftwareApplication. Without it, the site has no canonical signal
  // that "shivalivaleveling.com is an app" beyond the meta tags, so
  // queries like "Shivaliva Leveling app" fall back to whichever pages
  // mention the word, usually external marketing posts. With this
  // block in place, Google can surface the site directly for
  // app-intent queries.
  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Shivaliva Leveling",
    alternateName: "Shivaliva Leveling: The System",
    description:
      "A gamified self-improvement RPG app. Pick your dungeons, earn XP, rank up E to S. Free to play, no ads, no paywalls on the core loop.",
    applicationCategory: "HealthApplication",
    applicationSubCategory: "Self-Improvement",
    operatingSystem: "Web, Android",
    url: "https://shivalivaleveling.com",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: "Troy Pepito",
    },
  };

  return (
    <ClerkProvider>
      <html
        lang={locale}
        className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(softwareApplicationSchema),
            }}
          />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[300] focus:px-4 focus:py-2 focus:bg-cyan-400 focus:text-slate-950 focus:text-xs focus:font-bold focus:uppercase focus:tracking-[0.3em] focus:rounded focus:shadow-[0_0_24px_rgba(34,211,238,0.7)]"
          >
            Skip to content
          </a>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <PostHogProvider>
              <ServiceWorkerRegistration />
              <MigrationBanner />
              <OfflineBanner />
              <GrainOverlay />
              <AwakeningOverlay />
              <SignedOut>
                <SignInGate />
              </SignedOut>
              <SignedIn>
                <Navbar />
              </SignedIn>
              <PageTransition>{children}</PageTransition>
              <Footer />
              <SignedIn>
                <CacheWarmer />
                <OfflineSyncManager />
                <CrossTabSync />
                <DailyReminderAutoEnroll />
                <GainsLogger />
                <AchievementToast />
                <GainToast />
                <SystemNoticeToast />
                <LazyCelebrations />
                <BackToTop />
                <PwaInstallPrompt />
                <DevTestPanel />
              </SignedIn>
            </PostHogProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
