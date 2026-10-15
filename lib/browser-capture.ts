import type { MediaAsset } from "@/lib/media-asset"

/** Where a thing is on the captured page, CSS px from its top-left corner. */
export interface CaptureBox {
  x: number
  y: number
  width: number
  height: number
}

export interface BrowserCapture {
  /** The page captured. */
  url: string
  /** The page's width in CSS px: what every found box is measured against. */
  width: number
  /** Things found on it by name (`--find save=…`). */
  found?: Record<string, CaptureBox>
  dark: MediaAsset
  light: MediaAsset
}

/** The thing called `name` on the page. Screams when the capture did not look
 *  for it: a story pointing at nothing is wrong, never empty. */
export function foundOn(capture: BrowserCapture, name: string): CaptureBox {
  const box = capture.found?.[name]
  if (!box)
    throw new Error(
      `browser-capture: nothing called ${name} was found on ${capture.url}; capture it with --find ${name}=<selector>`,
    )
  return box
}

/** Where a found thing is, as the style that lays a box exactly over it inside
 *  `BrowserCapturePage` (@ag/browser): shares of the page's width (`cqw` of the
 *  page, its container), so it stays on the thing at any size the picture is
 *  drawn. Plain values, so a server component computes it as well. */
export function atFound(
  capture: BrowserCapture,
  name: string,
): {
  position: "absolute"
  left: string
  top: string
  width: string
  height: string
} {
  const box = foundOn(capture, name)
  const share = (px: number) => `${(px / capture.width) * 100}cqw`
  return {
    position: "absolute",
    left: share(box.x),
    top: share(box.y),
    width: share(box.width),
    height: share(box.height),
  }
}

/** A found thing's middle, CSS px on the page: where a finger presses it. */
export function middleOf(box: CaptureBox): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
