"use client";

import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiDomain } from "@/components/brand";
import { useChip } from "@/components/session/use-chip";
import { startSignIn } from "@/lib/sign-in";

/** The call to action: the button's own glass face (the page's MaterialProvider),
 *  as tall as the headline's rung and wide enough to read as the way in. */
const CTA =
  "h-14 w-full justify-between gap-4 px-7 text-base [--glass-size:3.5rem] sm:w-auto sm:min-w-80 sm:self-start";

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

/** Under every profile, for a visitor who has none: where to get one, one line at
 *  the page's foot. */
export function MakeYourOwn() {
  const chip = useChip();
  if (chip !== null) return null;
  return (
    <Link
      href="/"
      className="group flex items-center self-start gap-3 text-[15px] text-foreground/55 transition-colors hover:text-foreground"
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
