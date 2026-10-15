/** The one corner of everything ON an e-id card (its photo, a field written on
 *  it, a link's mark under the hand, the copy, the flag), as a share of the
 *  card's width, so all of them are the same round at any size. The card's own
 *  corner is ID-1's (components/id-card); nothing on it rounds another way. */
export const ON_CARD = "rounded-[1.4cqw]"

/** A card's shape, ID-1's 85.6 by 53.98 mm: the card's own box, and the room
 *  kept for one before it is drawn (a pile laid out round it, a profile on its
 *  way), so nothing moves when it lands. */
export const ID1 = "aspect-[85.6/53.98]"

/** A card's own corner (ID-1: 3.18 mm on 85.6 by 53.98), as shares of its box, so
 *  what is laid over a card's box (a press, a shadow) is rounded as the card is
 *  at any size. */
export const CORNER = "rounded-[3.715%/5.891%]"
