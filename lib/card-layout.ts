// THE CARD'S LAYOUT, once: where everything on an e-ID card goes and how big,
// as shares of the card's width (the site draws them in `cqw`, the share image,
// the embed and the link preview in its own units, lib/card-image). The site's
// card (components/id-card) and the drawing (lib/card-image) both read it, so
// the card is the same card wherever it is shown and never drifts.
//
// The layout, top to bottom: the head (the address on the left, where the eye
// starts; the country's code and flag on the right); under it, centred in the
// room left, the photo, and beside it the name over the links.

export const CARD_LAYOUT = {
  /** The card's inner margin, every side. */
  pad: 6,
  /** The head's type: the address and the country's code. */
  head: 3,
  /** The flag's type size in the head (a flag is 0.75 of it tall). */
  flag: 4,
  /** The photo's side, a square. */
  photo: 30,
  /** Between the photo and the words beside it. */
  gap: 5,
  /** The name's type. */
  name: 7,
  /** A link's icon, and the step from one to the next. */
  icon: 4.6,
  iconStep: 7.4,
  /** The most one link's mark takes of its row (its hit area included): the
   *  row spreads across the column, its first mark at the left and its last at
   *  the right, only when its links fill it, so a few never stand at its ends. */
  iconSlot: 10,
} as const

/** A layout share as the site writes it, in the card's width (`cqw`). */
export const cqw = (share: number) => `${share}cqw`
