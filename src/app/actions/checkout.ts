"use server";

import { requireUserId } from "@/lib/auth";
import { isPricingEnabled } from "@/lib/pricing";

export async function createCheckoutUrl(): Promise<string | null> {
  if (!isPricingEnabled()) return null;

  const userId = await requireUserId();
  const base = process.env.POLAR_CHECKOUT_URL;
  if (!base) return null;

  const url = new URL(base);
  // Polar uses customer_external_id (or metadata) to tie a checkout back
  // to our user. The webhook reads this to flip the user's Pro flag.
  url.searchParams.set("customer_external_id", userId);
  return url.toString();
}