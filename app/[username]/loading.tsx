import { CORNER, ID1 } from "@/components/card-shape"
import { Wide } from "@/components/frame"
import { PROFILE } from "@/components/profile-layout"
import { cn } from "@/lib/utils"

// A profile on its way, for a click that should show something at once: the
// profile's own frame (components/profile-layout) with its card's room kept,
// an ID card's shape, empty. The page itself is prerendered and streams in a
// moment later, into the same places, so nothing moves when it lands.

export default function Loading() {
  return (
    <Wide className={PROFILE.frame}>
      <div className={PROFILE.grid}>
        <aside className={PROFILE.side}>
          <div className={PROFILE.identity}>
            <div className={cn(ID1, CORNER, "w-full bg-foreground/[0.04]")} />
          </div>
        </aside>
      </div>
    </Wide>
  )
}
