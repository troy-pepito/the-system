import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, Show } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AwakeningOverlay from "@/components/AwakeningOverlay";
import AchievementToast from "@/components/AchievementToast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import SignInGate from "@/components/SignInGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The System",
  description: "Solo Leveling-inspired gamified self-improvement web app",
  appleWebApp: {
    capable: true,
    title: "The System",
    statusBarStyle: "black-translucent",
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
          <ServiceWorkerRegistration />
          <AwakeningOverlay />
          <Show when="signed-out">
            <SignInGate />
          </Show>
          <Show when="signed-in">
            <Navbar />
            {children}
            <AchievementToast />
          </Show>
        </body>
      </html>
    </ClerkProvider>
  );
}
