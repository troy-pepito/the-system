import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Chakra_Petch } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AwakeningOverlay from "@/components/AwakeningOverlay";
import AchievementToast from "@/components/AchievementToast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import SignInGate from "@/components/SignInGate";
import PostHogProvider from "@/components/PostHogProvider";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import GrainOverlay from "@/components/GrainOverlay";
import PageTransition from "@/components/PageTransition";
import GainToast from "@/components/GainToast";
import RankUpGlitch from "@/components/RankUpGlitch";
import DevTestPanel from "@/components/DevTestPanel";
import BackToTop from "@/components/BackToTop";
import OfflineBanner from "@/components/OfflineBanner";
import CacheWarmer from "@/components/CacheWarmer";
import OfflineSyncManager from "@/components/OfflineSyncManager";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
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
            <SignedIn>
              <CacheWarmer />
              <OfflineSyncManager />
              <AchievementToast />
              <GainToast />
              <RankUpGlitch />
              <BackToTop />
              <PwaInstallPrompt />
              <DevTestPanel />
            </SignedIn>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
