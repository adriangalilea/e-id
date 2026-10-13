import {
  type Band,
  clampPan,
  KEY_PAN_SPEED,
  KEY_ZOOM_MS,
  MAX_DT,
  type Size,
  type View,
  zoomAt,
} from "@/lib/lightbox-motion"

/** The action ids a key can hold; a subset of the action table's ids. */
export type HoldVerb =
  | "pan.left"
  | "pan.right"
  | "pan.up"
  | "pan.down"
  | "zoom.in"
  | "zoom.out"

export type HoldDelta = {
  /** Pan in px, image-space: left pushes the image right. */
  dx: number
  dy: number
  /** Zoom factor; 1 when no zoom key is held. */
  k: number
}

/** What one frame of `dt` ms adds for the verbs held. Axes add; opposite arrows
 *  cancel. dt is capped at MAX_DT so a frame lost to a tab switch never slingshots. */
export function holdDelta(held: Iterable<HoldVerb>, dt: number): HoldDelta {
  const ms = Math.min(dt, MAX_DT)
  let dx = 0
  let dy = 0
  let k = 1
  for (const id of held) {
    switch (id) {
      case "pan.left":
        dx += KEY_PAN_SPEED * ms
        break
      case "pan.right":
        dx -= KEY_PAN_SPEED * ms
        break
      case "pan.up":
        dy += KEY_PAN_SPEED * ms
        break
      case "pan.down":
        dy -= KEY_PAN_SPEED * ms
        break
      case "zoom.in":
        k *= 2 ** (ms / KEY_ZOOM_MS)
        break
      case "zoom.out":
        k /= 2 ** (ms / KEY_ZOOM_MS)
        break
      default: {
        const never: never = id
        throw new Error(`lightbox: not a hold verb ${String(never)}`)
      }
    }
  }
  return { dx, dy, k }
}

/** The view after one frame of hold: the zoom is applied about the center and held
 *  between 1 and `zoomMax`, the pan is added, and the result is clamped to the
 *  band so a held arrow stops at the edge instead of rubbering. */
export function applyHold(
  view: View,
  delta: HoldDelta,
  fitted: Size,
  band: Band,
  zoomMax: number,
): View {
  const s = Math.min(zoomMax, Math.max(1, view.s * delta.k))
  const zoomed = delta.k === 1 ? view : zoomAt(view, s, { x: 0, y: 0 })
  return clampPan(
    { ...zoomed, x: zoomed.x + delta.dx, y: zoomed.y + delta.dy },
    fitted,
    band,
  )
}
