import type * as React from "react"
import { cn } from "@/lib/utils"

/** A tap's phases, shares of it: down until `down`, held until `lift`, lifting
 *  after. */
export const TOUCH = { down: 0.3, lift: 0.7 } as const

/** Whether the control under the finger is pressed at `tap`: from the moment the
 *  finger is down until it lifts, so the control lights in step with the disc. */
export function touchPressed(tap: number): boolean {
  return tap >= TOUCH.down && tap < TOUCH.lift
}

export interface TouchProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** Where the finger lands, any CSS lengths, from the box's top-left corner. */
  x: string
  y: string
  /** How far through the tap, 0..1. Outside it, no finger. */
  tap: number
  /** The disc's diameter, any CSS length: by default a fingertip on a phone
   *  drawn at its real size, 11% of the box's width (44 of a phone's 402
   *  points), so the box must be a size container. */
  size?: string
}

export function Touch({
  x,
  y,
  tap,
  size = "11cqw",
  className,
  style,
  ...props
}: TouchProps) {
  if (tap <= 0 || tap >= 1) return null
  // Down: it lands from a little larger and fades in. Held: pressed in. Lifting:
  // it lets go outward and fades.
  const { down, lift } = TOUCH
  const opacity =
    tap < down ? tap / down : tap >= lift ? (1 - tap) / (1 - lift) : 1
  const scale =
    tap < down
      ? 1.4 - 0.5 * (tap / down)
      : tap >= lift
        ? 0.9 + 0.3 * ((tap - lift) / (1 - lift))
        : 0.9
  return (
    <div
      aria-hidden
      data-slot="touch"
      className={cn(
        "pointer-events-none absolute top-(--ag-touch-y) left-(--ag-touch-x) z-50 size-(--ag-touch-size) -translate-x-1/2 -translate-y-1/2 scale-(--ag-touch-scale) rounded-full bg-white/40 opacity-(--ag-touch-opacity) shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.75),0_0_0_1px_rgb(0_0_0/0.12),0_2px_10px_rgb(0_0_0/0.3)]",
        className,
      )}
      style={
        {
          "--ag-touch-x": x,
          "--ag-touch-y": y,
          "--ag-touch-size": size,
          "--ag-touch-scale": String(scale),
          "--ag-touch-opacity": String(opacity),
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
