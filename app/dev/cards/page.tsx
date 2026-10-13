// DEVELOPMENT PAGE, never in production: the card's layouts side by side, to pick
// by eye. One thing varies, the layout; the person, the print and the size are the
// same. Each is a live card, turning to the hand. The pick becomes the card's only
// layout and the others go.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wide } from "@/components/frame";
import { IdCard, type CardLayout, type Holder } from "@/components/id-card";
import { Tilt } from "@/components/landing/tilt";
import { getProfile, getPublicSocials, placeOf } from "@/lib/data";

export const metadata: Metadata = { title: "cards", robots: "noindex" };

const LAYOUTS: { layout: CardLayout; note: string }[] = [
  { layout: "now", note: "for reference: the card as it is" },
  { layout: "tall", note: "the photo 3:4, rising into the empty band" },
  { layout: "bigger", note: "the photo and the name larger, the body filling the card" },
  {
    layout: "centred",
    note: "the same sizes, the body centred between the head and the foot",
  },
];

/** The card judged, and one with a short name, so a layout is seen with both. */
const WHO = ["adriangalilea", "lulzx"];

async function holderOf(username: string): Promise<Holder> {
  const profile = await getProfile(username);
  if (!profile) throw new Error(`cards: no profile @${username} in this database`);
  return {
    name: profile.name,
    username: profile.username,
    image: profile.image,
    country: profile.country_code,
    bio: profile.bio,
    places: (await getPublicSocials(profile.id)).map(placeOf),
  };
}

export default async function Cards() {
  if (process.env.NODE_ENV === "production") notFound();
  const holders = await Promise.all(WHO.map(holderOf));
  return (
    <Wide className="gap-14">
      <p className="font-mono text-xs text-foreground/50">
        dev: the card&apos;s layouts, one person long-named and one short, each
        a live card to turn.
      </p>
      {LAYOUTS.map(({ layout, note }) => (
        <section
          key={layout}
          className="flex flex-col gap-6 border-t border-white/10 pt-8"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-mono text-sm">{layout}</h2>
            <p className="text-sm text-foreground/55">{note}</p>
          </div>
          <div className="grid gap-10 lg:grid-cols-2">
            {holders.map((holder) => (
              <Tilt
                key={holder.username}
                pose="flat"
                className="lg:[perspective:2000px]"
              >
                <div data-slot="tilt-front">
                  <IdCard
                    holder={holder}
                    heading="p"
                    holo="laminate"
                    layout={layout}
                    className="[--id-card-thickness:1]"
                  />
                </div>
              </Tilt>
            ))}
          </div>
        </section>
      ))}
    </Wide>
  );
}
