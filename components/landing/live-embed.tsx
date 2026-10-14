"use client";

import { useEffect } from "react";
import { EMOJI_DOMAIN } from "@/lib/const";

/** The embed working, as it does on someone's own page: the real script
 *  (app/embed.js), loaded once, and the real element, its link shown until the
 *  card arrives. */
export function LiveEmbed({
  handle,
  width = "26rem",
}: {
  handle: string;
  /** The card's width (the element's `--e-id-card-width`), any CSS length. */
  width?: string;
}) {
  useEffect(() => {
    if (customElements.get("e-id-card")) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/embed.js";
    document.head.append(script);
  }, []);
  return (
    <e-id-card
      handle={handle}
      style={{ "--e-id-card-width": width } as React.CSSProperties}
    >
      <a href={`/${handle}`} className="font-mono text-sm text-foreground/60">
        {EMOJI_DOMAIN}/{handle}
      </a>
    </e-id-card>
  );
}
