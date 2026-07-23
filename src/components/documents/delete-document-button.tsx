"use client";

import { useTransition } from "react";
import { toast } from "react-toastify";

import { deleteDocumentAction } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { confirmToast } from "@/components/ui/confirm-toast";

/**
 * Client-side so we can confirm before deleting and show a pending state.
 * The actual delete + authorization happens server-side in the action.
 */
export function DeleteDocumentButton({ documentId, title }: { documentId: string; title: string }) {
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const confirmed = await confirmToast(
      `Delete "${title}"? You won't be able to undo this from the UI.`,
      "Delete",
    );
    if (!confirmed) return;
    startTransition(() => {
      deleteDocumentAction(documentId);
      toast.success("Document deleted");
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={`Delete ${title}`}
      className="text-red-600 dark:text-red-400"
    >
      {isPending ? "Deleting…" : "Delete"}
    </Button>
  );
}
