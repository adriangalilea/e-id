import type { Metadata } from "next"
import Link from "next/link"
import { FONT_VARIABLES } from "./fonts"
import "./globals.css"
import Footer from "@/components/footer/footer"
import { PageLight } from "@/components/light"
import { SitePageSensor } from "@/components/page-sensor"
import { FocusSource } from "@/components/ui/focus-source"
import { NextImageLoaderProvider } from "@/components/ui/image"
import { MaterialProvider } from "@/components/ui/material"
import { Toaster } from "@/components/ui/toast"
import { PROD_URL } from "@/lib/const"
import { visitsEnabled } from "@/lib/visit-store"

export const metadata: Metadata = {
  title: {
    template: "%s · e-ID",
    // The hero's own words, the name first: a tab shows the person mark as its
    // icon, and a title opening with 👤 too read it twice and cut off mid-phrase.
    default: "e-ID · your digital identity",
  },
  description:
    "one link for everywhere you are online. sign in with github and your page fills itself.",
  authors: [{ name: "Adrian Galilea" }],
  keywords: [
    "link in bio",
    "emoji domain",
    "developer profile",
    "github",
    "profile",
  ],
  creator: "Adrian Galilea",
  publisher: "Adrian Galilea",
  // e-id.to is the canonical host of every page: it is where crawlers and every
  // browser but Safari land (next.config). 👤.to is the brand people share.
  metadataBase: new URL(PROD_URL),
  robots: "index, follow",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${FONT_VARIABLES} dark`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <PageLight />
        {/* Every control on e-id wears its glass face. */}
        <MaterialProvider material="glass">
          {/* Room for the site's bar at the top: its height and its gap, under
              a phone's status bar where there is one. Cut at the window's sides:
              a subject's light spreads well past it (components/light), and
              unclipped it widened a phone's page until the browser zoomed out.
              `clip`, not `hidden`, so nothing in it stops being sticky. */}
          <div
            data-slot="page"
            className="flex flex-1 flex-col overflow-x-clip pt-[calc(max(env(safe-area-inset-top),0.75rem)+4.5rem)] pb-12 md:pt-20"
          >
            <NextImageLoaderProvider>{children}</NextImageLoaderProvider>
            {/* What every page owes the people reading it, at its very foot. */}
            <footer className="mt-auto flex justify-center gap-3 pt-16 font-mono text-foreground/40 text-xs">
              <Link href="/pro" className="hover:text-foreground/70">
                pro
              </Link>
              <Link href="/privacy" className="hover:text-foreground/70">
                privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground/70">
                terms
              </Link>
            </footer>
          </div>
          <Toaster />
          <Footer />
        </MaterialProvider>
        {/* The focus ring answers keyboard navigation only: a key pressed after a
            click (a shortcut, a modifier, switching windows) never rings what the
            click focused. */}
        <FocusSource />
        {/* The site's visits are its own (lib/visit-store), no third party's. */}
        {visitsEnabled && <SitePageSensor />}
      </body>
    </html>
  )
}
