import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import Footer from "@/components/footer";
import { Analytics } from "@vercel/analytics/react";
import UserButton from "@/components/user-button";
import { Toaster } from "@/components/ui/toaster";
import { auth } from "@/auth";
import { SignIn, SignOut } from "@/components/auth-components";
import { Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "e-ID",
  description: "Digital identity",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body
        className={cn(
          inter.className,
          "mx-auto flex h-dvh w-full max-w-2xl flex-col justify-between  bg-zinc-50 px-6 pt-3 antialiased md:pt-6 dark:bg-zinc-950",
        )}
      >
        {children}
        <Toaster />
        <Analytics />
        <Footer>
          {session ? (
            <div className="flex gap-2">
              <UserButton
                username={session.user?.username!}
                image={session.user?.image!}
              />
              <Button
                asChild
                variant="ghost"
                className="!h-10 !w-10 rounded-none !p-0"
              >
                <Link href={`/${session.user?.username}/edit`}>
                  <Pen strokeWidth={1} />
                </Link>
              </Button>

              <SignOut />
            </div>
          ) : (
            <SignIn />
          )}
        </Footer>
      </body>
    </html>
  );
}
