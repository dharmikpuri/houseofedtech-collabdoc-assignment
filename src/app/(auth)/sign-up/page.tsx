import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">Start writing in seconds.</p>
      <AuthForm mode="sign-up" />
    </div>
  );
}
