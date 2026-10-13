"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"
import { type Material, useMaterial } from "@/components/ui/material"

// What a field is called: a real <label>, so a press on it focuses its field (or
// wrap the field in it). The field's own voice, one step quieter than what is typed,
// at the field's size; dimmed with a disabled field beside it (`peer`) or inside it.
// `material="glass"`: lettering on glass, catching the rim's light along its foot.

export type LabelProps = React.ComponentProps<"label"> & {
  material?: Material
}

export function Label({ material, className, ...props }: LabelProps) {
  const m = useMaterial(material)
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the consumer names its control (htmlFor) or wraps it
    <label
      data-slot="label"
      data-material={m}
      className={cn(
        "inline-flex items-center gap-2 font-medium text-[13px] leading-none select-none has-[:disabled]:opacity-50 peer-disabled:opacity-50",
        m === "glass"
          ? "text-current/90 [text-shadow:0_0.5px_0_color-mix(in_oklab,var(--glass-rim-ink,white)_40%,transparent)]"
          : "text-foreground/80",
        className,
      )}
      {...props}
    />
  )
}
