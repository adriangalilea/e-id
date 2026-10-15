// THE HOME'S CAPTURES, as `pnpm captures` makes them from the plan (captures.ts):
// one lead's profile on a laptop and on a phone, and the pages their links open,
// each the registry's `BrowserCapture` (@ag/browser, lib/browser-capture), drawn
// as it is. The one place the JSON is given its type.

import type { LinkShotsMeta } from "@/captures"
import type { BrowserCapture, CaptureManifest } from "@/lib/browser-capture"
import MANIFEST from "@/lib/link-shots.json"

// JSON's strings are wider than the asset's kinds; `mise capture` writes it as a
// `CaptureManifest`, which is what makes this cast true.
const manifest = MANIFEST as CaptureManifest<LinkShotsMeta>

/** A capture the plan requires (captures.ts): there, or the manifest is not the
 *  plan's and the home screams. */
function required(name: string): BrowserCapture {
  const capture = manifest.captures[name]
  if (!capture)
    throw new Error(`lib/link-shots.json has no ${name}: run pnpm captures`)
  return capture
}

export const SHOTS = {
  /** Whose captures these are: the home's lead when they were taken. */
  handle: manifest.meta.handle,
  /** Their profile on a laptop. */
  profile: required("profile"),
  /** Their profile on a phone, with where its save is (`found.save`). */
  phone: required("phone"),
  /** The first page of each platform they link to, by platform. */
  shots: manifest.captures as Partial<Record<string, BrowserCapture>>,
}
