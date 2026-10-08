"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { redeemShareLink } from "@/lib/authz/share-links";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { shareTokenSchema } from "@/lib/validation/workspace";

export type AcceptInviteState = { error?: string };

const REASONS = {
  invalid: "This invite link is not valid.",
  expired: "This invite link has expired. Ask the owner for a new one.",
  revoked: "This invite link was revoked by the owner.",
} as const;

/**
 * Joins a document via an invite link. An explicit POST from the "Join" button
 * — never a side effect of loading the page — so link unfurlers and
 * prefetching can't grant access on anyone's behalf.
 */
export async function acceptInviteAction(
  token: string,
  _prev: AcceptInviteState,
): Promise<AcceptInviteState> {
  const ip = clientIp(await headers());
  if (!(await rateLimit(`invite-accept:${ip}`, 20, 60_000)).ok) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);

  if (!shareTokenSchema.safeParse(token).success) return { error: REASONS.invalid };

  const result = await redeemShareLink(token, session.user.id);
  if (!result.ok) return { error: REASONS[result.reason] };

  revalidatePath("/dashboard");
  redirect(`/documents/${result.documentId}`);
}
