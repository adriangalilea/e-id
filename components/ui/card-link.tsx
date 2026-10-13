"use client"

// A WHOLE CARD THAT OPENS SOMEWHERE, the way an embedded post on X opens the post: a
// click anywhere on it goes to `href`, and everything a reader would expect to keep
// working keeps working.
//
//   - Links, buttons, form controls and media controls inside do their own thing.
//   - Selecting text is reading, not clicking: a click that ends a selection goes
//     nowhere.
//   - Nested cards: the innermost one wins (a quoted post opens the quoted post).
//   - External places open in a new tab, as every link inside the card does.
//
// The card itself is NOT a tab stop and has no link role: a keyboard reaches the
// destination through a real <a> the card already carries (a date, a mark, a name).
// That is the contract: put one inside. A second tab stop for the same place, or an
// `<article role=link>` around other links, is what this refuses to be.

import type * as React from "react"
import { cn } from "@/lib/utils"

const INTERACTIVE =
  "a, button, input, select, textarea, label, summary, video, audio, [role=button], [contenteditable]"

export interface CardLinkProps extends React.ComponentProps<"div"> {
  href: string
}

export function CardLink({
  href,
  className,
  onClick,
  children,
  ...props
}: CardLinkProps) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut over a card whose real link is inside it
    // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard's way is that inner link; a second stop would duplicate it
    <div
      // A user's own slot (`tweet`, `tweet-quote`) wins; the card is found by its own
      // attribute, so it never takes the name of what it wraps.
      data-slot="card-link"
      {...props}
      data-card-link={href}
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        const target = e.target as HTMLElement
        if (target.closest("[data-card-link]") !== e.currentTarget) return
        if (target.closest(INTERACTIVE)) return
        if (!window.getSelection()?.isCollapsed) return
        window.open(href, "_blank", "noopener,noreferrer")
      }}
    >
      {children}
    </div>
  )
}
