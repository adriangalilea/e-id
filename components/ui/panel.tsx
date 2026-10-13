"use client"

import { useRender } from "@base-ui/react/use-render"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"

// A card: a surface that holds one thing, with what it is above it (`title`, and a
// line under it, `description`), something to do with it beside them (`action`) and
// what ends it below (`footer`). shadcn's Card, by another name: in this registry a
// name is a family (`card-gallery`, `card-link` are their own items), and an item
// called `card` would claim both as its parts. Where it parts from shadcn: the header,
// action and footer are props, not five components to assemble, because a card's
// head is always the same three things in the same places.
// Plain, the page's card surface with its hairline. `material="glass"` is a card of
// the material's glass, rounder, as glass is.
//
// A frame is drawn once. What draws a box of its own when it stands alone (a log, a
// trace) asks `useInFrame()` and draws none inside one: a panel, a tabs box, anything
// that says so with `<InFrame>`. A box inside a box was two edges, two corners and
// two grounds a few pixels apart; the default makes that impossible to write by
// accident, and the item's own `frame` prop still decides when given.

const Framed = React.createContext(false)

/** What it holds stands inside a frame already drawn: a box of its own is not. */
export function InFrame({ children }: { children: React.ReactNode }) {
  return <Framed.Provider value>{children}</Framed.Provider>
}

/** Whether a frame is already drawn round this point (a panel, a tabs box). */
export function useInFrame(): boolean {
  return React.useContext(Framed)
}

export type PanelProps = Omit<useRender.ComponentProps<"section">, "title"> & {
  /** What it holds, in a few words. */
  title?: React.ReactNode
  /** A line under the title. */
  description?: React.ReactNode
  /** Something to do with it, at the head's end (a button, a menu). */
  action?: React.ReactNode
  /** What ends it (its buttons, a note). */
  footer?: React.ReactNode
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's.
   *  Dark, everything inside reads in the dark scheme too. */
  scheme?: Scheme
}

export function Panel({
  title,
  description,
  action,
  footer,
  material,
  scheme,
  render,
  className,
  children,
  ref,
  ...props
}: PanelProps) {
  const m = useMaterial(material)
  const [s, here] = useSurfaceScheme<HTMLElement>(scheme, ref)
  const head = title || description || action
  return useRender({
    defaultTagName: "section",
    render,
    ref: here,
    props: {
      "data-slot": "panel",
      "data-material": m,
      className: cn(
        "flex flex-col gap-4 p-5",
        schemeOf(s),
        m === "glass"
          ? [
              glassVariants({ shape: "surface" }),
              "[--glass-radius:--theme(--radius-3xl)]",
            ]
          : "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      ),
      ...props,
      // What is inside stands on the panel, not on what is behind it: it wears the
      // panel's scheme, whatever decided it (a picture under the panel included).
      children: (
        <MaterialProvider scheme={s}>
          <InFrame>
            {head && (
              <header
                data-slot="panel-header"
                className="flex items-start justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
                  {title && (
                    <h3
                      data-slot="panel-title"
                      className="font-medium text-sm leading-tight"
                    >
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p
                      data-slot="panel-description"
                      className="text-pretty text-current/60 text-xs leading-5"
                    >
                      {description}
                    </p>
                  )}
                </div>
                {action && (
                  <div data-slot="panel-action" className="-my-1 shrink-0">
                    {action}
                  </div>
                )}
              </header>
            )}
            {children}
            {footer && (
              <footer
                data-slot="panel-footer"
                className="flex items-center gap-2 pt-1"
              >
                {footer}
              </footer>
            )}
          </InFrame>
        </MaterialProvider>
      ),
    },
  })
}
