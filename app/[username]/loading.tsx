import { Wide } from "@/components/frame"
import { PROFILE } from "@/components/profile-layout"

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
            <div className="aspect-[85.6/53.98] w-full rounded-[3.7%/5.9%] bg-foreground/[0.04]" />
          </div>
        </aside>
      </div>
    </Wide>
  )
}
