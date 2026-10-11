"use client";

import { useRef } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { confirmToast } from "@/components/ui/confirm-toast";
import { useOutbox } from "@/lib/outbox/use-outbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/config/routes";

/**
 * Account menu.
 *
 * Sign-out is a server action, so the session cookie is cleared on the server
 * rather than trusting the client. The menu item submits a hidden form instead
 * of nesting a <button> inside the item — nested interactive elements are
 * invalid HTML and confuse assistive tech.
 */
export function UserMenu({
  name,
  email,
  userId,
  signOutAction,
}: {
  name: string;
  email: string;
  userId: string;
  signOutAction: () => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { items } = useOutbox();

  // Queued changes are stored per user on this device and resume on the next
  // sign-in, so signing out is safe — but the user should know they exist.
  async function handleSignOut() {
    if (items.length > 0) {
      const confirmed = await confirmToast(
        `You have ${items.length} change${items.length === 1 ? "" : "s"} that haven't synced yet. They stay saved on this device and will sync the next time you sign in here. Sign out anyway?`,
        "Sign out",
      );
      if (!confirmed) return;
    }
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={signOutAction} className="hidden" />

      <DropdownMenu>
        <DropdownMenuTrigger
          className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="Account menu"
        >
          <Avatar name={name} id={userId} size="md" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
            <Avatar name={name} id={userId} size="md" />
            <span className="min-w-0">
              <span className="text-foreground block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs font-normal">{email}</span>
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href={ROUTES.settings}>
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => void handleSignOut()}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
