"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github, HelpCircle, Menu, X } from "lucide-react";
import { useMediaQuery } from "@mantine/hooks";
import { useState } from "react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export default function Footer() {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <footer
      className={cn(
        open
          ? "opacity-0 cursor-none"
          : "bg-zinc-50/60 dark:bg-zinc-950/60 backdrop-blur-2xl",
        "fixed w-screen bg-white/60 dark:bg-black/60 bottom-0 text-zinc-500 border-t-[0.1px] border-black/15 dark:border-white/15 shadow-2xl "
      )}
    >
      {isMobile && (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button variant="ghost" className="w-full">
              <Menu size={20} strokeWidth={1} />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <ButtonGetEID />
            {/* <ButtonEIDAdrian /> */}
            <ButtonGithub description={true} />
            <ButtonFAQ description={true} />
            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="secondary">
                  <X size={20} strokeWidth={1} />
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
      {!isMobile && (
        <div className="flex justify-between items-center">
          <ButtonGetEID />
          {/* <ButtonEIDAdrian /> */}
          <div>
            <ButtonGithub />
            <ButtonFAQ />
          </div>
        </div>
      )}
    </footer>
  );
}

function ButtonGetEID() {
  return (
    <Button asChild variant="ghost" className="rounded-none">
      <Link
        className="lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500 font-light antialiased"
        href="/"
      >
        👤 Get your e-ID
      </Link>
    </Button>
  );
}
// function ButtonEIDAdrian() {
//   return (
//     <Button asChild variant="ghost" className="rounded-none">
//       <Link
//         className="lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500 font-light antialiased"
//         href="https://e-id.to/ninja/G2wAYETdluo5XTCvqMWSB55zuCo65YC52oI6y40PRveUFZMlKA_tP1rR1w8emcxII4YJ5V3bBc-ZlpNx8NyN6NB8M7KQNaEo"
//       >
//         👤 Adrian Galilea
//       </Link>
//     </Button>
//   );
// }
function ButtonGithub({ description = false }: { description?: boolean }) {
  return (
    <Button asChild variant="ghost" className="rounded-none">
      <Link
        className="lg:decoration-transparent hover:decoration-inherit opacity-90 hover:opacity-100 transition-all duration-500 font-light antialiased"
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
        className="lg:decoration-transparent hover:decoration-inherit hover:opacity-100 transition-all duration-500 font-light antialiased"
        href="/faq"
      >
        <HelpCircle size={16} strokeWidth={1} />
        {description && <span className="ml-1">FAQ</span>}
      </Link>
    </Button>
  );
}
