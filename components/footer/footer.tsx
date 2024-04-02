import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HelpCircle, Home } from "lucide-react";

import FooterUser from "./footer_user";
import { Suspense } from "react";
import Image from "next/image";

export default async function Footer() {
  return (
    <footer
      className="shadow-top-light dark:shadow-top flex w-full justify-between bg-zinc-500/10
        text-zinc-500 backdrop-blur-2xl dark:border-white/15"
    >
      <Suspense
        fallback={
          <div className="flex size-10 items-center justify-center">
            <Image
              src="./ball-triangle.svg"
              className="size-6"
              alt="loading animation"
            />
          </div>
        }
      >
        <FooterUser />
      </Suspense>

      <div className="flex gap-2">
        <ButtonFAQ />
        <ButtonHome />
      </div>
    </footer>
  );
}

function ButtonHome() {
  return (
    <Button asChild variant="ghost" size="icon">
      <Link href="/" aria-label="home" prefetch={false}>
        <Home strokeWidth={1} />
      </Link>
    </Button>
  );
}

function ButtonFAQ() {
  return (
    <Button asChild variant="ghost" size="icon">
      <Link href="/about" aria-label="about" prefetch={false}>
        <HelpCircle strokeWidth={1} />
      </Link>
    </Button>
  );
}
