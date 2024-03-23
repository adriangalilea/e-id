"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Github, HelpCircle, Home } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Footer({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="flex w-full justify-between border-t-[0.1px] border-black/15 bg-zinc-50/60 text-zinc-500 shadow-2xl backdrop-blur-2xl dark:border-white/15 dark:bg-zinc-950/60 ">
      <div className="flex items-center">
        {children}
        <Separator
          orientation="vertical"
          className="px-0! h-full py-5 sm:hidden"
        />
      </div>
      <div className="flex">
        <ButtonGithub />
        <Separator
          orientation="vertical"
          className="px-0! h-full py-5 sm:hidden"
        />
        <ButtonFAQ />
        <Separator
          orientation="vertical"
          className="px-0! h-full py-5 sm:hidden"
        />
        <ButtonHome />
      </div>
    </footer>
  );
}

function ButtonHome() {
  return (
    <Button asChild variant="ghost" className="rounded-none">
      <Link href="/">
        <Home strokeWidth={1} />
      </Link>
    </Button>
  );
}

function ButtonGithub() {
  return (
    <Button asChild variant="ghost" className="rounded-none">
      <Link href="https://github.com/adriangalilea/e-id" target="_blank">
        <Github strokeWidth={1} />
      </Link>
    </Button>
  );
}
function ButtonFAQ() {
  return (
    <Button asChild variant="ghost" className="rounded-none">
      <Link href="/faq">
        <HelpCircle strokeWidth={1} />
      </Link>
    </Button>
  );
}
