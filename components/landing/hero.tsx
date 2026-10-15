import { GUTTER } from "@/components/frame"
import { HeroShimmer } from "@/components/light"
import { getShowcase } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Preview, type Shown, Stage, YourCard } from "./hero-cards"

/** The landing's first screen, and nothing on it but cards: in the middle real
 *  ones, stacked, which is how one looks; by them the visitor's own, blank, to
 *  be taken up and written on, which is how a profile is made here (`Stage`,
 *  `YourCard`). The middle stands in the light, the shimmer behind everything. */
export async function Hero() {
  const people = (await getShowcase()).map(
    (p): Shown => ({
      holder: {
        name: p.name,
        username: p.username,
        image: p.image,
        country: p.country_code,
        bio: p.bio,
        links: p.links,
      },
      href: p.href,
    }),
  )
  return (
    // No line under it: the shimmer and the light fade out into the page's ground,
    // so the hero ends the way a light does (components/light). On a wide screen
    // it reaches up under the bar (the room the layout keeps for it, 5rem, taken
    // back and given as its own padding): the bar's glass frosts the shimmer,
    // never a band of bare ground above it.
    // A container: the stage reads its width (`cqw`) for how much room the window
    // leaves round it (hero-cards, `at`).
    <section
      data-slot="hero"
      className="@container relative isolate md:-mt-20 md:pt-20"
    >
      <HeroShimmer />
      <div
        className={cn(
          // Its padding is the stage's: a stage's, or a profile's once the card
          // becomes one (components/profile-layout).
          "mx-auto flex w-full max-w-6xl flex-col",
          GUTTER,
        )}
      >
        <Stage people={people} preview={<Preview />}>
          <YourCard />
        </Stage>
      </div>
    </section>
  )
}
