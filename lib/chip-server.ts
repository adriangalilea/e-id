import "server-only"

import { cookies } from "next/headers"
import {
  CHIP_COOKIE,
  CHIP_COOKIE_OPTIONS,
  type Chip,
  chipValue,
} from "@/lib/chip"

/** Rewrites the display cookie from a server action, where the signed-in user's
 *  username or avatar just changed. */
export async function writeChip(chip: Chip) {
  ;(await cookies()).set(CHIP_COOKIE, chipValue(chip), CHIP_COOKIE_OPTIONS)
}
