// e-id's hologram prints: @ag/holo's (lib/holo-prints) with the mark as their
// emblem. The card and the logo wear them through `Holo` (components/ui/holo); the
// hero's pill wears them, and the foil (`--foil`, lib/foil's stops), as custom
// properties (`HOLO_PRINTS`, `data-cta` in globals.css); the share image draws the
// same art in its own patterns (`HOLO_ART`, lib/card-image).

import { FOIL_STOPS } from "@/lib/foil";
import {
  type Emblem,
  emblems,
  guilloche,
  type HoloArt,
  printUrl,
  seal,
  web,
} from "@/lib/holo-prints";
import { MARK_BOX, MARK_PATH } from "@/lib/mark";

export type { HoloArt };
export type { HoloPrint } from "@/components/ui/holo";

/** The mark, as the glyph the prints repeat and the seal holds. */
export const MARK_EMBLEM: Emblem = { path: MARK_PATH, box: MARK_BOX };

/** The prints, drawn once. */
export const HOLO_ART = {
  guilloche: guilloche(),
  emblems: emblems(MARK_EMBLEM),
  web: web(MARK_EMBLEM),
  seal: seal(MARK_EMBLEM),
};

/** The prints as the custom properties a surface wears to carry them. */
export const HOLO_PRINTS = {
  "--holo-guilloche": printUrl(HOLO_ART.guilloche),
  "--holo-emblems": printUrl(HOLO_ART.emblems),
  "--holo-web": printUrl(HOLO_ART.web),
  "--holo-seal": printUrl(HOLO_ART.seal),
  "--foil": FOIL_STOPS,
} as Record<`--${string}`, string>;
