// The mark's geometry, framework-free: the brand component draws it, the holo's
// prints repeat it, the favicon is it (app/icon.svg).

/** The mark on a 24 grid: 👤 as Apple draws it, flat, a round head over one wide
 *  dome of shoulders (the top half of an ellipse, cut flat at the foot). */
export const MARK_PATH =
  "M7.5 7.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 1 1 -9 0z M3 22A9 8.5 0 0 1 21 22z";

/** The mark's own bounds on that grid, head to foot and shoulder to shoulder: the
 *  box it is drawn in wherever it stands as a letter, so its height is the glyph's
 *  and not the grid's padding. */
export const MARK_BOX = { x: 3, y: 3, w: 18, h: 19 };
