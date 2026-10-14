"use client"

// A HOVER CARD: what is behind a link, shown while the hand rests on it or the
// keyboard is on it (a person's card behind their name, a page's preview behind its
// address), on Base UI's preview card. The parts are shadcn's:
//
//   <HoverCard>
//     <HoverCardTrigger href="/people/ada">ada</HoverCardTrigger>
//     <HoverCardContent>…</HoverCardContent>
//   </HoverCard>
//
// It waits before opening (600 ms: passing over a link on the way elsewhere opens
// nothing) and before closing (300 ms: the hand crossing the gap to the card keeps it),
// both set on the trigger. The trigger is a link, and stays one: the card only previews
// where it goes, so nothing in it may be found nowhere else (a touch or a screen reader
// never sees it). Esc and a press outside close it. Arrowless, as the popover is. Two
// materials (`material` on HoverCardContent, or a MaterialProvider round it): plain,
// the page's popover surface; glass, the material's glass. What is inside wears the
// same material, and stands in the card as in a frame (`InFrame`): a profile, a stat,
// anything that draws a box when alone draws none in it.

import { PreviewCard as Base } from "@base-ui/react/preview-card"
import type * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import { InFrame } from "@/components/ui/panel"
import { usePortalTarget } from "@/components/ui/portal"

/** The card's state: uncontrolled, or `open` and `onOpenChange`. */
export const HoverCard = Base.Root

/** The link it previews: an `<a>` in the page's own link style, `render` for a
 *  router's own (`<Link href />`). While open it carries `data-popup-open`. `delay`
 *  and `closeDelay` are ms the hand rests before it opens and leaves before it
 *  closes. */
export function HoverCardTrigger({
  delay = 600,
  closeDelay = 300,
  ...props
}: React.ComponentProps<typeof Base.Trigger>) {
  return (
    <Base.Trigger
      data-slot="hover-card-trigger"
      delay={delay}
      closeDelay={closeDelay}
      {...props}
    />
  )
}

const PLAIN_FACE =
  "rounded-xl border border-border bg-popover text-popover-foreground shadow-lg transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none"
/** Its motion through the material, which owns the glass's transition. */
const GLASS_FACE = cn(
  glassVariants({ shape: "surface" }),
  "[--glass-radius:--theme(--radius-2xl)] [--glass-blur:16px] [--glass-moves:opacity_150ms_var(--ease-out),scale_150ms_var(--ease-out)]",
)

export interface HoverCardContentProps
  extends React.ComponentProps<typeof Base.Popup> {
  side?: React.ComponentProps<typeof Base.Positioner>["side"]
  align?: React.ComponentProps<typeof Base.Positioner>["align"]
  sideOffset?: number
  /** Where it is portalled (a player's layer, so it shows in fullscreen). */
  container?: React.ComponentProps<typeof Base.Portal>["container"]
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
}

/** The card, portalled and anchored to its link, in its material. */
export function HoverCardContent({
  side = "bottom",
  align = "center",
  sideOffset = 8,
  container,
  material,
  scheme,
  className,
  children,
  ...props
}: HoverCardContentProps) {
  const m = useMaterial(material)
  const s = useScheme(scheme)
  const target = usePortalTarget()
  return (
    <Base.Portal container={container ?? target}>
      <Base.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50 max-w-(--available-width) outline-none"
      >
        <Base.Popup
          data-slot="hover-card-content"
          data-material={m}
          className={cn(
            schemeOf(s),
            m === "glass" ? GLASS_FACE : PLAIN_FACE,
            "flex w-72 max-w-full origin-(--transform-origin) flex-col gap-2 p-4 text-sm outline-none",
            "data-[ending-style]:scale-98 data-[ending-style]:opacity-0 data-[starting-style]:scale-98 data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        >
          <MaterialProvider material={m} scheme={s}>
            <InFrame>{children}</InFrame>
          </MaterialProvider>
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  )
}
