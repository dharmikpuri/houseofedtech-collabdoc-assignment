import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">Sign in to your documents.</p>
      <AuthForm mode="sign-in" />
    </div>
  );
}
