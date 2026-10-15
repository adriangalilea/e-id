import { glassVariants } from "@/components/ui/material-glass"
import { cn } from "@/lib/utils"

// The two layers e-id stands things on. Only the outer one is glass: a glass is a
// frame, and a frame of glass inside a frame of glass draws two rims, two blurs
// and two bodies where the eye wants one surface and its contents. So what stands
// INSIDE a glass is the plain material's step, a little light, a hairline and the
// corner, nothing of glass's own.

/** What stands on the page: a panel, the sign-ups ledger. The glass material. */
export const SURFACE = cn(
  glassVariants({ shape: "surface" }),
  "border-transparent [--glass-radius:var(--radius-2xl)]",
)

/** What stands inside a glass (the links' box): a registry card, a post, a
 *  profile, a preview. A step of light off the glass under it, no rim, no blur. A
 *  registry card handed it keeps its layout and trades its own fill and border
 *  for this. */
export const INSET =
  "rounded-xl border-white/[0.06] bg-white/[0.035] shadow-none hover:bg-white/[0.055]"
