"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github, HelpCircle, Home, Menu, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Footer({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="fixed bottom-0 bg-zinc-50/60 dark:bg-zinc-950/60 backdrop-blur-2xl w-screen text-zinc-500 border-t-[0.1px] border-black/15 dark:border-white/15 shadow-2xl ">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button asChild variant="ghost" className="rounded-none">
            <Link href="/">
              <Home size={20} strokeWidth={1} />
            </Link>
          </Button>
          <Separator
            orientation="vertical"
            className="sm:hidden h-full py-5 px-0!"
          />
          {children}
        </div>
        <div className="flex">
          <ButtonGithub />
          <Separator
            orientation="vertical"
            className="sm:hidden h-full py-5 px-0!"
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
        className="lg:decoration-transparent hover:decoration-inherit opacity-90 hover:opacity-100 font-light"
        href="https://github.com/adriangalilea/e-id"
        target="_blank"
      >
        <Github size={16} strokeWidth={1} />
        {description && (
          <>
            <span className="ml-0.5">Source code</span>
            <ExternalLink size={16} strokeWidth={1} className="ml-0.5" />
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
        className="lg:decoration-transparent hover:decoration-inherit hover:opacity-100 font-light"
        href="/faq"
      >
        <HelpCircle size={16} strokeWidth={1} />
        {description && <span className="ml-1">FAQ</span>}
      </Link>
    </Button>
  );
}
