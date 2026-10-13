import { AmbientLight } from "@/components/ui/ambient-light";
import { Grain } from "@/components/ui/grain";

/** THE PAGE'S LIGHT: one white beam from above the top of the screen, a narrow
 *  bright core in a wider, fainter cone, both falling to the dark ground before
 *  the middle. Colourless: white on black, so what it lights keeps its own colour.
 *  Computed per pixel and dithered (@ag/ambient-light), so it falls without the
 *  rings a CSS gradient draws on a dark ground; fixed, so the light stays where it
 *  is while the page scrolls under it. */
export function Light() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <AmbientLight
        glows={[
          { color: "#fff", x: 0.5, y: -0.08, rx: 0.16, ry: 0.75, strength: 0.11 },
          { color: "#fff", x: 0.5, y: -0.15, rx: 0.5, ry: 1, strength: 0.06 },
        ]}
      />
    </div>
  );
}

/** THE GRAIN over everything: specks of white light, one device pixel each,
 *  jumping a dozen times a second (@ag/grain), so the translucent layers, the
 *  beam's fall and the glass read as one material. A digital shimmer that is
 *  alive, never smooth; still under reduced motion. */
export function PageGrain() {
  return <Grain className="fixed! inset-0 z-100" />;
}
