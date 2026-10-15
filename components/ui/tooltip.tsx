"use client"

// The tooltip: shadcn's, on Base UI, with what a control's tooltip needs on top. The
// parts are shadcn's, so a component written for shadcn (a sidebar) composes it as
// it always has:
//
//   <TooltipProvider>
//     <Tooltip>
//       <TooltipTrigger render={<button …/>} />
//       <TooltipContent side="right">Settings</TooltipContent>
//     </Tooltip>
//   </TooltipProvider>
//
// and two shorthands for the patterns this registry uses everywhere:
//
//   <Tip content="play" keys="space"><button …/></Tip>
//     on the control itself: its own name and shortcut drawn as keys, the way
//     players and editors label their buttons; fine on top of a picture.
//   <TooltipHint content="sideways: scrub and pinch; all: up and down too" />
//     an affordance (ⓘ) beside a label, for explaining a choice rather than a button.
//
// It waits a beat before opening and closes at once; once one has opened, neighbours
// open without waiting (TooltipProvider, or the default one each Tooltip makes); it
// never opens on touch (a tap is the control's). Two materials (`material`): plain,
// the page's popover colours; glass, the material's dark glass, a pill for a line,
// for controls that are glass themselves (a player's) or over a picture. Where we part
// from shadcn's defaults: no arrow (a short line beside its control needs no pointer),
// the page's popover colours rather than an inverted chip, `keys` drawn as keys, and
// `card` for content laid out as it comes.

import { Tooltip as Base } from "@base-ui/react/tooltip"
import type * as React from "react"
import { Kbd } from "@/components/ui/kbd"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import { usePortalTarget } from "@/components/ui/portal"
import { cn } from "@/lib/utils"

/** Shares the waiting between the tooltips inside it: after one opens, the next opens
 *  at once, so a row of controls reads as you move along it. */
export function TooltipProvider({
  delay = 500,
  closeDelay = 0,
  ...props
}: React.ComponentProps<typeof Base.Provider>) {
  return (
    <Base.Provider
      data-slot="tooltip-provider"
      delay={delay}
      closeDelay={closeDelay}
      {...props}
    />
  )
}

export function Tooltip(props: React.ComponentProps<typeof Base.Root>) {
  return <Base.Root data-slot="tooltip" {...props} />
}

/** The control. `render` makes any element the trigger (shadcn's Radix `asChild`);
 *  `delay` is ms the pointer rests before it opens. */
export function TooltipTrigger({
  delay = 200,
  closeDelay = 0,
  ...props
}: React.ComponentProps<typeof Base.Trigger>) {
  return (
    <Base.Trigger
      data-slot="tooltip-trigger"
      delay={delay}
      closeDelay={closeDelay}
      {...props}
    />
  )
}

export interface TooltipContentProps
  extends Omit<React.ComponentProps<typeof Base.Popup>, "children"> {
  children: React.ReactNode
  side?: React.ComponentProps<typeof Base.Positioner>["side"]
  align?: React.ComponentProps<typeof Base.Positioner>["align"]
  sideOffset?: number
  /** The keys that do the same, in any notation `kbd` reads (`space`, `J`, `⇧J`). */
  keys?: string
  /** A card rather than a line: the content laid out as it comes (a table of keys, a
   *  short legend), padded, as wide as it needs. */
  card?: boolean
  /** Where it is portalled (a player's layer, so it shows in fullscreen). */
  container?: React.ComponentProps<typeof Base.Portal>["container"]
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's, so
   *  a tooltip on a control over a picture (a player's, which says dark) is dark
   *  with it, and one on the page is the page's. */
  scheme?: Scheme
}

/** The plain face: the page's popover colours, a hairline and a soft shadow. */
const PLAIN_FACE =
  "rounded-md border border-border bg-popover text-popover-foreground shadow-md"

/** The glass face: the material's glass at a tooltip's blur, a pill for a line, soft
 *  corners for a card. */
const glassFace = (card: boolean) =>
  cn(
    glassVariants({ shape: "surface" }),
    // A line is one line tall (20 px and 4 px either side): its pill's radius 14 px.
    card
      ? "[--glass-radius:--theme(--radius-xl)]"
      : "px-2.5 [--glass-radius:14px]",
    "[--glass-blur:14px]",
  )

/** The tooltip itself: placement, the line or the card, the keys, in its material.
 *  What is inside it (its keys) wears the same material. */
export function TooltipContent({
  children,
  side = "top",
  align = "center",
  sideOffset = 8,
  keys,
  card = false,
  container,
  material,
  scheme,
  className,
  ref,
  ...props
}: TooltipContentProps) {
  const m = useMaterial(material)
  const target = usePortalTarget()
  // Over a picture it is read by the part of it under the tooltip.
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme, ref)
  return (
    <Base.Portal container={container ?? target}>
      <Base.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50"
      >
        <Base.Popup
          ref={here}
          data-slot="tooltip-content"
          data-material={m}
          className={cn(
            "text-pretty text-xs leading-5",
            card
              ? "block p-3"
              : // A name stays on one line; an explanation wraps at a reading width.
                "flex max-w-72 items-center gap-2 px-2 py-1",
            "origin-(--transform-origin) data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            schemeOf(s),
            m === "glass"
              ? [
                  glassFace(card),
                  "[--glass-moves:opacity_150ms_var(--ease-out),scale_150ms_var(--ease-out)]",
                ]
              : [
                  PLAIN_FACE,
                  "transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none",
                ],
            className,
          )}
          {...props}
        >
          <MaterialProvider material={m} scheme={s}>
            {card ? children : <span>{children}</span>}
            {keys && <Kbd keys={keys} className="text-[11px]" />}
          </MaterialProvider>
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  )
}

export interface TipProps
  extends Pick<
    TooltipContentProps,
    | "keys"
    | "side"
    | "align"
    | "card"
    | "container"
    | "className"
    | "material"
    | "scheme"
  > {
  /** What the control does, in a few words. */
  content: React.ReactNode
  /** ms the pointer rests before it opens: 200 on a control (passing over a row of
   *  buttons should not flash a line under each), less where the pointer came to
   *  read (a hint). */
  delay?: number
  /** The control: one element that takes a ref (a button, a link). */
  children: React.ReactElement
}

/** A control's tooltip in one line: its name, and its keys drawn as keys. */
export function Tip({ content, delay, children, ...content_ }: TipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} delay={delay} />
      <TooltipContent {...content_}>{content}</TooltipContent>
    </Tooltip>
  )
}

/** The affordance for explaining a choice: a small ⓘ that shows `content` on hover or
 *  focus. A button, so the keyboard reaches it and a screen reader names it. */
export function TooltipHint({
  content,
  label = "about this",
  side = "top",
  className,
  card,
  material,
}: {
  content: React.ReactNode
  /** The ⓘ's accessible name. */
  label?: string
  card?: boolean
  side?: TipProps["side"]
  className?: string
  /** The tooltip's material (the ⓘ itself is a glyph in the text's colour). */
  material?: Material
}) {
  return (
    // The pointer came to the ⓘ to read it: it opens almost at once.
    <Tip
      content={content}
      side={side}
      delay={80}
      card={card}
      material={material}
    >
      <button
        type="button"
        aria-label={label}
        data-slot="tooltip-hint"
        className={cn(
          "inline-grid size-4 shrink-0 cursor-help place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5",
          className,
        )}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle
            cx="8"
            cy="8"
            r="6.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M8 7.2v4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="8" cy="5" r="0.85" fill="currentColor" />
        </svg>
      </button>
    </Tip>
  )
}
