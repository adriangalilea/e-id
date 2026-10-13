import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer/footer";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/toaster";
import { MaterialProvider } from "@/components/ui/material";
import { PROD_URL } from "@/lib/const";
import { SitePageSensor } from "@/components/page-sensor";
import { visitsEnabled } from "@/lib/visit-store";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s · e-id",
    default: "your page at 👤.to/you",
  },
  description:
    "one link for every place you are online. sign in with github and your page fills itself.",
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
      className={`${spaceGrotesk.variable} ${spaceMono.variable} dark`}
    >
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        {/* Every control on e-id wears its glass face. */}
        <MaterialProvider material="glass">
          <div className="flex flex-1 flex-col">{children}</div>
          <Toaster />
          <Footer />
        </MaterialProvider>
        <Analytics />
        <SpeedInsights />
        {visitsEnabled && <SitePageSensor />}
      </body>
    </html>
  );
}
