"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import { deleteDocumentAction } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { confirmToast } from "@/components/ui/confirm-toast";

/**
 * Client-side so we can confirm before deleting and show a pending state.
 * The actual delete + authorization happens server-side in the action.
 */
export function DeleteDocumentButton({
  documentId,
  title,
  variant = "icon",
}: {
  documentId: string;
  title: string;
  /** "icon" for list/card rows; "item" for a full-width menu row. */
  variant?: "icon" | "item";
}) {
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    // Deletion isn't queued offline on purpose: applying it later, after the
    // user may have changed their mind or a collaborator kept working, is a
    // surprise nobody wants. Say so up front instead of failing after confirm.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Deleting a document needs a connection. Try again when you're back online.");
      return;
    }

    const confirmed = await confirmToast(
      `Delete "${title}"? It will be removed from your workspace.`,
      "Delete",
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteDocumentAction(documentId);
        toast.success("Document deleted");
      } catch {
        toast.error("Could not delete the document. Check your connection and try again.");
      }
    });
  }

  if (variant === "item") {
    return (
      <Button
        type="button"
        variant="danger-ghost"
        size="sm"
        onClick={handleDelete}
        loading={isPending}
        className="w-full justify-start"
      >
        {!isPending && <Trash2 />}
        Delete
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="danger-ghost"
      size="icon-sm"
      onClick={handleDelete}
      loading={isPending}
      aria-label={`Delete ${title}`}
    >
      {!isPending && <Trash2 />}
    </Button>
  );
}
