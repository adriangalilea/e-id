// The mark's geometry, framework-free: the brand component draws it, the holo's
// prints repeat it, the favicon is it (app/icon.svg).

/** The mark on a 24 grid: 👤 as Apple draws it, flat, a round head over one wide
 *  dome of shoulders (the top half of an ellipse centred on the foot, 9 by 8.5,
 *  cut flat there). Where the dome meets the foot its corners are eased, not
 *  pointed: the dome stops just above the foot (at x 3.05 and 20.95, on the same
 *  ellipse) and a short curve turns it into the flat. */
export const MARK_PATH =
  "M7.5 7.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 1 1 -9 0z M4.3 22Q3 22 3.05 21.1A9 8.5 0 0 1 20.95 21.1Q21 22 19.7 22z"

/** The mark's own bounds on that grid, head to foot and shoulder to shoulder: the
 *  box it is drawn in wherever it stands as a letter, so its height is the glyph's
 *  and not the grid's padding. */
export const MARK_BOX = { x: 3, y: 3, w: 18, h: 19 }
