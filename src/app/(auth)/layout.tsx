import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AUTHOR, AuthorLinks } from "@/components/layout/site-footer";
import { AuthShowcase } from "@/components/marketing/auth-showcase";

/**
 * Split-screen auth layout: the form on the left, an inset brand panel on the
 * right (desktop only). On small screens the form simply fills the viewport.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="relative flex min-h-dvh flex-col px-5 sm:px-10">
        <header className="relative flex h-16 items-center justify-between">
          <Logo />
          <ThemeToggle />
        </header>

        <main id="main-content" className="relative flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px] animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]">
            {children}
          </div>
        </main>

        <footer className="text-muted-foreground relative flex h-16 items-center justify-between gap-3 text-xs">
          <p>
            Built by <span className="text-foreground font-medium">{AUTHOR.name}</span>
          </p>
          <AuthorLinks />
        </footer>
      </div>

      <aside className="hidden p-3 lg:block">
        <div className="sticky top-3 h-[calc(100dvh-1.5rem)]">
          <AuthShowcase />
        </div>
      </aside>
    </div>
  );
}
