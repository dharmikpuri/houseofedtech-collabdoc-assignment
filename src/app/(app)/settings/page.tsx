import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound, UserRound } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { PasswordForm, ProfileForm } from "./settings-forms";
import { ROUTES } from "@/config/routes";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect(ROUTES.signIn);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, createdAt: true },
  });
  if (!user) redirect(ROUTES.signIn);

  const displayName = user.name ?? user.email.split("@")[0] ?? "Account";

  return (
    <div className="animate-page-in container-narrow py-[clamp(1.75rem,3vw,2.5rem)]">
      <PageHeader title="Settings" description="Manage your profile and sign-in details." />

      {/* Identity card */}
      <div className="card mt-7 rounded-xl">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar name={displayName} id={session.user.id} size="lg" className="size-12 text-base" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold tracking-tight">{displayName}</p>
            <p className="text-muted-foreground truncate text-sm">{user.email}</p>
          </div>
          <p className="text-muted-foreground text-xs">
            Member since{" "}
            <span className="text-foreground font-medium">
              {user.createdAt.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
          </p>
        </div>
      </div>

      <SettingsSection
        id="profile"
        icon={<UserRound />}
        title="Profile"
        description="Your name appears on your comments, versions and presence cursor."
      >
        <ProfileForm initialName={user.name ?? ""} />
      </SettingsSection>

      <SettingsSection
        id="password"
        icon={<KeyRound />}
        title="Password"
        description="At least 8 characters, with a letter and a number."
      >
        <PasswordForm />
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="card mt-5 grid gap-6 rounded-xl p-6 md:grid-cols-[220px_1fr]"
      aria-labelledby={`${id}-heading`}
    >
      <div>
        <h2
          id={`${id}-heading`}
          className="flex items-center gap-2 text-sm font-semibold [&_svg]:size-4"
        >
          <span className="text-muted-foreground" aria-hidden>
            {icon}
          </span>
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
      </div>
      <div className="min-w-0 [&>form]:mt-0">{children}</div>
    </section>
  );
}
