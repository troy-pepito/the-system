"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  initAnalytics,
  identifyUser,
  resetAnalytics,
  capturePageView,
} from "@/lib/analytics";

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      const meta = user.unsafeMetadata as
        | { hunterName?: string }
        | undefined;
      identifyUser(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: meta?.hunterName || user.firstName || null,
        createdAt: user.createdAt?.toISOString(),
      });
    } else {
      resetAnalytics();
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (!pathname) return;
    capturePageView();
  }, [pathname]);

  return <>{children}</>;
}