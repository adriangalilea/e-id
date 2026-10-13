/** A FOIL EDGE for a surface of glass: its rim catches the foil (`--foil`) as a
 *  laminate's does, in a one-pixel ring. Composed, not built in: placed as a child
 *  of any glass (or any rounded, positioned box), it follows that box's corners and
 *  draws over its edge, and the glass material itself is untouched. How it shows is
 *  the stylesheet's (`foil-edge` in globals.css): faint everywhere, its spectrum
 *  fixed to the screen so an edge's colour is where it stands and shifts as the
 *  page scrolls; brighter in a band at the hand inside a Tilt. Server-safe. */
export function FoilEdge() {
  return <span aria-hidden data-slot="foil-edge" />;
}
