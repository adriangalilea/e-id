import { EmojiDomain } from "@/components/brand"
import { HomeLink } from "@/components/footer/home-link"
import { Glass } from "@/components/ui/material-glass"

import FooterUser from "./footer_user"

/** The site's one bar, a pill of glass floating over the page: the wordmark home on
 *  its left, the account on its right. At the top, on every screen: a phone's
 *  foot is its browser's (Safari's controls float there since iOS 26), and a bar
 *  of ours there stacked on them. */
export default function Footer() {
  return (
    <nav
      data-slot="site-nav"
      aria-label="site"
      className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-40 px-3 md:top-4 md:px-8"
    >
      <Glass
        shape="bar"
        className="pointer-events-auto mx-auto flex w-full max-w-md justify-between pl-4 [--glass-size:3.5rem] md:max-w-6xl md:[--glass-size:3.25rem]"
      >
        <HomeLink
          aria-label="home"
          // The wordmark's size is the bar's one (`--wordmark`, globals.css).
          className="text-(length:--wordmark) flex items-center font-light tracking-[-0.02em] transition-opacity [--logo-size:var(--wordmark-logo)] hover:opacity-80"
        >
          <EmojiDomain logo />
        </HomeLink>
        {/* The bar's right end: the account alone. What e-ID is and does is
            the home's to say, never a page of questions. */}
        <FooterUser />
      </Glass>
    </nav>
  )
}
