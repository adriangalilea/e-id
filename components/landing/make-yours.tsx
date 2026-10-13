"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useChip } from "@/components/session/use-chip";
import { EMOJI_DOMAIN } from "@/lib/const";
import { startSignIn } from "@/lib/sign-in";

const LOOK = "font-light";

/** The landing's call to action, from the display cookie: sign in with GitHub,
 *  or the page the visitor already has. Empty until the page is the browser's,
 *  holding its height. */
export function MakeYours() {
  const chip = useChip();
  if (chip === undefined) return <div className="h-10" aria-hidden />;
  if (chip === null)
    return (
      <Button variant="outline" className={LOOK} onClick={() => startSignIn()}>
        make yours with github
      </Button>
    );
  if (!chip.u)
    return (
      <Button variant="outline" className={LOOK} render={<Link href="/null" />}>
        pick your username
      </Button>
    );
  return (
    <Button
      variant="outline"
      className={LOOK}
      render={<Link href={`/${chip.u}`} />}
    >
      go to {EMOJI_DOMAIN}/{chip.u}
    </Button>
  );
}

/** Under every profile, for a visitor who has none: where to get one. */
export function MakeYourOwn() {
  const chip = useChip();
  if (chip !== null) return null;
  return (
    <p className="prose prose-zinc dark:prose-invert text-center text-sm font-light">
      <Link href="/">make your own {EMOJI_DOMAIN} page</Link>
    </p>
  );
}
