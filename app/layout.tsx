import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer/footer";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/toaster";
import { PROD_URL } from "@/lib/const";
import { SitePageSensor } from "@/components/page-sensor";
import { visitsEnabled } from "@/lib/visit-store";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
      className={`${inter.variable} ${spaceMono.variable} overflow-auto`}
    >
      <body
        className="font-inter mx-auto flex h-dvh max-h-full w-full max-w-2xl flex-col
          justify-between px-6 antialiased"
      >
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
        {visitsEnabled && <SitePageSensor />}
        <Footer />
      </body>
    </html>
  );
}
