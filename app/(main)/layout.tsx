import type { Metadata } from "next";
import { Inter, Oooh_Baby } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import Footer from "@/components/footer";
import { Analytics } from "@vercel/analytics/react";
import UserButton from "@/components/user-button";
import { Toaster } from "@/components/ui/toaster";
import { auth } from "@/auth";
import { SignIn, SignOut } from "@/components/auth-components";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const ooohBaby = Oooh_Baby({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-oooh-baby",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "e-ID @ %s",
    default: "e-ID",
  },
  description: "Digital identity",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en" className={`${inter.variable} ${ooohBaby.variable}`}>
      <body
        className="mx-auto flex h-dvh w-full max-w-2xl flex-col justify-between px-6 font-inter
          antialiased md:pt-3"
      >
        {children}
        <Toaster />
        <Analytics />
        <Footer>
          {session ? (
            session.user?.username ? (
              <div className="flex gap-2">
                <UserButton
                  username={session.user.username}
                  image={session.user.image || null}
                />
                <SignOut />
              </div>
            ) : (
              <Button
                asChild
                variant="ghost"
                className="relative !h-10 !w-10 !p-0 hover:bg-orange-500/10"
              >
                <Link href={`/${session.user?.username}`}>
                  <TriangleAlert
                    strokeWidth={1.5}
                    className="text-orange-500"
                  />
                </Link>
              </Button>
            )
          ) : (
            <SignIn />
          )}
        </Footer>
      </body>
    </html>
  );
}
