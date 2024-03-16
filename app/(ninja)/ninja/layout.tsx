import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Footer from "@/components/footer";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "e-ID",
  description: "Digital identity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          inter.className,
          "antialised min-h-screen p-4 sm:py-5 sm:px-10 lg:px-16 lg:py-8 bg-gradient-to-b from-slate-200 to-indigo-200 dark:from-gray-900 dark:to-indigo-950 bg-gradient-to-r flex justify-center items-center"
        )}
      >
        {children}
        <Analytics />
      </body>
      <Footer />
    </html>
  );
}
