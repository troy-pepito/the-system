import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

/**
 * Resolves the request locale from the LOCALE_COOKIE. Falls back to the
 * default if the cookie is missing or malformed. No URL-based locale
 * routing, the app stays at /, /portals, etc., and the language is a
 * per-user preference.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieValue && isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;

  const messages = (await import(`@/messages/${locale}.json`)).default;
  return { locale, messages };
});
