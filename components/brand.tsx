import { EMOJI_DOMAIN } from "@/lib/const";
import { cn } from "@/lib/utils";

const [EMOJI, ...REST] = Array.from(EMOJI_DOMAIN);
const TLD = REST.join("");

/** The mark's drawing on a 24 grid: 👤 as Apple draws it, flat, a round head over
 *  one wide dome of shoulders (the top half of an ellipse, cut flat at the foot).
 *  The same path is the favicon's, white on its glass tile (app/icon.svg). */
export const MARK_PATH =
  "M7.5 7.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 1 1 -9 0z M3 22A9 8.5 0 0 1 21 22z";

/** The mark's own bounds on that grid, head to foot and shoulder to shoulder: the
 *  box it is drawn in wherever it stands as a letter, so its height is the glyph's
 *  and not the grid's padding. */
const MARK_BOX = { x: 3, y: 3, w: 18, h: 19 };

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

/** 👤.to as e-id writes it: the mark where the emoji stands, the emoji still in the
 *  text under it, so selecting and copying the address gives 👤.to and a screen
 *  reader reads it. The mark is an inline SVG, so its foot is the text's baseline, and
 *  one `cap` tall, the font's own capital height, a letter of the address rather than
 *  a picture beside it. The emoji's own box is never the reference: its font's
 *  ascent and descent are not the text's. */
export function EmojiDomain({
  path,
  className,
}: {
  /** What follows the domain, "/you" or "/adriangalilea". */
  path?: string;
  className?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span className="relative mr-[0.08em]">
        <BrandMark className="inline h-[1cap] align-baseline" />
        <span className="absolute inset-0 overflow-hidden leading-none text-transparent">
          {EMOJI}
        </span>
      </span>
      {TLD}
      {path}
    </span>
  );
}
