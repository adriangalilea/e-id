// DEVELOPMENT PAGE, never in production: the hero's address-as-button in its
// variants, at the hero's own size, each live (hover lights it, the hand moves
// its foil). Two things vary, one per row: what stands in the pill's left end,
// and whether the card's print lights inside it. The pick becomes PILL_LOOK.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wide } from "@/components/frame";
import {
  MakeYours,
  type PillLogo,
  type PillLook,
} from "@/components/landing/make-yours";
import { Tilt } from "@/components/landing/tilt";
import { HOLO_PRINTS } from "@/lib/holo";

export const metadata: Metadata = { title: "hero", robots: "noindex" };

const LOGOS: { logo: PillLogo; note: string }[] = [
  { logo: "holo", note: "now: the logo, a glass disc with the seal in foil and its own rim" },
  { logo: "disc", note: "a flat disc a step of light, no rim: the pill's edge is the only edge" },
  { logo: "solid", note: "a white disc, the mark cut in the dark: the logo as a stamp" },
  { logo: "mark", note: "the mark alone, a letter of the address" },
];

function Pill({ look }: { look: PillLook }) {
  return (
    <div
      className="text-(length:--hero-title) leading-none font-light tracking-[-0.045em] whitespace-nowrap"
      style={HOLO_PRINTS as React.CSSProperties}
    >
      <Tilt className="flex">
        <MakeYours look={look} />
      </Tilt>
    </div>
  );
}

export default function HeroVariants() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Wide className="gap-14">
      <p className="font-mono text-xs text-foreground/50">
        dev: the hero&apos;s address-as-button. down: what stands in its left
        end. across: the foil ring alone, or the ring and the card&apos;s print
        inside. hover each.
      </p>
      {LOGOS.map(({ logo, note }) => (
        <section
          key={logo}
          className="flex flex-col gap-6 border-t border-white/10 pt-8"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-mono text-sm">{logo}</h2>
            <p className="text-sm text-foreground/55">{note}</p>
          </div>
          <div className="grid gap-10 lg:grid-cols-2">
            {[false, true].map((print) => (
              <figure key={String(print)} className="flex flex-col gap-3">
                <figcaption className="font-mono text-[11px] text-foreground/45">
                  {print ? "ring and print" : "ring alone"}
                </figcaption>
                <Pill look={{ logo, print }} />
              </figure>
            ))}
          </div>
        </section>
      ))}
    </Wide>
  );
}
