import { EMOJI_DOMAIN } from "@/lib/const";
import { cn } from "@/lib/utils";

const [EMOJI, ...REST] = Array.from(EMOJI_DOMAIN);
const TLD = REST.join("");

/** The mark's drawing on a 24 grid: a solid square, the ID card's photo slot, with
 *  a person cut out of it, a square head over chamfered shoulders. The same path is
 *  the favicon (app/icon.svg). */
export const MARK_PATH =
  "M0 0h24v24H0z M9 4.5h6v6.5H9z M4.5 24v-4.5l3.5-3.5h8l3.5 3.5V24z";

/** The mark, in the text's colour, one em square. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-[1em] fill-current", className)}
    >
      <path fillRule="evenodd" d={MARK_PATH} />
    </svg>
  );
}

/** 👤.to as e-id writes it: the mark where the emoji stands, the emoji still in the
 *  text under it, so selecting and copying the address gives 👤.to and a screen
 *  reader reads it. The mark is set at the capitals' height on the baseline, a
 *  letter of the address rather than a picture beside it. */
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
      <span className="mr-[0.06em] inline-grid place-items-end align-baseline *:col-start-1 *:row-start-1">
        <span className="opacity-0">{EMOJI}</span>
        <BrandMark className="mb-[0.02em] size-[0.72em]" />
      </span>
      {TLD}
      {path}
    </span>
  );
}
