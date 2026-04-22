import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, Show } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AwakeningOverlay from "@/components/AwakeningOverlay";
import AchievementToast from "@/components/AchievementToast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import SignInGate from "@/components/SignInGate";
import PostHogProvider from "@/components/PostHogProvider";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shivaliva Leveling",
  description: "Face your shadows. Rank up in real life.",
  appleWebApp: {
    capable: true,
    title: "Shivaliva Leveling",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Shivaliva Leveling",
    description:
      "A gamified self-improvement system for the battles nobody's watching.",
    type: "website",
    siteName: "Shivaliva Leveling",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shivaliva Leveling",
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
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <PostHogProvider>
            <ServiceWorkerRegistration />
            <AwakeningOverlay />
            <Show when="signed-out">
              <SignInGate />
            </Show>
            <Show when="signed-in">
              <Navbar />
            </Show>
            {children}
            <Show when="signed-in">
              <AchievementToast />
              <PwaInstallPrompt />
            </Show>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
