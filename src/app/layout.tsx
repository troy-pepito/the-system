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
import PageTransition from "@/components/PageTransition";
import GainToast from "@/components/GainToast";
import SystemNoticeToast from "@/components/SystemNoticeToast";
import RankUpGlitch from "@/components/RankUpGlitch";
import RankUpShare from "@/components/RankUpShare";
import DevTestPanel from "@/components/DevTestPanel";
import BackToTop from "@/components/BackToTop";
import OfflineBanner from "@/components/OfflineBanner";
import CacheWarmer from "@/components/CacheWarmer";
import OfflineSyncManager from "@/components/OfflineSyncManager";
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
  title: "Shivaliva Leveling: The System",
  description: "Face your shadows. Rank up in real life.",
  appleWebApp: {
    capable: true,
    title: "The System",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Shivaliva Leveling: The System",
    description:
      "A gamified self-improvement system for the battles nobody's watching.",
    type: "website",
    siteName: "Shivaliva Leveling: The System",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shivaliva Leveling: The System",
    description:
      "A gamified self-improvement system for the battles nobody's watching.",
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

  return (
    <ClerkProvider>
      <html
        lang={locale}
        className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[300] focus:px-4 focus:py-2 focus:bg-cyan-400 focus:text-slate-950 focus:text-xs focus:font-bold focus:uppercase focus:tracking-[0.3em] focus:rounded focus:shadow-[0_0_24px_rgba(34,211,238,0.7)]"
          >
            Skip to content
          </a>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <PostHogProvider>
              <ServiceWorkerRegistration />
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
                <DailyReminderAutoEnroll />
                <GainsLogger />
                <AchievementToast />
                <GainToast />
                <SystemNoticeToast />
                <RankUpGlitch />
                <RankUpShare />
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
