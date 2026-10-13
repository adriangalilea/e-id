"use client"

import { Search as SearchIcon, X } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import { fuzzy, type Range, segments } from "@/lib/fuzzy"
import { pressed } from "@/lib/keys"
import { InputGroup, type InputSize } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { useKeys } from "@/components/ui/key-router"

// SEARCH, drawn once: the field (`Search`: the input's well with a magnifier, a clear
// button once something is typed, Esc empties it, an optional key that focuses it from
// anywhere on the page) and the match drawn in a result (`Highlight`: the letters the
// query lit, from lib/fuzzy, which every search here matches with). A list filters
// itself with `fuzzyFilter` and draws each row's text through `Highlight`.

export interface SearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** what it searches, for a screen reader ("search tags") */
  label: string
  size?: InputSize
  /** a key that focuses it from anywhere on the page ("/", "mod+k") */
  shortcut?: string
  /** Enter: take the first result */
  onEnter?: () => void
  /** ↓ from the field: into the results */
  onDown?: () => void
  autoFocus?: boolean
  className?: string
  ref?: React.Ref<HTMLInputElement>
}

/** Whether a keydown is the shortcut ("/", "mod+k"), `mod` being ⌘ or ⌃ whichever
 *  the hand reached for; a lone character however the layout types it (a German "/"
 *  is ⇧7). */
const isShortcut = (e: KeyboardEvent, shortcut: string) =>
  pressed(shortcut, e, "mac") ||
  pressed(shortcut, e, "other") ||
  ([...shortcut].length === 1 &&
    e.key === shortcut &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey)

export function Search({
  value,
  onChange,
  placeholder = "search",
  label,
  size = "sm",
  shortcut,
  onEnter,
  onDown,
  autoFocus,
  className,
  ref,
}: SearchProps) {
  const own = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(ref, () => own.current as HTMLInputElement)
  // The shortcut, on the page's key router: typed into a field it is the field's
  // ("/" is a character there), while a ⌘ combination still reaches it. Its root is the
  // field, so a search inside an inert subtree (a picture of one) never takes it.
  useKeys(
    (e) => {
      if (!shortcut || !isShortcut(e, shortcut)) return false
      own.current?.focus()
      own.current?.select()
      return true
    },
    { enabled: !!shortcut, root: own },
  )
  return (
    <InputGroup
      ref={own}
      size={size}
      value={value}
      placeholder={placeholder}
      aria-label={label}
      spellCheck={false}
      autoComplete="off"
      autoFocus={autoFocus}
      className={className}
      start={<SearchIcon />}
      end={
        value ? (
          <button
            type="button"
            aria-label="clear"
            onClick={() => {
              onChange("")
              own.current?.focus()
            }}
            className="grid cursor-pointer place-items-center hover:text-foreground"
          >
            <X />
          </button>
        ) : shortcut ? (
          <Kbd keys={shortcut} />
        ) : undefined
      }
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && value) {
          e.stopPropagation()
          onChange("")
        }
        if (e.key === "Enter" && onEnter) {
          e.preventDefault()
          onEnter()
        }
        if (e.key === "ArrowDown" && onDown) {
          e.preventDefault()
          onDown()
        }
      }}
    />
  )
}

/** A text with the letters a match lit marked: by its ranges, or by a query matched
 *  here (lib/fuzzy). */
export function Highlight({
  text,
  ranges,
  query,
  className,
}: {
  text: string
  ranges?: readonly Range[]
  query?: string
  className?: string
}) {
  const lit = ranges ?? (query ? (fuzzy(query, text)?.ranges ?? []) : [])
  if (lit.length === 0) return text
  return (
    <>
      {segments(text, lit).map((s, i) =>
        s.hit ? (
          <mark
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
            key={i}
            className={cn(
              "rounded-[2px] bg-transparent font-semibold text-foreground underline decoration-foreground/40 underline-offset-2",
              className,
            )}
          >
            {s.text}
          </mark>
        ) : (
          s.text
        ),
      )}
    </>
  )
}
