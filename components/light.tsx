import { AmbientLight } from "@/components/ui/ambient-light";
import { Grain } from "@/components/ui/grain";

/** THE PAGE'S GROUND: never flat black, a composed dark gradient of a few broad,
 *  very soft pools of light, all neutral (no hue, Adrian's rule: colour reads as a
 *  gaming rig's), so what lies on the page keeps its own colour: one off the top
 *  left, one to the right, one low at the foot. Computed per pixel and dithered
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
            strength: 0.55,
          },
          {
            color: "oklch(0.26 0 0)",
            x: 0.92,
            y: 0.38,
            rx: 0.6,
            ry: 0.75,
            strength: 0.4,
          },
          {
            color: "oklch(0.24 0 0)",
            x: 0.45,
            y: 1.08,
            rx: 0.85,
            ry: 0.55,
            strength: 0.45,
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
        glows={[
          // A broad wash round the subject, and a closer, brighter halo a little
          // above its middle, where a light overhead would fall on it.
          { color: "#fff", x: 0.5, y: 0.5, rx: 0.5, ry: 0.5, strength: 0.07 },
          { color: "#fff", x: 0.5, y: 0.45, rx: 0.28, ry: 0.26, strength: 0.06 },
        ]}
      />
    </div>
  );
}

/** THE HERO'S SHIMMER (@ag/grain): a surface of facets that flash at rest and
 *  gather under the hand, faint, for visual interest under the address. It
 *  decays outward (a soft radial mask, centred on the words' side), so it has no
 *  edge and fades out before the cards: through their glass it read as lying on
 *  them. */
export function HeroShimmer() {
  return (
    <div
      data-slot="hero-shimmer"
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_55%_75%_at_28%_42%,black_15%,transparent_100%)]"
    >
      <Grain look="shimmer" strength={0.55} density={0.35} frost={0.01} />
    </div>
  );
}
