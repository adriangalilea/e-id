import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Footer from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "e-id",
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
          "min-h-screen p-4 sm:py-5 sm:px-10 lg:px-16 lg:py-8 bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-zinc-400 via-zinc-300 to-zinc-100 dark:from-zinc-800 dark:via-zinc-700 to-zinc-100 flex justify-center items-center"
        )}
      >
        {children}
      </body>
      <Footer />
    </html>
  );
}
