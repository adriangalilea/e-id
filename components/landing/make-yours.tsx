"use client";

import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiDomain } from "@/components/brand";
import { useChip } from "@/components/session/use-chip";
import { startSignIn } from "@/lib/sign-in";

/** The call to action's block: solid, the page's ink, standing off the page on a
 *  hard shadow that the press takes away. */
const CTA =
  "h-14 w-full justify-between gap-4 px-6 text-base sm:w-auto sm:min-w-80 sm:self-start shadow-[6px_6px_0_0_rgb(255_255_255/0.18)] transition-[translate,box-shadow,background-color] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_rgb(255_255_255/0.24)] active:translate-x-1 active:translate-y-1 active:shadow-none";

const ARROW = <ArrowRight strokeWidth={1.5} className="size-5" aria-hidden />;

/** The landing's call to action, from the display cookie: sign in with GitHub,
 *  or the page the visitor already has. Empty until the page is the browser's,
 *  holding its height. */
export function MakeYours() {
  const chip = useChip();
  if (chip === undefined) return <div className="h-14" aria-hidden />;
  if (chip === null)
    return (
      <Button size="lg" className={CTA} onClick={() => startSignIn()}>
        <span className="flex items-center gap-3">
          <Github strokeWidth={1.5} className="size-5" aria-hidden />
          make yours with github
        </span>
        {ARROW}
      </Button>
    );
  if (!chip.u)
    return (
      <Button size="lg" className={CTA} render={<Link href="/null" />}>
        pick your username
        {ARROW}
      </Button>
    );
  return (
    <Button size="lg" className={CTA} render={<Link href={`/${chip.u}`} />}>
      <span>
        go to <EmojiDomain path={`/${chip.u}`} />
      </span>
      {ARROW}
    </Button>
  );
}

/** Under every profile, for a visitor who has none: where to get one. */
export function MakeYourOwn() {
  const chip = useChip();
  if (chip !== null) return null;
  return (
    <Link
      href="/"
      className="group flex h-16 items-center justify-between border border-border px-5 text-[15px] transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
    >
      <span>
        make your own <EmojiDomain /> page
      </span>
      <ArrowRight
        strokeWidth={1.5}
        aria-hidden
        className="size-5 transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}
