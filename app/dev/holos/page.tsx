// DEVELOPMENT PAGE, never in production: the hologram's prints side by side, to
// judge them by eye. Each print gets a live card to turn by hand, then a sweep of
// the same card with ONE thing varied, where the light rests across it, lit at
// the strength the hand brings it to; each follows the hand while one is on it.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wide } from "@/components/frame";
import { IdCard, type Holder, type HoloPrint } from "@/components/id-card";
import { HoloLight } from "@/components/ui/holo";
import { getProfile, getPublicSocials, placeOf } from "@/lib/data";

export const metadata: Metadata = { title: "holos", robots: "noindex" };

const PRINTS: { print: HoloPrint; note: string }[] = [
  {
    print: "laminate",
    note: "guilloché bands and the mark repeated, as an ID's security laminate",
  },
  { print: "web", note: "people linked across the card, hubs drawn as the mark" },
];

/** Where the light falls across the card, left to right, in the sweep. */
const LIGHT = [0.1, 0.3, 0.5, 0.7, 0.9];

/** The card judged: the maker's, as on the home. */
const WHO = "adriangalilea";

export default async function Holos() {
  if (process.env.NODE_ENV === "production") notFound();
  const profile = await getProfile(WHO);
  if (!profile) throw new Error(`holos: no profile @${WHO} in this database`);
  const holder: Holder = {
    name: profile.name,
    username: profile.username,
    image: profile.image,
    country: profile.country_code,
    bio: profile.bio,
    places: (await getPublicSocials(profile.id)).map(placeOf),
  };
  return (
    <Wide className="gap-16">
      <p className="font-mono text-xs text-foreground/50">
        dev: the hologram&apos;s prints. turn the live card by hand; the sweep
        holds the light at five places across the card.
      </p>
      {PRINTS.map(({ print, note }) => (
        <section
          key={print}
          className="flex flex-col gap-8 border-t border-white/10 pt-8"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-mono text-sm">{print}</h2>
            <p className="text-sm text-foreground/55">{note}</p>
          </div>
          <HoloLight className="w-full max-w-md">
            <IdCard holder={holder} heading="p" holo={print} />
          </HoloLight>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {LIGHT.map((x) => (
              <figure key={x} className="flex flex-col gap-2">
                {/* Lit at the strength a hand brings it to, its light resting at x,
                    and following the hand while one is on it. */}
                <HoloLight rest={{ x, y: 0.4 }} lit>
                  <IdCard holder={holder} heading="p" holo={print} />
                </HoloLight>
                <figcaption className="font-mono text-[11px] text-foreground/45">
                  light at {Math.round(x * 100)}%
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </Wide>
  );
}
