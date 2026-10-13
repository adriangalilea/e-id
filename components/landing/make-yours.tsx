"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { useChip } from "@/components/session/use-chip";
import { EMOJI_DOMAIN } from "@/lib/const";
import { isWritten, useDraft, writeDraft } from "@/lib/draft";
import { startSignIn } from "@/lib/sign-in";

/** THE WAY IN IS THE ADDRESS: "👤.to/you" at the headline's size inside one round
 *  pill, the thing a visitor presses to make theirs. Concentric by construction,
 *  every length in em of the headline:
 *  - the logo's disc is 1.2 cap (`BrandLogo`); the pill is that plus INSET all
 *    round, so the disc is a circle inside the pill's round left end;
 *  - the words are trimmed to their capitals (`text-box`), so caps and disc share
 *    one centre line, which a line box's ascent and descent never give;
 *  - the words end where the right end's curve begins (the padding is the pill's
 *    radius), the mirror of the disc filling the left one.
 *  The foil (`data-cta`, globals.css) is a faint ring at rest, brighter and with
 *  the card's guilloché inside where the hand is; the HoloLight round it gives it the
 *  hand. No arrow and no provider's mark: the pill is plainly pressable, and how
 *  one signs in is the sign-in's business. */
const INSET = "0.2em";
const DISC = "1.2cap";
const GAP = "0.1em";

/** The insets are measured from the pill's outer edge, so its 1px border is taken
 *  out of the padding: the disc then stands as far from the left end as from the
 *  top and the foot. */
const PILL =
  "group inline-flex h-[calc(var(--disc)+2*var(--inset))] items-center rounded-full pl-[calc(var(--inset)-1px)] pr-[calc(var(--disc)/2+var(--inset)-1px)]";

const GEOMETRY = {
  "--inset": INSET,
  "--disc": DISC,
  "--gap": GAP,
} as React.CSSProperties;

const [EMOJI, ...REST] = Array.from(EMOJI_DOMAIN);
const TLD = REST.join("");

/** The logo in the pill's left end: the brand's disc (`BrandLogo`), frosted. A
 *  backdrop blur cannot see through the pill's own (a blur nested in a blur sees
 *  nothing behind it), so the disc holds a blurred copy of the pill's print
 *  (`disc-print`, globals.css) under its mark. */
function Logo() {
  return (
    <BrandLogo className="grid size-(--disc)">
      <span aria-hidden data-slot="disc-print">
        <span />
      </span>
    </BrandLogo>
  );
}

/** The address, its parts as the pill's flex items: the logo (the emoji under it,
 *  transparent, so copying gives 👤.to), the words. */
function Words({ path }: { path: string }) {
  return (
    <>
      <span className="relative flex shrink-0">
        <Logo />
        <span className="pointer-events-none absolute inset-0 overflow-hidden leading-none text-transparent">
          {EMOJI}
        </span>
      </span>
      {/* ".to" stays (it is the bar's wordmark once the hero closes into it);
          only the path is the part that goes (`hero-you`). */}
      <span className="ml-(--gap) inline-flex items-center whitespace-nowrap [text-box:trim-both_cap_alphabetic]">
        {TLD}
        <span data-slot="hero-you" className="inline-block">
          {path}
        </span>
      </span>
    </>
  );
}

/** The address the visitor is making, and where it goes, from the display
 *  cookie: signed out, their page-to-be ("/you"), which signs in; signed in,
 *  their own address, which opens it; with no name yet, where to pick one. */
export function MakeYours() {
  const chip = useChip();
  const draft = useDraft();
  const pill = {
    "data-cta": "",
    // The card's guilloché lights inside it under the hand (globals.css).
    "data-print": "",
    className: PILL,
    style: GEOMETRY,
  };
  if (chip?.u)
    return (
      <Link
        href={`/${chip.u}`}
        {...pill}
        aria-label={`go to your page, ${EMOJI_DOMAIN}/${chip.u}`}
      >
        <Words path={`/${chip.u}`} />
      </Link>
    );
  if (chip)
    return (
      <Link href="/null" {...pill} aria-label="pick your username">
        <Words path="/you" />
      </Link>
    );
  // Signing in from here makes the card filled on the home theirs (lib/draft).
  return (
    <button
      type="button"
      {...pill}
      onClick={() => {
        if (isWritten(draft)) writeDraft({ claiming: true });
        startSignIn();
      }}
      aria-label={`make yours: ${EMOJI_DOMAIN}/you`}
    >
      <Words path="/you" />
    </button>
  );
}
