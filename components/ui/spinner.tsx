"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"
import { type Material, useMaterial } from "@/components/ui/material"

// Work under way: a ring with a turning arc, in the text's colour, so it reads
// wherever it sits (a button, a row, a field). It turns only while it is shown, which
// is only while the work runs: nothing here spins on its own. With reduced motion
// the arc holds still. A screen reader hears its `label` once (role status).
// Glass: the arc catches the glass's rim light, a soft glow round it.

export type SpinnerSize = "sm" | "md" | "lg"

const SIDE: Record<SpinnerSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
}

/** The ring's radius in a 16-unit box and its arc's length: a quarter turn. */
const R = 6.5
const ARC = (2 * Math.PI * R) / 4

export type SpinnerProps = Omit<React.ComponentProps<"span">, "children"> & {
  size?: SpinnerSize
  /** What is happening, for a screen reader ("saving"). */
  label?: string
  material?: Material
}

export function Spinner({
  size = "md",
  label = "loading",
  material,
  className,
  ...props
}: SpinnerProps) {
  const m = useMaterial(material)
  return (
    <span
      role="status"
      aria-label={label}
      data-slot="spinner"
      data-material={m}
      className={cn(
        "inline-block shrink-0",
        SIDE[size],
        m === "glass" &&
          "[filter:drop-shadow(0_0_2px_color-mix(in_oklab,var(--glass-rim-ink,white)_60%,transparent))]",
        className,
      )}
      {...props}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden
        className="size-full animate-spin [animation-duration:800ms] motion-reduce:animate-none"
      >
        <circle
          cx={8}
          cy={8}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          opacity={m === "glass" ? 0.28 : 0.18}
        />
        <circle
          cx={8}
          cy={8}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeDasharray={`${ARC} ${2 * Math.PI * R}`}
        />
      </svg>
    </span>
  )
}
