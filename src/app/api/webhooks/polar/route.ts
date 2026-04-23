import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Polar webhooks deliver events as JSON with a signature header.
// We verify against POLAR_WEBHOOK_SECRET, then set user.publicMetadata.pro = true
// on successful order/subscription events.

interface PolarEvent {
  type: string;
  data?: {
    customer?: {
      external_id?: string;
    };
    customer_external_id?: string;
    status?: string;
    metadata?: Record<string, string | number | boolean>;
  };
}

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature.replace(/^sha256=/, ""), "hex")
    );
  } catch {
    return false;
  }
}

const GRANT_EVENTS = new Set([
  "order.created",
  "order.paid",
  "subscription.created",
  "subscription.active",
]);

const REVOKE_EVENTS = new Set([
  "subscription.canceled",
  "subscription.revoked",
]);

export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "webhook not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature =
    request.headers.get("webhook-signature") ||
    request.headers.get("polar-signature") ||
    request.headers.get("x-polar-signature");

  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: PolarEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const externalId =
    event.data?.customer?.external_id ??
    event.data?.customer_external_id ??
    null;

  if (!externalId) {
    return NextResponse.json({ ok: true, skipped: "no_external_id" });
  }

  const client = await clerkClient();
  try {
    if (GRANT_EVENTS.has(event.type)) {
      await client.users.updateUserMetadata(externalId, {
        publicMetadata: { pro: true, proSince: new Date().toISOString() },
      });
      return NextResponse.json({ ok: true, action: "granted" });
    }

    if (REVOKE_EVENTS.has(event.type)) {
      await client.users.updateUserMetadata(externalId, {
        publicMetadata: { pro: false },
      });
      return NextResponse.json({ ok: true, action: "revoked" });
    }
  } catch (err) {
    console.error("[polar-webhook] clerk update failed", err);
    return NextResponse.json(
      { error: "update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, action: "ignored" });
}