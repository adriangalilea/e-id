// HOW A NAME SITS ON THE CARD: on one line whenever it can, its type made smaller
// to fit the column, down to a floor; a name too long for one line even at the
// floor takes two lines at the full size. Measured from the face's own advances
// (lib/name-advances.json, read from the font), so the site's card
// (components/id-card) and its drawing (lib/card-image) fit a name alike.

import ADVANCES from "@/lib/name-advances.json";

/** The name's tracking, in ems (the card's `tracking-[-0.03em]`). */
const TRACKING = -0.03;

/** The smallest the name's type gets to stay on one line, a share of its size:
 *  smaller and a name read as a caption. */
const FLOOR = 0.6;

const advances: Record<string, number> = ADVANCES.advances;

/** How wide `name` sets, in ems of its type. */
export function nameEms(name: string): number {
  let ems = 0;
  for (const c of name) ems += (advances[c] ?? ADVANCES.average) + TRACKING;
  return ems;
}

/** The name's type size and lines in a column `column` wide, its type `size` at
 *  most, both in one unit (the card's width's shares). */
export function nameFit(
  name: string,
  column: number,
  size: number,
): { size: number; lines: 1 | 2 } {
  const one = column / nameEms(name);
  if (one >= size) return { size, lines: 1 };
  if (one >= FLOOR * size) return { size: one, lines: 1 };
  return { size, lines: 2 };
}
