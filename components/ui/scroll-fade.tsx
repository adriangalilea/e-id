import type * as React from "react"
import { cn } from "@/lib/utils"
import "./edge-fade"

export interface ScrollFadeProps {
  children: React.ReactNode
  /** The scroller: its height cap, padding and spacing. Keep the padding at
   *  the ends at least the fade's depth (`--edge-fade`, 1rem) so the rows at
   *  rest stand clear of it; a scroller under a pane's front surface pads its
   *  top by that surface's height. */
  className?: string
}

export function ScrollFade({ children, className }: ScrollFadeProps) {
  return (
    <div
      data-slot="scroll-fade"
      className={cn(
        "ag-edge-fade-y rounded-[inherit] pt-5 pb-5 [--edge-fade:1rem]",
        className,
      )}
    >
      {children}
    </div>
  )
}
