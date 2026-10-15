"use client"

import { useSyncExternalStore } from "react"
import { Grain } from "@/components/ui/grain"

// THE HERO'S SHIMMER PARTED round a card come forward (@ag/grain, `part`): the
// pile's cards say which card the hand has brought forward (hero-cards,
// `partShimmer`) and the shimmer pushes its glitter out to that card's edge,
// crowding round it, and lets it flow back when the card settles.

type Part = { x: number; y: number; width: number; height: number } | null

let part: Part = null
const listeners = new Set<() => void>()

/** The shimmer parted round `card`, or whole again with none: the card's box in
 *  the shimmer's own, read once as it comes forward. */
export function partShimmer(card: Element | null) {
  const shimmer = document.querySelector("[data-slot=hero-shimmer]")
  if (!shimmer) return
  if (card) {
    const at = shimmer.getBoundingClientRect()
    const box = card.getBoundingClientRect()
    part = {
      x: box.left - at.left,
      y: box.top - at.top,
      width: box.width,
      height: box.height,
    }
  } else part = null
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The shimmer's glitter, parted where a card has come forward. */
export function PartedGrain(props: React.ComponentProps<typeof Grain>) {
  const parted = useSyncExternalStore(
    subscribe,
    () => part,
    () => null,
  )
  return <Grain {...props} part={parted} />
}
