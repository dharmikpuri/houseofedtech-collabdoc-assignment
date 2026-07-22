"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { renameDocument } from "@/lib/authz/documents";
import { renameDocumentSchema } from "@/lib/validation/document";

export type RenameResult = { ok: true } | { ok: false; error: string };

export async function renameDocumentAction(
  documentId: string,
  title: string,
): Promise<RenameResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };

  const parsed = renameDocumentSchema.safeParse({ title });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid title" };
  }

  const result = await renameDocument(session.user.id, documentId, parsed.data.title);
  if (!result.ok) {
    return { ok: false, error: result.reason === "forbidden" ? "Not allowed" : "Not found" };
  }

  // Keep the dashboard list title in sync.
  revalidatePath("/dashboard");
  return { ok: true };
}
