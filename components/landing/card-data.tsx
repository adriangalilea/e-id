"use client"

import { DataViewer } from "@/components/ui/data-view"
import type { Card } from "@/lib/card-schema"

/** A card as a program reads it (lib/card-schema), shown to be read
 *  (@ag/data-view, `show`): its fields and links, opened. */
export function CardData({ card }: { card: Card }) {
  return (
    <DataViewer
      value={card}
      name="card"
      depth={2}
      variant="show"
      className="h-full"
    />
  )
}
