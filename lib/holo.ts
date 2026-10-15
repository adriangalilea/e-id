// e-id's hologram prints: @ag/holo's (lib/holo-prints) with the mark as their
// emblem. The card and the logo wear them through `Holo` (components/ui/holo); the
// share image draws the same art in its own patterns (`HOLO_ART`, lib/card-image).

import {
  type Emblem,
  emblems,
  guilloche,
  type HoloArt,
  seal,
  web,
} from "@/lib/holo-prints"
import { MARK_BOX, MARK_PATH } from "@/lib/mark"

export type { HoloPrint } from "@/components/ui/holo"
export type { HoloArt }

/** The mark, as the glyph the prints repeat and the seal holds. */
export const MARK_EMBLEM: Emblem = { path: MARK_PATH, box: MARK_BOX }

/** The prints, drawn once. */
export const HOLO_ART = {
  guilloche: guilloche(),
  emblems: emblems(MARK_EMBLEM),
  web: web(MARK_EMBLEM),
  seal: seal(MARK_EMBLEM),
}
