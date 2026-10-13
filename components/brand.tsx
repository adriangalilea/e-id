import { EMOJI_DOMAIN } from "@/lib/const";
import { cn } from "@/lib/utils";

const [EMOJI, ...REST] = Array.from(EMOJI_DOMAIN);
const TLD = REST.join("");

/** The bust of 👤, drawn square: a block of a head over chamfered shoulders. In
 *  the text's colour, one em tall. */
export function Bust({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-[1em] fill-current", className)}
    >
      <rect x="8.5" y="2.5" width="7" height="8.5" />
      <path d="M3 22v-4.5l3.5-3.5h11l3.5 3.5v4.5z" />
    </svg>
  );
}

/** 👤.to as e-id writes it: the bust drawn, the emoji still in the text under it,
 *  so selecting and copying the address gives 👤.to and a screen reader reads it.
 *  Every system draws its own 👤 (or none); this one is the same everywhere. */
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
      <span className="inline-grid place-items-center align-[-0.08em] *:col-start-1 *:row-start-1">
        <span className="opacity-0">{EMOJI}</span>
        <Bust className="size-[0.92em]" />
      </span>
      {TLD}
      {path}
    </span>
  );
}
