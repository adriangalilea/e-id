"use client"

// ‹ and › at the left and right edges of a stage, vertically centred, the lightbox's
// arrows. Quiet at rest; `EdgeArrows` lifts them a tier while the pointer is over the
// stage, and one goes to the title tier under the hand. At an end the arrow stays
// focusable and dims, and a press does nothing: a disabled button drops focus to body
// and takes the keyboard with it. The focus ring is the browser's, which shows for
// the keyboard and not for a click. The stage is the arrows' positioned parent. Two
// materials (`material`): plain, a bare glyph; glass, the glyph on a disc of the
// material's glass, its rim catching more light under the hand.

import type * as React from "react"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import { cn } from "@/lib/utils"

const ARROW =
  "pointer-events-auto absolute top-1/2 grid -translate-y-1/2 cursor-pointer place-items-center border-0 text-inherit opacity-[var(--ag-edge-rest,var(--alpha-meta))] hover:opacity-(--alpha-title) focus-visible:opacity-(--alpha-title) aria-disabled:cursor-default aria-disabled:opacity-[calc(var(--alpha-meta)*0.4)]"
/** 32 px in either material: the icon button's own size (button `icon`). */
const FACE: Record<Material, string> = {
  plain: "size-8 rounded-[8px] bg-transparent",
  glass: `size-8 [--glass-radius:16px] [--glass-moves:opacity_200ms_var(--ease-out)] [--glass-change-duration:200ms] hover:[--glass-rim:1.6]!`,
}
const SIDE = { left: "left-2", right: "right-2" } as const
const PATH = { left: "M10 3L5 8l5 5", right: "M6 3l5 5-5 5" } as const
const LABEL = { left: "previous", right: "next" } as const

/** One arrow, for a stage that names its own (the lightbox labels them from its
 *  action table). `enabled={false}` is the end of the reel. */
export function EdgeArrow({
  side,
  enabled = true,
  onClick,
  material,
  scheme,
  className,
  ...rest
}: {
  side: "left" | "right"
  enabled?: boolean
  onClick: () => void
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's;
   *  arrows over a picture stand in a stage that says dark. */
  scheme?: Scheme
  className?: string
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "children"
>) {
  const m = useMaterial(material)
  // Over a picture each arrow is read by the part of it under the arrow.
  const [s, here] = useSurfaceScheme<HTMLButtonElement>(scheme)
  return (
    <button
      ref={here}
      type="button"
      data-slot="edge-arrow"
      data-side={side}
      data-material={m}
      aria-label={LABEL[side]}
      aria-disabled={!enabled || undefined}
      className={cn(
        schemeOf(s),
        m === "glass" && glassVariants({ shape: "surface" }),
        ARROW,
        FACE[m],
        SIDE[side],
        className,
      )}
      onClick={enabled ? onClick : undefined}
      {...rest}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="ag-icon size-4 fill-none stroke-current stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path d={PATH[side]} />
      </svg>
    </button>
  )
}

/** Both arrows over the stage they sit in. */
export function EdgeArrows({
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  material,
  scheme,
  className,
}: {
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  material?: Material
  scheme?: Scheme
  className?: string
}) {
  return (
    <div
      data-slot="edge-arrows"
      className={cn(
        "pointer-events-none absolute inset-0 [:hover>&]:[--ag-edge-rest:var(--alpha-body)]",
        className,
      )}
    >
      <EdgeArrow
        side="left"
        enabled={hasPrev}
        onClick={onPrev}
        material={material}
        scheme={scheme}
      />
      <EdgeArrow
        side="right"
        enabled={hasNext}
        onClick={onNext}
        material={material}
        scheme={scheme}
      />
    </div>
  )
}
