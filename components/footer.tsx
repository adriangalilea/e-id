"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github, HelpCircle, Home, Menu, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Footer({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="fixed bottom-0 w-screen border-t-[0.1px] border-black/15 bg-zinc-50/60 text-zinc-500 shadow-2xl backdrop-blur-2xl dark:border-white/15 dark:bg-zinc-950/60 ">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button asChild variant="ghost" className="rounded-none">
            <Link href="/">
              <Home strokeWidth={1} />
            </Link>
          </Button>
          <Separator
            orientation="vertical"
            className="px-0! h-full py-5 sm:hidden"
          />
          {children}
        </div>
        <div className="flex">
          <ButtonGithub />
          <Separator
            orientation="vertical"
            className="px-0! h-full py-5 sm:hidden"
          />
          <ButtonFAQ />
        </div>
      </div>
    </footer>
  );
}

function ButtonGithub({ description = false }: { description?: boolean }) {
  return (
    <Button asChild variant="ghost" className="rounded-none">
      <Link
        className="font-light opacity-90 hover:decoration-inherit hover:opacity-100 lg:decoration-transparent"
        href="https://github.com/adriangalilea/e-id"
        target="_blank"
      >
        <Github strokeWidth={1} />
        {description && (
          <>
            <span className="ml-0.5">Source code</span>
            <ExternalLink strokeWidth={1} className="ml-0.5" />
          </>
        )}
      </Link>
    </Button>
  );
}
function ButtonFAQ({ description = false }: { description?: boolean }) {
  return (
    <Button asChild variant="ghost" className="rounded-none">
      <Link
        className="font-light hover:decoration-inherit hover:opacity-100 lg:decoration-transparent"
        href="/faq"
      >
        <HelpCircle strokeWidth={1} />
        {description && <span className="ml-1">FAQ</span>}
      </Link>
    </Button>
  );
}
