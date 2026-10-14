import type { Metadata } from "next";
import { FONT_VARIABLES } from "./fonts";
import "./globals.css";
import Footer from "@/components/footer/footer";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/toast";
import { MaterialProvider } from "@/components/ui/material";
import { FocusSource } from "@/components/ui/focus-source";
import { NextImageLoaderProvider } from "@/components/ui/image";
import { PageLight } from "@/components/light";
import { PROD_URL } from "@/lib/const";
import { SitePageSensor } from "@/components/page-sensor";
import { visitsEnabled } from "@/lib/visit-store";

export const metadata: Metadata = {
  title: {
    template: "%s · e-ID",
    default: "your page at 👤.to/you",
  },
  description:
    "one link for everywhere you are online. sign in with github and your page fills itself.",
  authors: [{ name: "Adrian Galilea" }],
  keywords: ["link in bio", "emoji domain", "developer profile", "github", "profile"],
  creator: "Adrian Galilea",
  publisher: "Adrian Galilea",
  // e-id.to is the canonical host of every page: it is where crawlers and every
  // browser but Safari land (next.config). 👤.to is the brand people share.
  metadataBase: new URL(PROD_URL),
  robots: "index, follow",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${FONT_VARIABLES} dark`}
    >
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <PageLight />
        {/* Every control on e-id wears its glass face. */}
        <MaterialProvider material="glass">
          {/* Room for the site's bar: under it at the top of a wide screen, over it
              at the foot of a phone. */}
          <div
            data-slot="page"
            className="flex flex-1 flex-col pb-24 md:pt-20 md:pb-12"
          >
            <NextImageLoaderProvider>{children}</NextImageLoaderProvider>
          </div>
          <Toaster />
          <Footer />
        </MaterialProvider>
        {/* The focus ring answers keyboard navigation only: a key pressed after a
            click (a shortcut, a modifier, switching windows) never rings what the
            click focused. */}
        <FocusSource />
        <Analytics />
        <SpeedInsights />
        {visitsEnabled && <SitePageSensor />}
      </body>
    </html>
  );
}
