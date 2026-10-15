/** The one corner of everything ON an e-id card (its photo, a field written on
 *  it, a link's mark under the hand, the copy, the flag), as a share of the
 *  card's width, so all of them are the same round at any size. The card's own
 *  corner is ID-1's (components/id-card); nothing on it rounds another way. */
export const ON_CARD = "rounded-[1.4cqw]"

/** A card's shape, ID-1's 85.6 by 53.98 mm: the card's own box, and the room
 *  kept for one before it is drawn (a pile laid out round it, a profile on its
 *  way), so nothing moves when it lands. */
export const ID1 = "aspect-[85.6/53.98]"

/** What pressing a card does, said under the hand in its corner ("edit", "your
 *  page"): a glass label inside a press laid over the card, the press named
 *  `group/press`. The bottom-left corner, under the photo, the one a card leaves
 *  empty: the bottom-right is its vCard's. */
export const PRESS_HINT =
  "pointer-events-none absolute left-3 bottom-3 flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-foreground/85 text-sm opacity-0 backdrop-blur-md transition-opacity group-hover/press:opacity-100 group-focus-visible/press:opacity-100 [&_svg]:size-3.5"

/** The pointer over an owner's own card, which a press takes up to edit: a pen,
 *  its nib the hotspot, white over a dark edge so it reads on any card. It says
 *  what the click will do before it is made and covers nothing of the card (a
 *  label under the hand hid its vCard, and repeated the "edit" button beside it).
 *  A CSS `cursor` value, the hand's own when the image cannot be drawn. */
const PEN =
  "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
export const EDIT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${PEN}" stroke="#000" stroke-opacity=".7" stroke-width="3.5"/><path d="${PEN}" stroke="#fff" stroke-width="1.5"/></svg>`,
)}") 2 22, pointer`

/** A card's own corner (ID-1: 3.18 mm on 85.6 by 53.98), as shares of its box, so
 *  what is laid over a card's box (a press, a shadow) is rounded as the card is
 *  at any size. */
export const CORNER = "rounded-[3.715%/5.891%]"
