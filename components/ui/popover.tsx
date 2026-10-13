"use client"

// A popover on Base UI (focus moved in and returned, Esc and an outside press close it,
// a title and a description a screen reader is told), the parts named as shadcn names
// them so code written for shadcn composes it:
//
//   <Popover>
//     <PopoverTrigger render={<Button />}>share</PopoverTrigger>
//     <PopoverContent>
//       <PopoverTitle>share the clip</PopoverTitle>
//       <PopoverDescription>anyone with the link can watch</PopoverDescription>
//       …
//     </PopoverContent>
//   </Popover>
//
// Arrowless, as the tooltip is: anchored a step off its trigger, it needs no pointer.
// It opens on a press (or, with `openOnHover` on the trigger, under the hand, Base UI's
// own delays). Two materials (`material` on PopoverContent, or a MaterialProvider round
// it): plain, the page's popover surface; glass, the material's glass. What is inside
// wears the same material.

import { Popover as Base } from "@base-ui/react/popover"
import type * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import { usePortalTarget } from "@/components/ui/portal"

/** The popover's state; `modal` to hold the page while it is open. */
export const Popover = Base.Root

/** What opens it; `render` makes any element the trigger. */
export const PopoverTrigger = Base.Trigger

/** One popover, several triggers anywhere (Base UI's handle): `<Popover handle>` and
 *  each `<PopoverTrigger handle>` share it, a group of controls serving one panel. */
export const createPopoverHandle = Base.createHandle

/** What closes it; `render` makes any element the close. */
export const PopoverClose = Base.Close

const PLAIN_FACE =
  "rounded-xl border border-border bg-popover text-popover-foreground shadow-lg transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none"
/** Its motion through the material, which owns the glass's transition. */
const GLASS_FACE = cn(
  glassVariants({ shape: "surface" }),
  "[--glass-radius:--theme(--radius-2xl)] [--glass-blur:16px] [--glass-moves:opacity_150ms_var(--ease-out),scale_150ms_var(--ease-out)]",
)

export interface PopoverContentProps
  extends React.ComponentProps<typeof Base.Popup> {
  side?: React.ComponentProps<typeof Base.Positioner>["side"]
  align?: React.ComponentProps<typeof Base.Positioner>["align"]
  sideOffset?: number
  /** What it stands under, when not its trigger (a group of controls it serves). */
  anchor?: React.ComponentProps<typeof Base.Positioner>["anchor"]
  /** Where it is portalled (a player's layer, so it shows in fullscreen). */
  container?: React.ComponentProps<typeof Base.Portal>["container"]
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's,
   *  the scheme of what opened it. What is inside stands in it too. */
  scheme?: Scheme
}

/** The popup, portalled and anchored to its trigger, in its material. */
export function PopoverContent({
  side = "bottom",
  align = "center",
  sideOffset = 8,
  anchor,
  container,
  material,
  scheme,
  className,
  children,
  ref,
  ...props
}: PopoverContentProps) {
  const m = useMaterial(material)
  const target = usePortalTarget()
  // Over a picture (a player's layer, in fullscreen) it is read by the part of it
  // under the popup.
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme, ref)
  return (
    <Base.Portal container={container ?? target}>
      <Base.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        anchor={anchor}
        className="z-50 max-w-(--available-width) outline-none"
      >
        <Base.Popup
          ref={here}
          data-slot="popover-content"
          data-material={m}
          className={cn(
            schemeOf(s),
            m === "glass" ? GLASS_FACE : PLAIN_FACE,
            "flex w-72 max-w-full origin-(--transform-origin) flex-col gap-1 p-4 text-sm outline-none",
            "data-[ending-style]:scale-98 data-[ending-style]:opacity-0 data-[starting-style]:scale-98 data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        >
          <MaterialProvider material={m} scheme={s}>
            {children}
          </MaterialProvider>
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  )
}

export function PopoverTitle({
  className,
  ...props
}: React.ComponentProps<typeof Base.Title>) {
  return (
    <Base.Title
      data-slot="popover-title"
      className={cn("font-medium text-sm leading-5", className)}
      {...props}
    />
  )
}

export function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<typeof Base.Description>) {
  return (
    <Base.Description
      data-slot="popover-description"
      className={cn("text-current/60 text-sm leading-5", className)}
      {...props}
    />
  )
}
