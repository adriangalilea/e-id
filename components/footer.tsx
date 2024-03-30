"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HelpCircle, Home } from "lucide-react";

export default function Footer({ children }: { children?: React.ReactNode }) {
  return (
    <footer
      className="mt-2 flex w-full justify-between bg-zinc-500/10 text-zinc-500 shadow-2xl
        backdrop-blur-2xl dark:border-white/15"
    >
      <div className="flex">{children}</div>
      <div className="flex gap-2">
        <ButtonFAQ />
        <ButtonHome />
      </div>
    </footer>
  );
}

function ButtonHome() {
  return (
    <Button asChild variant="ghost" className="!h-10 !w-10 !p-0">
      <Link href="/">
        <Home strokeWidth={1} />
      </Link>
    </Button>
  );
}

function ButtonFAQ() {
  return (
    <Button asChild variant="ghost" className="!h-10 !w-10 !p-0">
      <Link href="/about">
        <HelpCircle strokeWidth={1} />
      </Link>
    </Button>
  );
}
