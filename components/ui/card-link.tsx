"use client"

// A WHOLE CARD THAT OPENS SOMEWHERE, the way an embedded post on X opens the post: a
// click anywhere on it goes to `href`, and everything a reader would expect to keep
// working keeps working.
//
//   - Links, buttons, form controls and media controls inside do their own thing. A
//     video or a sound is a control only where it shows its controls: a cover that
//     plays on its own (a preview, a looping still) is part of the card and opens it.
//   - Selecting text is reading, not clicking: a click that ends a selection goes
//     nowhere.
//   - Nested cards: the innermost one wins (a quoted post opens the quoted post).
//   - External places open in a new tab, as every link inside the card does. A
//     place on the same site opens in the same tab, through the site's own router
//     when it gives one (`navigate`); ⌘ or Ctrl, or the middle button, opens it in
//     a new tab, as a link does.
//
// The card itself is NOT a tab stop and has no link role: a keyboard reaches the
// destination through a real <a> the card already carries (a date, a mark, a name).
// That is the contract: put one inside. A second tab stop for the same place, or an
// `<article role=link>` around other links, is what this refuses to be.

import type * as React from "react"
import { cn } from "@/lib/utils"

const INTERACTIVE =
  "a, button, input, select, textarea, label, summary, video[controls], audio[controls], [role=button], [contenteditable]"

export interface CardLinkProps extends React.ComponentProps<"div"> {
  href: string
  /** How the site goes to a place of its own (its router's push): default the
   *  browser's. Never asked for another site's. */
  navigate?: (href: string) => void
}

/** A place on this site: a path, or an address on this origin. */
function ownPlace(href: string): boolean {
  return new URL(href, window.location.href).origin === window.location.origin
}

export function CardLink({
  href,
  navigate,
  className,
  onClick,
  onAuxClick,
  children,
  ...props
}: CardLinkProps) {
  /** Whether a press landed on the card itself: not inside a nested card, not on
   *  what does its own thing, not the end of a text selection. */
  const ownPress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return false
    const target = e.target as HTMLElement
    if (target.closest("[data-card-link]") !== e.currentTarget) return false
    if (target.closest(INTERACTIVE)) return false
    return window.getSelection()?.isCollapsed !== false
  }
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
        if (!ownPress(e)) return
        if (!ownPlace(href) || e.metaKey || e.ctrlKey)
          window.open(href, "_blank", "noopener,noreferrer")
        else if (navigate) navigate(href)
        else window.location.assign(href)
      }}
      onAuxClick={(e) => {
        onAuxClick?.(e)
        if (e.button === 1 && ownPress(e))
          window.open(href, "_blank", "noopener,noreferrer")
      }}
    >
      {children}
    </div>
  )
}
