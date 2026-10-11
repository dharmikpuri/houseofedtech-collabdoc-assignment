"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createDocument, deleteDocument } from "@/lib/authz/documents";
import { ROUTES, documentPath } from "@/config/routes";

/**
 * Server actions run only on the server, so they re-check the session
 * themselves — they never trust the caller. Each one resolves the current user
 * before touching data.
 */

export async function createDocumentAction() {
  const session = await auth();
  if (!session?.user) redirect(ROUTES.signIn);

  const doc = await createDocument(session.user.id);
  redirect(documentPath(doc.id));
}

export async function deleteDocumentAction(documentId: string) {
  const session = await auth();
  if (!session?.user) redirect(ROUTES.signIn);

  await deleteDocument(session.user.id, documentId);
  revalidatePath(ROUTES.dashboard);
}
