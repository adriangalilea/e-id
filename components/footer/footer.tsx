import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GUTTER } from "@/components/frame";
import { cn } from "@/lib/utils";
import { HelpCircle, Home } from "lucide-react";

import FooterUser from "./footer_user";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div
        className={cn(
          "mx-auto flex h-16 w-full max-w-6xl items-center justify-between",
          GUTTER,
        )}
      >
        <FooterUser />
        <div className="flex gap-1">
          <ButtonFAQ />
          <ButtonHome />
        </div>
      </div>
    </footer>
  );
}

function ButtonHome() {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      render={<Link href="/" aria-label="home" prefetch={false} />}
    >
      <Home strokeWidth={1} />
    </Button>
  );
}

function ButtonFAQ() {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      render={<Link href="/about" aria-label="about" prefetch={false} />}
    >
      <HelpCircle strokeWidth={1} />
    </Button>
  );
}
