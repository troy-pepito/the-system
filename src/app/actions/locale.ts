"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

/**
 * Sets the user's preferred locale via cookie. The next request will
 * read this cookie in src/i18n/request.ts and serve the corresponding
 * message file. Server components re-render with the new locale.
 */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    // 1 year — locale is a long-lived preference, not a session thing.
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // Force every cached server route to re-render with the new locale.
  revalidatePath("/", "layout");
}
