import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import Footer from "@/components/footer";
import { Analytics } from "@vercel/analytics/react";
import UserButton from "@/components/user-button";
import { Toaster } from "@/components/ui/toaster";

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
          "antialised min-h-screen p-4 sm:py-5 sm:px-10 lg:px-16 lg:py-8 flex justify-center items-center bg-zinc-50 dark:bg-zinc-950"
        )}
      >
        {children}
        <Toaster />
        <Analytics />
        <Footer>
          <UserButton />
        </Footer>
      </body>
    </html>
  );
}
