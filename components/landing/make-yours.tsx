"use client";

import Link from "next/link";
import { BrandLogo, BrandMark } from "@/components/brand";
import { MARK_PATH } from "@/lib/mark";
import { cn } from "@/lib/utils";
import { useChip } from "@/components/session/use-chip";
import { EMOJI_DOMAIN } from "@/lib/const";
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
 *  the card's guilloché inside where the hand is; the Tilt round it gives it the
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

/** What stands in the pill's left end (/dev/hero lays them side by side):
 *  `holo`: the logo, a disc of glass with the seal in foil (its own rim).
 *  `disc`: a flat disc a step of light off the pill, the mark on it, no rim of
 *  its own, so the pill's edge is the only edge.
 *  `solid`: a white disc, the mark cut in the pill's dark: the logo as a stamp.
 *  `mark`: the mark alone, a letter of the address, no disc. */
export type PillLogo = "holo" | "disc" | "solid" | "mark";

/** The pill's look: its left end, and whether the card's guilloché lights inside
 *  it under the hand (else the foil ring alone). */
export type PillLook = { logo: PillLogo; print: boolean };

/** Adrian's pick (/dev/hero): the flat disc, the ring and the print. */
export const PILL_LOOK: PillLook = { logo: "disc", print: true };

function Logo({ logo }: { logo: PillLogo }) {
  if (logo === "holo") return <BrandLogo holo />;
  if (logo === "mark")
    return (
      <span className="grid size-(--disc) place-items-center">
        <BrandMark className="h-[1cap] text-foreground" />
      </span>
    );
  return (
    <span
      className={cn(
        "grid size-(--disc) place-items-center rounded-full",
        // Opaque, a step of light off the pill: the print runs behind it,
        // never through the mark.
        logo === "solid"
          ? "bg-foreground text-background"
          : "bg-[oklch(0.27_0_0)] text-foreground/85 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]",
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-[62%] fill-current">
        <path d={MARK_PATH} />
      </svg>
    </span>
  );
}

/** The address, its parts as the pill's flex items: the logo (the emoji under it,
 *  transparent, so copying gives 👤.to), the words. */
function Words({ path, logo }: { path: string; logo: PillLogo }) {
  return (
    <>
      <span className="relative flex shrink-0">
        <Logo logo={logo} />
        <span className="pointer-events-none absolute inset-0 overflow-hidden leading-none text-transparent">
          {EMOJI}
        </span>
      </span>
      <span
        data-slot="hero-you"
        className="ml-(--gap) inline-flex items-center [text-box:trim-both_cap_alphabetic]"
      >
        <span className="whitespace-nowrap">
          {TLD}
          {path}
        </span>
      </span>
    </>
  );
}

/** The address the visitor is making, and where it goes, from the display
 *  cookie: signed out, their page-to-be ("/you"), which signs in; signed in,
 *  their own address, which opens it; with no name yet, where to pick one. */
export function MakeYours({ look = PILL_LOOK }: { look?: PillLook }) {
  const chip = useChip();
  const pill = {
    "data-cta": "",
    "data-print": look.print ? "" : undefined,
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
        <Words path={`/${chip.u}`} logo={look.logo} />
      </Link>
    );
  if (chip)
    return (
      <Link href="/null" {...pill} aria-label="pick your username">
        <Words path="/you" logo={look.logo} />
      </Link>
    );
  return (
    <button
      type="button"
      {...pill}
      onClick={() => startSignIn()}
      aria-label={`make yours: ${EMOJI_DOMAIN}/you`}
    >
      <Words path="/you" logo={look.logo} />
    </button>
  );
}
