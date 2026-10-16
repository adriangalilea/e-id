// A SITE AS IT LOOKS, CAPTURED: the manifest `mise browser-shot` writes beside its
// pictures (`<out>.json`) and a page imports as it is, the one spelling of a
// capture on both sides. The page in both schemes as `MediaAsset`s whose `src` is
// already the address it is served at, its content's hash in it (`?v=`), so a
// page captured again is a new address and nothing builds a path by hand; and the
// places of things found on it (`--find`), for a story to press a button drawn in
// the picture. Framework-free: a build script reads it as well as a component.

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

/** One page a site captures, as its declaration says it (`CapturePlan`). */
export interface CaptureSpec {
  url: string
  /** On a phone (its mobile layout, one screen tall), else a desktop `width`. */
  phone?: boolean
  /** CSS px (1280), a desktop's. */
  width?: number
  /** How many screens down it is captured (2.5 on a desktop, 1 on a phone). */
  tall?: number
  /** Things the page must show, by name and selector: their places are kept
   *  (`found`), and the capture fails when one is missing (an old deploy). */
  find?: Record<string, string>
  /** A page that may refuse a headless browser (X does): left out, its reason
   *  kept in the manifest's `missing`, instead of failing the run. */
  optional?: boolean
}

/** A SITE'S CAPTURES AS CODE: what `mise capture <file>` (the registry's checkout)
 *  makes. Its pictures go to `folder` (under the site's `public/`, served at
 *  its root), its manifest to `manifest`, which the site imports as it is. Run
 *  again, it makes the same thing: a page unchanged keeps its address (the
 *  content's hash), a page no longer declared loses its files. The file's
 *  default export is the plan, or a function making it (a plan read from
 *  the site's own data). */
export interface CapturePlan<Meta = Record<string, never>> {
  folder: string
  manifest: string
  /** What the site keeps with the captures (whose they are). */
  meta: Meta
  shots: Record<string, CaptureSpec>
}

/** What `mise capture` writes: the plan's `meta`, each shot by its name, and
 *  each optional shot that was refused with why. */
export interface CaptureManifest<Meta = Record<string, never>> {
  meta: Meta
  captures: Record<string, BrowserCapture>
  missing: Record<string, string>
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
