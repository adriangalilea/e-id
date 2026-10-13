import { GUTTER } from "@/components/frame";
import type { Holder } from "@/components/id-card";
import { HeroShimmer, SubjectLight } from "@/components/light";
import { getShowcase } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Stage, YourCard } from "./hero-cards";

/** The landing's first screen, and nothing on it but cards: in the middle the
 *  visitor's own, blank until they write on it, which is how a profile is made
 *  here (`YourCard`); round it, in depth, other people's, real and filled, which
 *  is how one looks (`Stage`). The visitor's card is the subject: it stands in
 *  the light, the shimmer behind everything. */
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
    // No line under it: the shimmer and the light fade out into the page's ground,
    // so the hero ends the way a light does (components/light). On a wide screen
    // it reaches up under the bar (the room the layout keeps for it, 5rem, taken
    // back and given as its own padding): the bar's glass frosts the shimmer,
    // never a band of bare ground above it.
    <section data-slot="hero" className="relative isolate md:-mt-20 md:pt-20">
      <h1 className="sr-only">your page at 👤.to</h1>
      <HeroShimmer />
      <div
        className={cn(
          "mx-auto w-full max-w-6xl py-16 sm:py-20 lg:py-8",
          GUTTER,
        )}
      >
        <Stage people={people}>
          <SubjectLight />
          <YourCard />
        </Stage>
      </div>
    </section>
  );
}
