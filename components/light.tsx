import { AmbientLight } from "@/components/ui/ambient-light";
import { PartedGrain } from "@/components/landing/shimmer-part";

/** THE PAGE'S GROUND: never flat black, a composed dark gradient of a few broad,
 *  very soft pools of light, all neutral (no hue, Adrian's rule: colour reads as a
 *  gaming rig's), so what lies on the page keeps its own colour: one off the top
 *  left, one to the right, one low at the foot. Dim: the glass surfaces on it are
 *  a step lighter than the ground, and a ground lifted near their tone took the
 *  layering away. Computed per pixel and dithered
 *  (@ag/ambient-light), so the falls have no rings; fixed, so the page scrolls
 *  over a ground that holds still. */
export function PageLight() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20">
      <AmbientLight
        glows={[
          {
            color: "oklch(0.3 0 0)",
            x: 0.12,
            y: -0.05,
            rx: 0.75,
            ry: 0.85,
            strength: 0.3,
          },
          {
            color: "oklch(0.26 0 0)",
            x: 0.92,
            y: 0.38,
            rx: 0.6,
            ry: 0.75,
            strength: 0.22,
          },
          {
            color: "oklch(0.24 0 0)",
            x: 0.45,
            y: 1.08,
            rx: 0.85,
            ry: 0.55,
            strength: 0.25,
          },
        ]}
      />
    </div>
  );
}

/** THE LIGHT IS THE SUBJECT'S: the one thing a page is about (a person's card,
 *  the home's cards) stands in a soft white light of its own, coming from where
 *  the eye should go. Placed inside the subject's box (positioned), behind it, it
 *  spreads well past it, centred on it, and moves with it. The light alone, no
 *  ground (`ground="none"`), so it covers nothing round the subject; dithered, so
 *  it falls without rings. White, so what it lights keeps its own colour. */
export function SubjectLight() {
  return (
    <div
      aria-hidden
      // Twice the subject's height: wider and it reached past the home's hero,
      // whose foot cut it in a line.
      className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[200%] w-[180%] -translate-x-1/2 -translate-y-1/2"
    >
      <AmbientLight
        ground="none"
        over="var(--background)"
        glows={[
          // A broad wash round the subject, and a closer, brighter halo a little
          // above its middle, where a light overhead would fall on it.
          // Barely there: a spot of light any stronger read as a spotlight.
          { color: "#fff", x: 0.5, y: 0.5, rx: 0.5, ry: 0.5, strength: 0.03 },
          { color: "#fff", x: 0.5, y: 0.45, rx: 0.3, ry: 0.28, strength: 0.02 },
        ]}
      />
    </div>
  );
}

/** THE HERO'S SHIMMER (@ag/grain): a surface of facets that flash at rest and
 *  gather under the hand, faint, for visual interest in the hero. It decays
 *  outward, so it has no edge: a soft ellipse, cut with a fall to nothing well
 *  before the hero's foot, where the page goes on with no line between them. At
 *  its top it runs on under the bar (hero.tsx). It lies between the real cards
 *  round the visitor's and the visitor's own (`z-[5]`: the cards round it sit
 *  at 0, theirs and the profile it becomes at 10, hero-cards): part of what sets
 *  the others back, sparkling over them. A card come forward under the hand
 *  parts it (landing/shimmer-part): its glitter pushed out to the card's edge
 *  and crowded round it, flowing back as the card settles. It takes no
 *  pointer, so the hand reaches them. */
export function HeroShimmer() {
  return (
    <div
      data-slot="hero-shimmer"
      aria-hidden
      // Nearer than the cards it lies over and further than the visitor's: a
      // little out of focus (the cards behind it are by 2.6px and more), so it
      // is of that depth, soft.
      // While the visitor writes on their card (hero-cards, `data-writing`) it
      // steps back with the pile: out of focus and fainter, eased as the cards
      // move.
      className="pointer-events-none absolute inset-0 z-[5] blur-[1px] transition-[filter,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] [mask-composite:intersect] [mask-image:radial-gradient(ellipse_70%_80%_at_45%_45%,black_30%,transparent_100%),linear-gradient(to_bottom,black_55%,transparent)] [[data-slot=hero]:has([data-writing])_&]:opacity-40 [[data-slot=hero]:has([data-writing])_&]:blur-[3px] motion-reduce:transition-none"
    >
      {/* Swaying as the cards it lies among float (hero-cards, `card-float`:
          ±0.4rem), so it moves as one of them. */}
      <PartedGrain
        look="shimmer"
        strength={0.55}
        density={0.35}
        frost={0.01}
        sway={6}
      />
    </div>
  );
}
