"use client"

import { createContext, use, useRef, useState } from "react"
import { flushSync } from "react-dom"
import type { CardEditor } from "@/components/card-editor"
import { CORNER, EDIT_CURSOR } from "@/components/card-shape"
import { type Holder, IdCard } from "@/components/id-card"
import { SubjectLight } from "@/components/light"
import { useChip } from "@/components/session/use-chip"
import { HoloLean, HoloLight } from "@/components/ui/holo"
import { cardToEdit } from "@/db/actions"
import type { CardEdit } from "@/lib/card-edit"
import { cn } from "@/lib/utils"

// A PROFILE'S CARD, and for its owner the way to change it: the card itself. Pressed
// (or "edit"), it lifts off the page to the upper middle, the page dimmed behind it,
// and is written on where it lies (components/card-editor). Who owns the page is
// known only in the browser (`useChip`), so the page stays static; their hidden
// links, and the editor itself, are fetched only when they reach for it.

/** The card's name across the lift: worn by whichever copy is shown, so a view
 *  transition carries it from the page to the middle and back. */
const LIFTED = "[view-transition-name:own-card]"

/** The way to edit one's own card, for what stands round it (the owner's
 *  actions); null for anyone else. */
const Own = createContext<{ open: () => void; opening: boolean } | null>(null)

export function useOwnCard() {
  return use(Own)
}

/** A change of the page's state carried by a view transition (none under reduced
 *  motion or where there are none), React drawing it inside (`flushSync`). */
function carried(change: () => void) {
  if (
    !document.startViewTransition ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return change()
  document.startViewTransition(() => flushSync(change))
}

/** What opening the card needs, both fetched before it lifts: the card as its
 *  owner writes it, and the editor to write it in. */
type Opened = { initial: CardEdit; Editor: typeof CardEditor }

function fetchOpened(): Promise<Opened> {
  return Promise.all([cardToEdit(), import("@/components/card-editor")]).then(
    ([initial, editor]) => ({ initial, Editor: editor.CardEditor }),
  )
}

export function ProfileCard({
  holder,
  children,
}: {
  holder: Holder
  /** What stands under the card (the bio, the owner's actions). */
  children: React.ReactNode
}) {
  const chip = useChip()
  const owner = chip?.u?.toLowerCase() === holder.username.toLowerCase()
  const [opened, setOpened] = useState<Opened | null>(null)
  const [opening, setOpening] = useState(false)
  // Read once the hand comes near, so the press finds it there.
  const read = useRef<Promise<Opened> | null>(null)
  const load = () => {
    read.current ??= fetchOpened()
    return read.current
  }
  const open = () => {
    if (opening || opened) return
    setOpening(true)
    load().then(
      (next) => {
        setOpening(false)
        carried(() => setOpened(next))
      },
      (error) => {
        setOpening(false)
        read.current = null
        throw error
      },
    )
  }
  const close = () => {
    read.current = null
    carried(() => setOpened(null))
  }
  return (
    <Own value={owner ? { open, opening } : null}>
      {/* The same card as the home's: the laminate, a solid body, leaning to the
          hand, only resting flat, as the page's subject. Lifted, its room is
          kept and it is not drawn: the card is in the middle. */}
      <HoloLight className={cn("relative", opened ? "invisible" : LIFTED)}>
        <SubjectLight />
        <HoloLean pose="flat" className="max-lg:[transform:none]">
          <IdCard
            holder={holder}
            holo="laminate"
            className="[--id-card-thickness:1]"
          />
        </HoloLean>
        {owner && (
          // For its owner the whole card is one press: taking it up to write on.
          // The pointer says so as a pen (`EDIT_CURSOR`); the "edit" button
          // under the card is the same press for whoever does not point.
          <button
            type="button"
            aria-label="edit your card"
            aria-busy={opening || undefined}
            onClick={open}
            onPointerEnter={() => void load()}
            onFocus={() => void load()}
            style={{ cursor: opening ? "progress" : EDIT_CURSOR }}
            className={cn(CORNER, "absolute inset-0 z-10 outline-offset-4")}
          />
        )}
      </HoloLight>
      {children}
      {opened && (
        <opened.Editor
          initial={opened.initial}
          image={holder.image}
          lifted={LIFTED}
          onClose={close}
        />
      )}
    </Own>
  )
}
