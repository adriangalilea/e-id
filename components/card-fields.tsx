"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"
import { EmojiDomain } from "@/components/brand"
import { ON_CARD } from "@/components/card-shape"
import { CountryFlag } from "@/components/country"
import { LazyCountryPickerPopover } from "@/components/ui/country-picker-lazy"
import { Input, InputGroup } from "@/components/ui/input"
import { type HandleState, handleState } from "@/db/actions"
import { toHandle } from "@/lib/card-draft"
import { getLinkIcon } from "@/lib/links"
import type { LinkPlatform } from "@/lib/platforms"
import { cn } from "@/lib/utils"

// WRITING ON A CARD: the fields an e-ID card is written on where it lies, worn as
// the card's own writing, each a value and its change and nothing else, so the
// same field writes the home's blank card (components/landing/hero-cards, into
// the browser's draft) and a profile's own (components/profile-card, into its
// form).

/** The registry's field (@ag/input, plain) at the card's size, worn as the card's
 *  own writing: at rest no well at all, only the words, or the label of what goes
 *  there in the card's own type (a blank card reads as a card, not a form). The
 *  well comes under the hand, while typing in it, and red when it is wrong, all
 *  the field's own. Its height in em of its text, its corner every corner on the
 *  card's (`ON_CARD`); its padding stays and is taken back outside, so the words
 *  stand in line with the rest of the card's and never move as the well comes. */
export const WELL_ON_CARD = cn(
  ON_CARD,
  "-mx-[0.3em] h-[1.5em] px-[0.3em] [&_input]:placeholder:text-foreground/60",
  // In the card's language, not a form's: no outline. Where it is written in,
  // the card clears its print, as an ID's print falls back round the holder's
  // data (id-card, `KNOCKOUT`): a patch of the card's own dark, feathered at its
  // edge, faint under the hand and full while typing. Only wrong does it wear
  // a rim, the field's own red.
  "bg-transparent shadow-none ring-transparent transition-[background-color,box-shadow] hover:ring-transparent has-[input:focus-visible]:ring-transparent",
  "hover:bg-[rgb(14_14_16/0.7)] hover:shadow-[0_0_0.35em_0.2em_rgb(14_14_16/0.7)]",
  "has-[input:focus-visible]:bg-[rgb(14_14_16/0.92)] has-[input:focus-visible]:shadow-[0_0_0.35em_0.2em_rgb(14_14_16/0.92)]",
)

/** A field on the card is no login: password managers keep their buttons and
 *  suggestions out of it (1Password's sat over the name). Each reads its own
 *  attribute; `autocomplete` alone is ignored by most of them. */
export const WRITTEN_HERE = {
  autoComplete: "off",
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
  "data-form-type": "other",
} as const

/** The name on the name's line, at the written name's size (id-card, `NAME`),
 *  across its row: sized to the row, never to what is typed (the page sizes
 *  fields to their content), so no letter of it is ever cut. */
export function NameOnCard({
  value,
  onChange,
  onBlur,
  invalid,
  label,
  ref,
}: {
  value: string
  onChange: (name: string) => void
  onBlur?: () => void
  invalid?: boolean
  /** What it asks for, read aloud and written in it while empty. */
  label: string
  ref?: React.Ref<HTMLInputElement>
}) {
  return (
    <Input
      ref={ref}
      aria-label={label}
      aria-invalid={invalid || undefined}
      placeholder={label}
      {...WRITTEN_HERE}
      spellCheck={false}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      material="plain"
      className={cn(
        WELL_ON_CARD,
        "text-(length:--card-name) w-full font-medium tracking-[-0.03em] [&_input]:[field-sizing:fixed]",
      )}
    />
  )
}

/** The address as the card writes it, the handle typed after its slash, as wide
 *  as what is typed (a monospace field is that many characters): only a
 *  username's characters are kept (`toHandle`). */
export function HandleOnCard({
  value,
  onChange,
  onBlur,
  onEnter,
  invalid,
  describedBy,
  label,
}: {
  value: string
  onChange: (handle: string) => void
  onBlur?: () => void
  onEnter?: () => void
  invalid?: boolean
  /** The id of what says how the handle stands. */
  describedBy?: string
  label: string
}) {
  return (
    <InputGroup
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      placeholder="you"
      {...WRITTEN_HERE}
      autoCapitalize="none"
      spellCheck={false}
      value={value}
      // As wide as the handle and one more character for the caret: a field
      // sized to its text alone scrolled it by a hair once the caret stood at
      // its end, and the first letter slid out of sight. Monospace, so a
      // character is exactly 1ch.
      style={{ width: `${Math.max(value.length, 3) + 1}ch` }}
      onChange={(e) => onChange(toHandle(e.target.value))}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter) {
          e.preventDefault()
          onEnter()
        }
      }}
      // At the card's size (cqw), the address's own type: the well fits what
      // is written, the domain before it.
      material="plain"
      className={cn(
        WELL_ON_CARD,
        "w-fit min-w-0 max-w-full text-[1em] [&_input]:flex-none [&_input]:[field-sizing:fixed] [&_svg]:h-[1cap] [&_svg]:w-auto",
      )}
      // The domain the handle continues: one address, one word.
      prefix={<EmojiDomain path="/" />}
    />
  )
}

/** The country on the card's head, its flag the picker's trigger (the picker
 *  fetched as the card is drawn, ready before it is pressed: @ag/country-picker,
 *  `LazyCountryPickerPopover`). Pressed while the picker is open, so the picker
 *  reads as come out of it. "XX" is none. */
export function CountryOnCard({
  code,
  onChange,
  label,
}: {
  code: string
  onChange: (code: string) => void
  label: string
}) {
  return (
    <LazyCountryPickerPopover
      value={code === "XX" ? undefined : code}
      onChange={(picked) => onChange(picked ?? "XX")}
      none="none"
      align="end"
    >
      <button
        type="button"
        aria-label={code === "XX" ? label : `${label}, ${code}`}
        className={cn(
          ON_CARD,
          "group/country -m-[1cqw] flex cursor-pointer items-center gap-[1.5cqw] p-[1cqw] font-mono transition-colors hover:bg-white/[0.08] data-[popup-open]:bg-white/[0.12]",
        )}
      >
        {/* Set, the code, as a finished card reads; a faint chevron either way,
            brighter under the hand: it opens. */}
        {code === "XX" ? "" : code}
        <CountryFlag country={code} className="text-(length:--card-flag)" />
        <ChevronDown
          aria-hidden
          className="-ml-[0.8cqw] size-[3cqw] text-foreground/35 transition-colors group-hover/country:text-foreground/70"
        />
      </button>
    </LazyCountryPickerPopover>
  )
}

/** The row the card's links stand in while it is written on (id-card, `Flair`):
 *  their marks at the card's icon size. */
export const LINKS_ON_CARD =
  "-mx-[1.1cqw] flex min-w-0 flex-wrap items-center gap-[0.6cqw] text-foreground/75 [&_svg]:size-[4.6cqw] [&_svg]:stroke-[1.4]"

/** One link's mark on a card being written on: a press that opens it. */
export const LINK_MARK = cn(
  ON_CARD,
  "p-[1.1cqw] transition-colors hover:bg-white/[0.08] hover:text-foreground data-[popup-open]:bg-white/[0.08] data-[popup-open]:text-foreground",
)

/** The platforms by name, each a press that picks it: what adding a link asks
 *  first. */
export function PlatformChoice({
  platforms,
  onPick,
}: {
  platforms: readonly LinkPlatform[]
  onPick: (platform: LinkPlatform) => void
}) {
  return (
    <div role="listbox" aria-label="add a link" className="flex flex-col">
      {platforms.map((platform) => (
        <button
          key={platform}
          type="button"
          role="option"
          aria-selected={false}
          onClick={() => onPick(platform)}
          className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-foreground/85 text-sm transition-colors hover:bg-foreground/8 hover:text-foreground [&_svg]:size-4 [&_svg]:stroke-[1.5]"
        >
          {getLinkIcon(platform)}
          {platform}
        </button>
      ))}
    </div>
  )
}

/** What the server says of a handle, for the handle it was asked about: a
 *  moment after the typing stops, and never an answer about an older one. */
export function useHandleState(handle: string) {
  const [answer, setAnswer] = useState<{
    handle: string
    state: HandleState
    why: string | null
  } | null>(null)
  useEffect(() => {
    if (!handle) return
    let live = true
    const wait = setTimeout(() => {
      void handleState(handle).then((a) => {
        if (live) setAnswer({ handle, ...a })
      })
    }, 250)
    return () => {
      live = false
      clearTimeout(wait)
    }
  }, [handle])
  return answer?.handle === handle ? answer : null
}
