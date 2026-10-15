"use client"

import { SmilePlus } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// REACTIONS UNDER A POST (GitHub, Slack, Telegram): each emoji given, how many gave
// it, and whether you did. A pill is a toggle (`Button` with `aria-pressed`): press
// it and you count, press again and you leave. `offer` adds a button that opens the
// emoji you may give (a `Popover`), each a toggle too, the popover closing on a
// choice. Controlled: the consumer holds the list and flips `mine` and the count in
// `onToggle`, before any answer, as a vote's score moves.
//
// With no `onToggle` it is a readout: the same pills as words, not buttons (a page
// that shows another site's reactions cannot send one, and a button would promise
// it could). A reaction nobody gave and you did not either is not shown.

export interface Reaction {
  emoji: string
  count: number
  /** You gave it. */
  mine: boolean
  /** Its name for a reader where the emoji's own is not what is meant ("ship it"). */
  label?: string
}

export interface ReactionsProps {
  reactions: readonly Reaction[]
  /** A press on a pill or on an offered emoji: flip yours. Absent, a readout. */
  onToggle?: (emoji: string) => void
  /** The emoji the add button offers; absent, no add button. */
  offer?: readonly string[]
  size?: "sm" | "md"
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  /** What they react to, for a reader: "reactions" unless given. */
  "aria-label"?: string
  className?: string
}

const said = (r: Reaction) =>
  `${r.label ?? r.emoji}, ${r.count} ${r.count === 1 ? "reaction" : "reactions"}`

export function Reactions({
  reactions,
  onToggle,
  offer,
  size = "sm",
  material,
  scheme,
  "aria-label": label = "reactions",
  className,
}: ReactionsProps) {
  for (const r of reactions)
    if (r.count < 0 || (r.mine && r.count < 1))
      throw new Error(
        `Reactions: ${r.emoji} counts ${r.count}${r.mine ? ", yours among them" : ""}`,
      )
  if (offer && !onToggle)
    throw new Error("Reactions: an offer with no onToggle cannot be given")
  const m = useMaterial(material)
  const [s, here] = useSurfaceScheme<HTMLFieldSetElement>(scheme)
  const [open, setOpen] = React.useState(false)
  const shown = reactions.filter((r) => r.count > 0)
  // Taking back a reaction nobody else gave takes its pill away with the focus it
  // holds: the focus goes on to the pill now in its place, else the last, else the
  // add button, once the list without it is drawn.
  const refocus = React.useRef<{ group: HTMLElement; at: number } | null>(null)
  React.useLayoutEffect(() => {
    const r = refocus.current
    if (!r) return
    refocus.current = null
    if (r.group.contains(document.activeElement)) return
    const stops = r.group.querySelectorAll<HTMLElement>(
      "[data-slot=reactions-pill], [data-slot=reactions-add]",
    )
    stops[Math.min(r.at, stops.length - 1)]?.focus()
  })
  const mine = new Set(reactions.filter((r) => r.mine).map((r) => r.emoji))
  const pill = size === "sm" ? "h-7 gap-1 px-2" : "h-8 gap-1.5 px-2.5"
  const glyph = size === "sm" ? "text-[14px]" : "text-[16px]"
  // Plain, a pill is GitHub's outline; glass stands on a picture, where an outline
  // (the rim alone, no body) leaves the count unread over a bright one: a quiet
  // glass with a body, and the add button the same.
  const glass = m === "glass"
  const pillVariant = glass ? "secondary" : "outline"
  const readout = glass
    ? cn(
        glassVariants({ shape: "surface" }),
        size === "sm" ? "[--glass-radius:14px]" : "[--glass-radius:16px]",
      )
    : "rounded-full bg-current/6"

  return (
    <MaterialProvider material={m} scheme={s}>
      <fieldset
        ref={here}
        aria-label={label}
        data-slot="reactions"
        data-material={m}
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-1.5",
          schemeOf(s),
          className,
        )}
      >
        {shown.map((r) =>
          onToggle ? (
            <Button
              key={r.emoji}
              variant={pillVariant}
              size={size}
              corners="pill"
              pressed={r.mine}
              aria-label={said(r)}
              data-slot="reactions-pill"
              onClick={(e) => {
                const group = e.currentTarget.closest("fieldset")
                if (r.mine && r.count === 1 && group)
                  refocus.current = { group, at: shown.indexOf(r) }
                onToggle(r.emoji)
              }}
              className={cn(pill, r.mine ? "text-current" : "text-current/75")}
            >
              <span aria-hidden className={glyph}>
                {r.emoji}
              </span>
              <span aria-hidden className="tabular-nums">
                {r.count}
              </span>
            </Button>
          ) : (
            <span
              key={r.emoji}
              data-slot="reactions-pill"
              className={cn(
                "inline-flex items-center font-medium text-current/75",
                readout,
                size === "sm" ? "text-xs" : "text-[13px]",
                pill,
              )}
            >
              <span aria-hidden className={glyph}>
                {r.emoji}
              </span>
              <span aria-hidden className="tabular-nums">
                {r.count}
              </span>
              <span className="sr-only">{said(r)}</span>
            </span>
          ),
        )}
        {offer && onToggle && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant={glass ? "secondary" : "ghost"}
                  size={size === "sm" ? "icon-sm" : "icon"}
                  corners="pill"
                  aria-label="add a reaction"
                  data-slot="reactions-add"
                  className="text-current/60 hover:text-current"
                />
              }
            >
              <SmilePlus aria-hidden />
            </PopoverTrigger>
            <PopoverContent
              side="top"
              aria-label="add a reaction"
              className="w-auto flex-row flex-wrap gap-0.5 p-1.5"
            >
              {offer.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="icon"
                  corners="pill"
                  pressed={mine.has(emoji)}
                  aria-label={emoji}
                  onClick={() => {
                    onToggle(emoji)
                    setOpen(false)
                  }}
                  className="text-[18px]"
                >
                  {emoji}
                </Button>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </fieldset>
    </MaterialProvider>
  )
}
