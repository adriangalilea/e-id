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

/** THE LOGO: the mark on a disc, the seal's own shape, as the favicon draws it
 *  (app/icon.svg). The disc is a step of light, not glass: it stands on glass (the
 *  bar, the hero's pill), where glass on glass shows nothing, so it is drawn, lit
 *  at its top, a highlight on its upper rim and a hairline round it. A little
 *  taller than the capitals beside it (1.2 cap) and centred on them by whoever
 *  sets it (`EmojiDomain`, the pill). What it holds under the mark (the pill's
 *  print) is its children's. */
export function BrandLogo({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-slot="brand-logo"
      className={cn(
        // Its size `--logo-size` where its holder sets one (the bar's wordmark),
        // else 1.2 cap.
        "relative isolate inline-grid size-[var(--logo-size,1.2cap)] place-items-center overflow-hidden rounded-full text-foreground/90",
        "bg-[linear-gradient(to_bottom,rgb(255_255_255/0.13),rgb(255_255_255/0.06))] shadow-[inset_0_1px_0_rgb(255_255_255/0.16),inset_0_0_0_1px_rgb(255_255_255/0.05)]",
        className,
      )}
    >
      {children}
      <svg viewBox="0 0 24 24" className="relative size-[62%] fill-current">
        <path d={MARK_PATH} />
      </svg>
    </span>
  );
}

/** 👤.to as e-id writes it: the mark where the emoji stands, the emoji still in the
 *  text under it, so selecting and copying the address gives 👤.to and a screen
 *  reader reads it. In running text (an address, a line of copy) the mark is a
 *  letter: an inline SVG, its foot on the baseline, one `cap` tall. Where the brand
 *  itself is the subject (the bar's wordmark) it is the logo,
 *  the mark on its disc (`logo`). The emoji's own box is never the reference:
 *  its font's ascent and descent are not the text's. */
export function EmojiDomain({
  path,
  logo,
  className,
}: {
  /** What follows the domain, "/you" or "/adriangalilea". */
  path?: string;
  /** The logo where the mark stands: for the brand as the subject, not in text. */
  logo?: boolean;
  className?: string;
}) {
  // In the text for copying and reading, never in the hand's way: the pointer
  // reaches the mark or the logo under it. Unseen by opacity, not a transparent
  // colour: a colour emoji paints in its own colours whatever the text's, and
  // a text shadow round it (the card's knockout) drew it over the mark.
  const emoji = (
    <span className="pointer-events-none absolute inset-0 overflow-hidden leading-none opacity-0">
      {EMOJI}
    </span>
  );
  // The logo is centred on the words' capitals: the words
  // trimmed to them (`text-box`), so the disc and the caps share one centre line
  // and the whole stands centred in whatever centres it (the bar), which a line
  // box's uneven ascent and descent never allow.
  if (logo)
    return (
      <span
        className={cn(
          "inline-flex items-center gap-[0.1em] whitespace-nowrap",
          className,
        )}
      >
        <span className="relative flex shrink-0">
          <BrandLogo />
          {emoji}
        </span>
        <span className="[text-box:trim-both_cap_alphabetic]">
          {TLD}
          {path}
        </span>
      </span>
    );
  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span className="relative mr-[0.08em]">
        <BrandMark className="inline h-[1cap] align-baseline" />
        {emoji}
      </span>
      {TLD}
      {path}
    </span>
  );
}
