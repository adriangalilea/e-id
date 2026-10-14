"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { schemeOf } from "@/components/ui/material-glass"
import { Panel } from "@/components/ui/panel"

// The surface a quote stands on in `prose` and `feature`, and nothing else: the one
// part of `Quote` that asks the page a question (which material, which scheme), so
// it is the one part that runs on the client. The words, the mark and the
// arithmetic that sets them stay on the server, where `quote-card`'s rules run once.

/** ONE STEP UP FROM THE PAGE: an embed is a thing quoted INTO the article, and a
 *  surface is what says so: the same words flat on the page read as the author's
 *  own. Plain, a mix off the foreground rather than a theme token, so it is one step
 *  up on any ground without a variable to wire. Glass, a glass Panel, rounder. */
const PLAIN = "rounded-xl bg-foreground/4"

export function QuoteSurface({
  variant,
  material,
  scheme,
  className,
  style,
  children,
}: {
  variant: "prose" | "feature"
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const m = useMaterial(material)
  const [s, here] = useSurfaceScheme<HTMLElement>(scheme)
  // Glass is the one glass container's (Panel), its body, spill and edge.
  if (m === "glass")
    return (
      <Panel
        render={<figure />}
        ref={here}
        data-slot="quote"
        data-variant={variant}
        material="glass"
        scheme={s}
        radius="1rem"
        bodyClassName="block gap-0 p-0"
        className={className}
        style={style}
      >
        {children}
      </Panel>
    )
  return (
    <figure
      ref={here}
      data-slot="quote"
      data-variant={variant}
      data-material={m}
      className={cn(PLAIN, schemeOf(s), className)}
      style={style}
    >
      {children}
    </figure>
  )
}
