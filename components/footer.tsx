import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Github, HelpCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-screen fixed bottom-0 z-20 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500 shadow-xl shadow-zinc-50 backdrop-blur-2xl">
      <div className="flex justify-between items-center">
        <Button asChild variant="ghost" className="rounded-none">
          <Link
            className="lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500"
            href="https://www.e-id.to/GyUBABwHbqxsyimxOWtuqT6Xh2Bo0yJmQzrxGA_bT-aaqcPSFyJv2xjbuVUEdUmdoPiN2aponNZsn2xzBCIGs57C2xeWf_wHWAs2wfYMZ9jB6lVEt3fYZbS3qy1pnK_Lp-Axp8ZwL4xXkRr8zR-5eBg1TFWVwVbSFlzRntKPjyiyTtI9vskUQg3pmBc7rSA4A5t9XoQO"
          >
            👤 Get your e-id
          </Link>
        </Button>
        <Button asChild variant="ghost" className="rounded-none">
          <Link
            className="lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500"
            href="/"
          >
            👤 Adrian Galilea
          </Link>
        </Button>
        <div>
          <Button asChild variant="ghost" className="rounded-none">
            <Link
              className="lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500"
              href="https://github.com/adriangalilea/e-id"
            >
              <Github size={20} strokeWidth={1} />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-none">
            <Link
              className="lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500"
              href="/faq"
            >
              <HelpCircle size={20} strokeWidth={1} />
            </Link>
          </Button>
        </div>
      </div>
    </footer>
  );
}
