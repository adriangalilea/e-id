"use client";

import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiDomain } from "@/components/brand";
import { useChip } from "@/components/session/use-chip";
import { startSignIn } from "@/lib/sign-in";

/** The call to action: a quiet pill whose foil, e-id's accent, lights only under
 *  the hand and where the hand is (`data-cta` in globals.css draws it; the hero's
 *  Tilt gives it the hand), the arrow leaning on toward where it goes. */
const CTA =
  "group h-14 w-full justify-between gap-4 rounded-full px-7 text-[17px] font-medium sm:w-auto sm:min-w-64 sm:self-start";

const ARROW = (
  <ArrowRight
    strokeWidth={1.5}
    className="size-5 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
    aria-hidden
  />
);

/** The landing's call to action, from the display cookie: sign in with GitHub,
 *  or the page the visitor already has. Empty until the page is the browser's,
 *  holding its height. */
export function MakeYours() {
  const chip = useChip();
  if (chip === undefined) return <div className="h-14" aria-hidden />;
  if (chip === null)
    return (
      <Button
        size="lg"
        material="plain"
        data-cta=""
        className={CTA}
        onClick={() => startSignIn()}
      >
        <span className="flex items-center gap-3">
          <Github strokeWidth={1.5} className="size-5" aria-hidden />
          make yours
        </span>
        {ARROW}
      </Button>
    );
  if (!chip.u)
    return (
      <Button
        size="lg"
        material="plain"
        data-cta=""
        className={CTA}
        render={<Link href="/null" />}
      >
        pick your username
        {ARROW}
      </Button>
    );
  return (
    <Button
      size="lg"
      material="plain"
        data-cta=""
      className={CTA}
      render={<Link href={`/${chip.u}`} />}
    >
      <span>
        go to <EmojiDomain path={`/${chip.u}`} />
      </span>
      {ARROW}
    </Button>
  );
}
