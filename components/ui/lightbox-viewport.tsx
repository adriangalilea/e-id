import {
  assert,
  type Band,
  type Obstruction,
  type Rect,
  stageBand,
} from "@/lib/lightbox-motion"

export const INSET_Y = 48
/** The rail beside the media at lg (px), and under it below (a share of the stage).
 *  The css reads both from the root (--lb-rail-w, --lb-rail-h). */
export const RAIL_W = 288
export const RAIL_H = 0.4

export function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect()
  const rx = getComputedStyle(el).borderTopLeftRadius.split(" ")[0] ?? "0px"
  const n = Number.parseFloat(rx)
  assert(Number.isFinite(n), `border radius "${rx}" is not a number`)
  const radius = rx.endsWith("%")
    ? (n / 100) * r.width
    : Math.min(n, Math.min(r.width, r.height) / 2)
  return { x: r.left, y: r.top, w: r.width, h: r.height, radius }
}

export function measureBand(rail: boolean): Band {
  const vv = window.visualViewport
  assert(vv, "visualViewport")
  const base: Band = {
    top: vv.offsetTop,
    left: vv.offsetLeft,
    w: vv.width,
    h: vv.height,
  }
  const blocks: Obstruction[] = []
  for (const el of document.querySelectorAll<HTMLElement>("[data-obstructs]")) {
    const r = el.getBoundingClientRect()
    if (r.height <= 0) continue
    blocks.push(
      el.dataset.obstructs === "top"
        ? { side: "top", edge: r.bottom }
        : { side: "bottom", edge: r.top },
    )
  }
  const band = stageBand(base, blocks)
  const lane = !rail
    ? band
    : matchMedia("(min-width: 64rem)").matches
      ? { ...band, w: band.w - RAIL_W }
      : { ...band, h: band.h * (1 - RAIL_H) }
  return { ...lane, top: lane.top + INSET_Y, h: lane.h - 2 * INSET_Y }
}

export const sameBand = (a: Band, b: Band) =>
  Math.abs(a.top - b.top) < 1 &&
  Math.abs(a.left - b.left) < 1 &&
  Math.abs(a.w - b.w) < 1 &&
  Math.abs(a.h - b.h) < 1
