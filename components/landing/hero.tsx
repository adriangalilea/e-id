import { NavActions } from "@/components/footer/footer";
import { GUTTER } from "@/components/frame";
import { IdCard, type Holder } from "@/components/id-card";
import { HeroShown } from "@/components/presence";
import { Glass } from "@/components/ui/material-glass";
import { getShowcase } from "@/lib/data";
import { HOLO_PRINTS } from "@/lib/holo";
import { cn } from "@/lib/utils";
import { FillCard, RealAddress } from "./fill-card";
import { MakeYours } from "./make-yours";
import { HoloLean, HoloLight } from "@/components/ui/holo";
import { HeroShimmer, SubjectLight } from "@/components/light";

/** Where the cards behind the front one lie: turned out from under it, smaller
 *  and dimmer with depth, so the stack reads as real cards dealt on the page. With
 *  a hand on the stack they spread a little further, as cards do when touched.
 *  Dimmed by brightness, never opacity, and solid: a see-through card showed the
 *  hero's shimmer through it, as if lying on it. */
const BEHIND = [
  "-rotate-[8deg] -translate-x-[9%] translate-y-[7%] scale-[0.93] brightness-[0.6] [--id-card-thickness:1] group-data-hover/holo:-rotate-[9.5deg] group-data-hover/holo:-translate-x-[11.5%] group-data-hover/holo:translate-y-[8%]",
  "rotate-[7deg] translate-x-[10%] -translate-y-[8%] scale-[0.88] brightness-[0.35] [--id-card-thickness:1] group-data-hover/holo:rotate-[8.5deg] group-data-hover/holo:translate-x-[12.5%] group-data-hover/holo:-translate-y-[9.5%]",
];

/** The visitor's blank card on real ones: in front, under the light, turned
 *  toward the reader and following the hand, theirs to fill in (`FillCard`);
 *  dealt out behind it, the maker's and the newest whole ones (a photo, a name, a
 *  country), what a filled one looks like. */
function Stack({ people }: { people: Holder[] }) {
  const behind = people.slice(0, BEHIND.length);
  return (
    // The page's centre of attention: as wide as its side of the split allows, less
    // the room the cards behind take when they spread (15% either way).
    <HoloLight className="relative mx-auto w-full max-w-[34rem]">
      <SubjectLight />
      {behind.map((holder, i) => (
        <IdCard
          key={holder.username}
          holder={holder}
          heading="p"
          holo="laminate"
          className={cn(
            "absolute inset-0 transition-[rotate,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            BEHIND[i],
          )}
        />
      ))}
      {/* Lying on the others, it hides them as a real card would: its body
          solid (a backdrop's blur does not reach through the card's 3D turn, so
          only opacity hides what is under it), its rim and light still glass's. */}
      {/* Turned toward the reader beside the words, leaning to the hand; on one
          column, where it stands alone, straight. */}
      <HoloLean pose="turned" className="relative max-lg:[transform:none]">
        <FillCard />
      </HoloLean>
    </HoloLight>
  );
}

/** The landing's first screen: what an e-id is, in one address and one line, the
 *  way in, and real cards beside them. On a phone it is the page's head, closed by
 *  a hairline the sign-ups start from. On a wide screen it IS the site's bar: fixed
 *  at the top, it closes into the glass pill as the page scrolls, "👤.to/you"
 *  travelling into the bar's wordmark (globals.css, `hero`); `hero-space` holds
 *  its place in the page meanwhile. The glass and the bar's right end are only
 *  drawn there. */
export async function Hero() {
  const people = (await getShowcase()).map(
    (p): Holder => ({
      name: p.name,
      username: p.username,
      image: p.image,
      country: p.country_code,
      bio: p.bio,
      places: p.places,
    }),
  );
  return (
    <>
      <HeroShown />
      <div data-slot="hero-space" aria-hidden className="hidden" />
      <section
        data-slot="hero"
        className="relative isolate border-b border-white/10"
      >
        <Glass
          data-slot="hero-glass"
          aria-hidden
          shape="surface"
          className="pointer-events-none absolute! inset-0 -z-10 hidden [--glass-radius:calc(var(--bar-h)/2)]"
        />
        <HeroShimmer />
        <div
          data-slot="hero-grid"
          className={cn(
            "mx-auto grid w-full max-w-6xl items-center gap-16 pt-16 pb-20 sm:pt-24 lg:grid-cols-[minmax(0,38.2fr)_minmax(0,61.8fr)] lg:gap-20 lg:py-24",
            GUTTER,
          )}
        >
          <div data-slot="hero-words" className="flex flex-col gap-4">
            {/* The address IS the way in: one pill (make-yours). It carries the
                card's prints, and the hand's place over it lights them
                (globals.css, `data-cta`). */}
            <h1
              data-slot="hero-title"
              // Space Grotesk at 300: the address large and light (Adrian's
              // pick); the bar's wordmark, which it becomes, is the same.
              className="text-(length:--hero-title) leading-none font-light tracking-[-0.045em] whitespace-nowrap"
              style={HOLO_PRINTS as React.CSSProperties}
            >
              {/* Exactly the pill's size: the hand is measured across it. */}
              <HoloLight className="inline-flex">
                <MakeYours />
              </HoloLight>
            </h1>
            {/* The one line under the address, its caption: that it is a real
                one, quiet, starting under the words (past the pill's inset,
                disc and gap: 0.2em + 1.2cap + 0.1em of the title, a cap 0.7 of
                Space Grotesk's em). No wider than the pill (`contain`: its own
                width counts for nothing, the words' column is the pill's). The
                card says the rest by being filled. */}
            <div
              data-slot="hero-lead"
              className="pl-[calc(var(--hero-title)*1.14)] [contain:inline-size]"
            >
              <RealAddress />
            </div>
          </div>
          <div data-slot="hero-card">
            <Stack people={people} />
          </div>
        </div>
        <div data-slot="hero-actions" className="hidden">
          <NavActions />
        </div>
      </section>
    </>
  );
}
