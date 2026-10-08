import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { safeRedirectPath } from "@/lib/security/redirect";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const destination = callbackUrl ? safeRedirectPath(callbackUrl) : undefined;

  return (
    <div>
      <h1 className="font-display text-[1.75rem] leading-tight">Create your workspace</h1>
      <p className="text-muted-foreground mt-1.5 mb-8 text-sm">
        Start writing in seconds. It works offline from the very first keystroke.
      </p>
      <AuthForm mode="sign-up" callbackUrl={destination} />
    </div>
  );
}
