"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Github, HelpCircle, Menu, X } from "lucide-react";
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
        open ? "opacity-0 cursor-none" : "opacity-100",
        "fixed w-screen bottom-0 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500 shadow-xl backdrop-blur-2xl"
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
            <ButtonEIDAdrian />
            <ButtonGithub />
            <ButtonFAQ />
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
          <ButtonEIDAdrian />
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
        className="lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500"
        href="/"
      >
        👤 Get your e-ID
      </Link>
    </Button>
  );
}
function ButtonEIDAdrian() {
  return (
    <Button asChild variant="ghost" className="rounded-none">
      <Link
        className="lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500"
        href="https://www.e-id.to/GyUBABwHbqxsyimxOWtuqT6Xh2Bo0yJmQzrxGA_bT-aaqcPSFyJv2xjbuVUEdUmdoPiN2aponNZsn2xzBCIGs57C2xeWf_wHWAs2wfYMZ9jB6lVEt3fYZbS3qy1pnK_Lp-Axp8ZwL4xXkRr8zR-5eBg1TFWVwVbSFlzRntKPjyiyTtI9vskUQg3pmBc7rSA4A5t9XoQO"
      >
        👤 Adrian Galilea
      </Link>
    </Button>
  );
}
function ButtonGithub() {
  return (
    <Button asChild variant="ghost" className="rounded-none">
      <Link
        className="lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500"
        href="https://github.com/adriangalilea/e-id"
      >
        <Github size={20} strokeWidth={1} />
      </Link>
    </Button>
  );
}
function ButtonFAQ() {
  return (
    <Button asChild variant="ghost" className="rounded-none">
      <Link
        className="lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500"
        href="/faq"
      >
        <HelpCircle size={20} strokeWidth={1} />
      </Link>
    </Button>
  );
}
