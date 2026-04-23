"use client";
import { useUser } from "@clerk/nextjs";
import { useEffect, type ReactNode } from "react";
import {
  clearKnownSignedIn,
  markKnownSignedIn,
  useKnownSignedInUserId,
  useOnline,
} from "@/lib/offline";

function useOfflineAwareAuth() {
  const { isSignedIn, isLoaded, user } = useUser();
  const online = useOnline();
  const knownSignedInUserId = useKnownSignedInUserId();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      markKnownSignedIn(user.id);
    } else if (isSignedIn === false && online) {
      clearKnownSignedIn();
    }
  }, [isLoaded, isSignedIn, user, online]);

  const effectiveSignedIn = online
    ? isLoaded && isSignedIn === true
    : knownSignedInUserId !== null;
  const effectiveSignedOut = online
    ? isLoaded && isSignedIn === false
    : knownSignedInUserId === null;

  return { effectiveSignedIn, effectiveSignedOut };
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { effectiveSignedIn } = useOfflineAwareAuth();
  if (!effectiveSignedIn) return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { effectiveSignedOut } = useOfflineAwareAuth();
  if (!effectiveSignedOut) return null;
  return <>{children}</>;
}