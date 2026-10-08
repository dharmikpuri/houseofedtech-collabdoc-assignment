"use client";

import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { createDocumentAction } from "@/app/(app)/dashboard/actions";

function SubmitButton({ compact, ...props }: ButtonProps & { compact?: boolean }) {
  // The action redirects to the new document; until then, show it's working.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {!pending && <Plus />}
      {!compact && <span>{pending ? "Creating…" : "New document"}</span>}
    </Button>
  );
}

/** "New document" as a server-action form with a visible pending state. */
export function CreateDocumentButton({
  compact = false,
  formClassName,
  ...props
}: ButtonProps & { compact?: boolean; formClassName?: string }) {
  return (
    <form action={createDocumentAction} className={formClassName}>
      <SubmitButton compact={compact} {...props} />
    </form>
  );
}
