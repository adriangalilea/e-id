import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { EmojiDomain } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/material-glass";

import FooterUser from "./footer_user";

/** The site's one bar, a pill of glass floating over the page: the wordmark home on
 *  its left, the faq and the account on its right. At the foot of a phone, where
 *  the thumb is; at the top of a wide screen, where the eye starts. On the home's
 *  wide screen there is none: the hero itself becomes this bar as the page scrolls
 *  (`hero` in globals.css). */
export default function Footer() {
  return (
    <nav
      data-slot="site-nav"
      aria-label="site"
      className="pointer-events-none fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-40 px-3 md:top-4 md:bottom-auto md:px-8"
    >
      <Glass
        shape="bar"
        className="pointer-events-auto mx-auto flex w-full max-w-md justify-between pl-4 [--glass-size:3.5rem] md:max-w-6xl md:[--glass-size:3.25rem]"
      >
        <Link
          href="/"
          aria-label="home"
          // The wordmark's size is the bar's one (`--wordmark`, globals.css),
          // which the home's hero closes into.
          className="flex items-center text-(length:--wordmark) font-light tracking-[-0.02em] transition-opacity [--logo-size:calc(var(--wordmark-logo)*1cap)] hover:opacity-80"
        >
          <EmojiDomain logo />
        </Link>
        <NavActions />
      </Glass>
    </nav>
  );
}

/** The bar's right end: the faq and the account. Also what the home's hero shows
 *  at its right end once it has become the bar. */
export function NavActions() {
  return (
    // The faq a disc of the same glass and height as the account's pill beside
    // it: two controls of one bar, not a bare glyph next to a button.
    <div className="flex items-center gap-2">
      <Button
        size="icon-lg"
        render={<Link href="/about" aria-label="about" prefetch={false} />}
      >
        <HelpCircle strokeWidth={1.5} />
      </Button>
      <FooterUser />
    </div>
  );
}
