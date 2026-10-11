import { FileText, FlaskConical, MessageSquareText, Settings, type LucideIcon } from "lucide-react";

import { LANDING_SECTIONS, ROUTES } from "@/config/routes";

/**
 * Every navigation menu in the product, defined once. Add, rename or reorder a
 * link here and the header, footer and sidebar follow.
 */

export type NavLink = { href: string; label: string };

/** Public site header (and its mobile menu). */
export const MARKETING_NAV: NavLink[] = [
  { href: LANDING_SECTIONS.features, label: "Features" },
  { href: LANDING_SECTIONS.howItWorks, label: "How it works" },
  { href: LANDING_SECTIONS.ai, label: "AI" },
  { href: LANDING_SECTIONS.security, label: "Privacy" },
  { href: LANDING_SECTIONS.faq, label: "FAQ" },
  { href: ROUTES.lab, label: "Sync lab" },
];

/** Public site footer, one entry per column. */
export const FOOTER_NAV: { title: string; links: NavLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: LANDING_SECTIONS.features, label: "Offline editing" },
      { href: LANDING_SECTIONS.howItWorks, label: "Conflict-free merge" },
      { href: LANDING_SECTIONS.history, label: "Version history" },
      { href: LANDING_SECTIONS.ai, label: "AI assistant" },
      { href: LANDING_SECTIONS.security, label: "Privacy" },
    ],
  },
  {
    title: "Explore",
    links: [
      { href: ROUTES.lab, label: "Sync lab" },
      { href: LANDING_SECTIONS.faq, label: "FAQ" },
      { href: LANDING_SECTIONS.demo, label: "Live demo" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: ROUTES.signUp, label: "Create account" },
      { href: ROUTES.signIn, label: "Sign in" },
      { href: ROUTES.dashboard, label: "Open the app" },
    ],
  },
];

/** Signed-in app sidebar. */
export const APP_NAV: {
  label: string;
  items: { href: string; label: string; icon: LucideIcon }[];
}[] = [
  {
    label: "Workspace",
    items: [
      { href: ROUTES.dashboard, label: "Documents", icon: FileText },
      { href: ROUTES.search, label: "Search & Ask", icon: MessageSquareText },
    ],
  },
  {
    label: "More",
    items: [
      { href: ROUTES.lab, label: "Sync lab", icon: FlaskConical },
      { href: ROUTES.settings, label: "Settings", icon: Settings },
    ],
  },
];
