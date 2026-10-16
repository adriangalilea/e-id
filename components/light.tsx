import { AmbientLight } from "@/components/ui/ambient-light"
import { Shimmer } from "@/components/ui/shimmer"

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
  )
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
  )
}

/** The site's shimmer, one surface wherever it lies: its facets a little sparse,
 *  barely frosted, each speck's edge softened (`soft`, half a pixel), and white
 *  with only a trace of a diamond's fire (`colour`). The surface itself never
 *  moves: no `sway`, which carried every speck at once and, at one canvas pixel
 *  to a CSS pixel, in visible steps of two screen pixels; the cards it once
 *  swayed with lie still. Drawn at one canvas pixel per CSS pixel
 *  (`resolution`): it lies over the whole hero, and the whole window behind a
 *  profile, and at a 2x screen's own it was four times the pixels every frame
 *  for a grain the eye reads the same (measured on a real device, 2026-10-16). */
const FACETS = {
  density: 0.45,
  frost: 0.01,
  soft: 0.5,
  colour: 0.1,
  resolution: 1,
} as const

/** How strong the hero's shimmer is: a texture under the cards, never their
 *  rival. At 1x a speck covers four of a 2x screen's pixels and reads brighter
 *  than the same strength did at 2x: half what it was there. */
const HERO_SHIMMER = 0.25

/** How strong a profile's shimmer is, three fifths of the hero's: the home's
 *  surface carried onto the profile, faint enough to stay behind the card. */
const PROFILE_SHIMMER = 0.15

/** THE PROFILE'S SHIMMER: the hero's surface of facets (@ag/shimmer) across the
 *  whole profile, its card and its links alike, so a profile stands in the same
 *  light as the home it came from; the glass of its panels carries it, blurred.
 *  Fixed to the window over the page's ground (`PageLight`, under it) and under
 *  everything on the page, so it is behind whatever is scrolled into view;
 *  fading out toward the window's edges, so it has none of its own. Fainter
 *  than the hero's (`strength`). It takes no pointer. */
export function ProfileShimmer() {
  // Its fade is the shader's own (@ag/shimmer `fade`): a mask or a filter on a
  // layer the size of the window was a pass over all of it every frame.
  return (
    <div
      data-slot="profile-shimmer"
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    >
      <Shimmer
        {...FACETS}
        strength={PROFILE_SHIMMER}
        fade={{ x: 0.5, y: 0.45, rx: 0.75, ry: 0.7, inner: 0.35 }}
      />
    </div>
  )
}

/** THE HERO'S SHIMMER (@ag/shimmer): a surface of facets that flash at rest and
 *  gather under the hand, faint, for visual interest in the hero. It decays
 *  outward, so it has no edge: a soft ellipse, cut with a fall to nothing well
 *  before the hero's foot, where the page goes on with no line between them. At
 *  its top it runs on under the bar (hero.tsx). It lies between the real cards
 *  round the visitor's and the visitor's own (`z-[5]`: the cards round it sit
 *  at 0, theirs and the profile it becomes at 10, hero-cards): part of what sets
 *  the others back, sparkling over them. A card come forward under the hand
 *  lies above it (@ag/shimmer's `ShimmerLift`, hero-cards): clear of it, its
 *  glitter pushed out to the card's edge, flowing back as the card settles. It
 *  takes no pointer, so the hand reaches them. */
export function HeroShimmer() {
  return (
    <div
      data-slot="hero-shimmer"
      aria-hidden
      // While the visitor writes on their card (hero-cards, `data-writing`) it
      // steps back with the pile: out of focus and fainter, eased as the cards
      // move. At rest no filter and no mask: its fade is the shader's own
      // (@ag/shimmer `fade`), not a pass over the layer every frame.
      className="pointer-events-none absolute inset-0 z-[5] transition-[filter,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none [[data-slot=hero]:has([data-writing])_&]:opacity-40 [[data-slot=hero]:has([data-writing])_&]:blur-[3px]"
    >
      <Shimmer
        {...FACETS}
        strength={HERO_SHIMMER}
        fade={{ x: 0.45, y: 0.45, rx: 0.7, ry: 0.8, inner: 0.3, foot: 0.55 }}
      />
    </div>
  )
}
