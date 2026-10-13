import { FoilEdge } from "@/components/foil-edge";
import { Tilt } from "@/components/landing/tilt";
import { Glass } from "@/components/ui/material-glass";
import { HOLO_PRINTS } from "@/lib/holo";
import { EMOJI_DOMAIN } from "@/lib/const";
import { MARK_BOX, MARK_PATH } from "@/lib/mark";
import { cn } from "@/lib/utils";

const [EMOJI, ...REST] = Array.from(EMOJI_DOMAIN);
const TLD = REST.join("");

/** The mark, in the text's colour. Its box is the glyph's bounds, so a height set
 *  on it is the silhouette's height; its width follows (`w-auto` keeps the ratio). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}`}
      aria-hidden
      className={cn("h-[1em] w-auto fill-current", className)}
    >
      <path d={MARK_PATH} />
    </svg>
  );
}

/** THE LOGO: the mark white on a disc of glass, the seal's own shape, as the
 *  favicon draws it (app/icon.svg). Set in a line it is a little
 *  taller than the capitals (1.2 cap), its foot on the baseline (an inline box that
 *  clips is aligned by its bottom edge), so it stands as the line's first letter. */
export function BrandLogo({
  holo,
  className,
}: {
  /** The card's craft on the logo where it is the brand at its largest (the
   *  hero): the seal printed faintly in foil behind the mark, a foil edge, both
   *  lit where the hand is (`logo-holo`, `foil-edge` in globals.css). */
  holo?: boolean;
  className?: string;
}) {
  const tile = (
    <Glass
      as="span"
      shape="surface"
      aria-hidden
      className={cn(
        "inline-grid size-[1.2cap] place-items-center overflow-hidden align-baseline [--glass-radius:calc(1.2cap/2)]",
        className,
      )}
      style={holo ? (HOLO_PRINTS as React.CSSProperties) : undefined}
    >
      {holo && <span data-slot="logo-holo" />}
      <svg viewBox="0 0 24 24" className="relative size-[62%] fill-white">
        <path d={MARK_PATH} />
      </svg>
      {holo && <FoilEdge />}
    </Glass>
  );
  if (!holo) return tile;
  return (
    <Tilt as="span" className="inline-block align-baseline">
      {tile}
    </Tilt>
  );
}

/** 👤.to as e-id writes it: the mark where the emoji stands, the emoji still in the
 *  text under it, so selecting and copying the address gives 👤.to and a screen
 *  reader reads it. In running text (an address, a line of copy) the mark is a
 *  letter: an inline SVG, its foot on the baseline, one `cap` tall. Where the brand
 *  itself is the subject (the hero's address, the bar's wordmark) it is the logo,
 *  the mark on its glass tile (`logo`). The emoji's own box is never the reference:
 *  its font's ascent and descent are not the text's. */
export function EmojiDomain({
  path,
  logo,
  className,
}: {
  /** What follows the domain, "/you" or "/adriangalilea". */
  path?: string;
  /** The logo where the mark stands: for the brand as the subject, not in text;
   *  `holo` for the brand at its largest, carrying the card's craft. */
  logo?: boolean | "holo";
  className?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span className={cn("relative", logo ? "mr-[0.1em]" : "mr-[0.08em]")}>
        {logo ? (
          <BrandLogo holo={logo === "holo"} />
        ) : (
          <BrandMark className="inline h-[1cap] align-baseline" />
        )}
        {/* In the text for copying and reading, never in the hand's way: the
            pointer reaches the mark or the logo under it. */}
        <span className="pointer-events-none absolute inset-0 overflow-hidden leading-none text-transparent">
          {EMOJI}
        </span>
      </span>
      {TLD}
      {path}
    </span>
  );
}
