"use client"

import * as React from "react"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import { cn } from "@/lib/utils"

// Text of more than a line, in the input's well: the same sunken fill and inset ring,
// brightening under the hand and clear on focus, red when the value is wrong
// (`aria-invalid`), at the input's three type sizes. It grows with what is written,
// from `rows` lines up to `maxRows` (then it scrolls); the browser sizes it where it
// can (`field-sizing: content`), and where it cannot, it is measured as it is typed
// in. `autosize={false}` keeps it `rows` tall, the reader dragging nothing (no resize
// handle either way: the field's size is its content's).
// `material="glass"`: a well of glass, its rim brightening on focus, red when wrong.

export type TextareaSize = "sm" | "md" | "lg"

const TYPE: Record<TextareaSize, string> = {
  sm: "px-2 py-1 text-[12px] leading-[18px]",
  md: "px-2.5 py-1.5 text-[13px] leading-5",
  lg: "px-3 py-2 text-sm leading-6",
}
/** Each size's padding above and below, px: what a line count is grown by. */
const PAD_Y: Record<TextareaSize, number> = { sm: 4, md: 6, lg: 8 }

/** The input's well, on the text itself. */
const WELL =
  "rounded-md bg-foreground/[0.04] ring-1 ring-foreground/12 ring-inset transition-[box-shadow,background-color] placeholder:text-foreground/35 hover:ring-foreground/22 focus-visible:bg-foreground/[0.06] focus-visible:ring-foreground/40 aria-invalid:ring-tone-bad/70"

const GLASS_WELL =
  "[--glass-radius:--theme(--radius-xl)] placeholder:text-current/40 hover:[--glass-rim:1.3]! focus-visible:[--glass-rim:1.7]! aria-invalid:[--glass-stain:var(--tone-bad)]! aria-invalid:[--glass-rim-color:var(--tone-bad)]! aria-invalid:[--glass-rim:2.2]!"

/** Whether this browser sizes a field to its content itself. */
const SIZES_ITSELF =
  typeof CSS !== "undefined" && CSS.supports("field-sizing", "content")

export type TextareaProps = Omit<React.ComponentProps<"textarea">, "rows"> & {
  size?: TextareaSize
  /** Lines tall at least (and exactly, without autosize). */
  rows?: number
  /** Lines tall at most while it grows; then it scrolls. Unset, it grows on. */
  maxRows?: number
  /** Grow with what is written. Default on. */
  autosize?: boolean
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
}

export function Textarea({
  size = "md",
  rows = 3,
  maxRows,
  autosize = true,
  material,
  scheme,
  className,
  style,
  ref,
  onInput,
  ...props
}: TextareaProps) {
  const m = useMaterial(material)
  // Over a picture it is read by the part of it under the field.
  const [s, here] = useSurfaceScheme<HTMLTextAreaElement>(scheme, ref)
  const own = React.useRef<HTMLTextAreaElement | null>(null)
  const attach = React.useCallback(
    (el: HTMLTextAreaElement | null) => {
      own.current = el
      here(el)
    },
    [here],
  )
  // Where the browser cannot size it, its height is measured from what it holds.
  const fit = React.useCallback(() => {
    const el = own.current
    if (!el || !autosize || SIZES_ITSELF) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [autosize])
  // biome-ignore lint/correctness/useExhaustiveDependencies: a value set from outside is measured too
  React.useLayoutEffect(fit, [fit, props.value])
  const lines = (n: number) => `calc(${n}lh + ${2 * PAD_Y[size]}px)`
  return (
    <textarea
      ref={attach}
      data-slot="textarea"
      data-size={size}
      data-material={m}
      rows={autosize ? undefined : rows}
      onInput={(e) => {
        fit()
        onInput?.(e)
      }}
      style={
        autosize
          ? ({
              "--ag-textarea-min": lines(rows),
              "--ag-textarea-max": maxRows ? lines(maxRows) : "none",
              ...style,
            } as React.CSSProperties)
          : style
      }
      className={cn(
        "block w-full resize-none outline-none disabled:cursor-not-allowed disabled:opacity-50",
        TYPE[size],
        autosize &&
          "max-h-(--ag-textarea-max) min-h-(--ag-textarea-min) [field-sizing:content]",
        schemeOf(s),
        m === "glass"
          ? [glassVariants({ shape: "surface" }), GLASS_WELL]
          : WELL,
        className,
      )}
      {...props}
    />
  )
}
