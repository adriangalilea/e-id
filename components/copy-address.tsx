"use client";

import { Check, CircleAlert, Clipboard } from "lucide-react";
import { EmojiDomain } from "@/components/brand";
import { ON_CARD } from "@/components/card-shape";
import { useCopy } from "@/components/ui/copy";
import { EMOJI_DOMAIN } from "@/lib/const";
import { cn } from "@/lib/utils";

/** A card's address IS its copy: the line of text is the button, and the copy
 *  glyph shows only while a hand is on it, focus is on it, or it has just copied.
 *  A button floating beside the address, always on, read as the card's one loose
 *  part. The state is spoken in the accessible name (`useCopy`, @ag/copy). Sized
 *  in cqw, as everything on the card is. */
export function CopyAddress({ username }: { username: string }) {
  const { copied, copy, error } = useCopy(
    `https://${EMOJI_DOMAIN}/${username}`,
  );
  const glyph = error ? <CircleAlert /> : copied ? <Check /> : <Clipboard />;
  return (
    <button
      type="button"
      data-slot="copy-address"
      data-copied={copied ? "" : undefined}
      onClick={() => void copy()}
      aria-label={
        error
          ? "Copy failed. Try again"
          : copied
            ? "Copied"
            : `Copy ${EMOJI_DOMAIN}/${username}`
      }
      className={cn(
        ON_CARD,
        // Dimmed as one shape (`opacity` over an opaque ink), so the copy
        // glyph's crossing strokes never paint twice.
        "group/copy -mx-[1.2cqw] flex min-w-0 cursor-pointer items-center gap-[1.2cqw] self-start px-[1.2cqw] py-[0.6cqw] font-mono text-(length:--card-head) text-foreground opacity-50 transition-[opacity,background-color] hover:bg-white/[0.06] hover:opacity-85 data-copied:opacity-85",
      )}
    >
      <EmojiDomain path={`/${username}`} className="truncate" />
      <span
        aria-hidden
        className="opacity-0 transition-opacity group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100 group-data-copied/copy:opacity-100 [&_svg]:size-[2.8cqw] [&_svg]:stroke-[1.75]"
      >
        {glyph}
      </span>
    </button>
  );
}
