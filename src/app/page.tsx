import { auth } from "@/auth";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { Hero } from "@/components/marketing/sections/hero";
import { FeatureRow } from "@/components/marketing/sections/feature-row";
import { Glance } from "@/components/marketing/sections/glance";
import { WorkspaceShowcase } from "@/components/marketing/sections/workspace-showcase";
import { Bento } from "@/components/marketing/sections/bento";
import { Faq } from "@/components/marketing/sections/faq";
import { ClosingBand } from "@/components/marketing/sections/closing-band";
import { ROUTES } from "@/config/routes";
import { FEATURES } from "@/content/landing";

/**
 * The landing page: composition only. Copy lives in `src/content/landing.ts`,
 * each section in `src/components/marketing/sections/`.
 */
export default async function HomePage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const primaryHref = signedIn ? ROUTES.dashboard : ROUTES.signUp;
  const cta = { primaryHref, signedIn };

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader signedIn={signedIn} />

      <main id="main-content" className="flex-1 overflow-x-clip">
        <Hero {...cta} />
        <FeatureRow feature={FEATURES.offline} />
        <FeatureRow feature={FEATURES.merge} />
        <FeatureRow feature={FEATURES.history} />
        <Glance {...cta} />
        <FeatureRow feature={FEATURES.ai} />
        <WorkspaceShowcase />
        <Bento />
        <FeatureRow feature={FEATURES.security} />
        <Faq {...cta} />
        <ClosingBand {...cta} />
      </main>

      <SiteFooter />
    </div>
  );
}
