"use client"

// A COMMAND PALETTE: a dialog holding a field and the actions it finds. Typing filters
// them (lib/fuzzy, the one matcher every search here uses: letters in order, word
// starts and runs first, case and accents folded), the letters it matched lit; the
// best match leads and is lit, so Enter runs what you meant. The actions come in
// groups under headings, each with its glyph and the keys it stands for drawn on the
// right (menu's `Hints`), and a key drawn is a key it answers to while open, as a menu's
// is, unless the field owns it (`ownedHere`: a letter is typing, ⌘X cuts text).
//
//   <Command
//     open={open}
//     onOpenChange={setOpen}
//     groups={[{ heading: "clip", actions: [{ icon: <Scissors />, label: "cut here",
//       hint: "mod+x", onSelect: cut }] }]}
//   />
//
// The consumer opens it; it registers no page-wide key of its own. Keys: arrows walk
// the list (the field keeps focus, the lit row is its `aria-activedescendant`, Base
// UI's autocomplete), Enter runs the lit action, Esc first empties what is typed and
// then closes (the dialog's own Esc, a role the key router leaves alone). The action
// runs once the dialog has shut and given focus back, so one that opens something
// focusable keeps it. Two materials (`material`, or a MaterialProvider round it): the
// dialog's plain or glass face, its field and keys in the same.

import { Autocomplete } from "@base-ui/react/autocomplete"
import { Search as SearchIcon } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import { fuzzyFilter, type Range } from "@/lib/fuzzy"
import { pressed } from "@/lib/keys"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputGroup } from "@/components/ui/input"
import { ownedHere } from "@/components/ui/key-router"
import {
  type Material,
  type Scheme,
  useMaterial,
} from "@/components/ui/material"
import { Hints } from "@/components/ui/menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Highlight } from "@/components/ui/search"
import { usePlatform } from "@/components/ui/shortcut"

/** One thing the palette does. */
export interface CommandAction {
  /** What it does, as people say it: the text a query is matched against and drawn
   *  with the letters it lit. */
  label: string
  onSelect: () => void
  /** what it does, as a glyph */
  icon?: React.ReactNode
  /** The keys it stands for, as `shortcut` reads them ("mod+k", "shift+f10"), drawn
   *  on the right; several are alternatives. */
  hint?: string | readonly string[]
  /** other words that find it ("remove" for "move to trash") */
  keywords?: readonly string[]
  disabled?: boolean
  /** Unique within its group; the label unless two share one. */
  id?: string
}

/** Actions under one heading. */
export interface CommandGroup {
  heading: string
  actions: readonly CommandAction[]
}

/** An action as the list draws it: where it is from and what the query lit. */
interface Row {
  key: string
  action: CommandAction
  ranges: Range[]
}

// A type, not an interface: Base UI 1.8 types a group with an index signature,
// which an object type satisfies and an interface never does.
type Section = {
  heading: string
  items: Row[]
}

export interface CommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: readonly CommandGroup[]
  placeholder?: string
  /** What it is, for a screen reader: the dialog's title. */
  label?: string
  /** Said when nothing matches. */
  empty?: React.ReactNode
  /** Where it is portalled (a player's layer, so it shows in fullscreen). */
  container?: React.ComponentProps<typeof DialogContent>["container"]
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  className?: string
}

/** It stands high, where the eye already is, not in the middle of the page: the
 *  field stays put while the list under it grows and shrinks. */
const PLACE =
  "top-[min(15dvh,8rem)] translate-y-0 w-[min(36rem,calc(100vw-2rem))] gap-0 p-2"

const ROW =
  "flex scroll-my-1 cursor-default select-none items-center gap-3 px-2 py-2 text-[13px] text-current/85 outline-none data-disabled:opacity-45 data-highlighted:text-current"

const FACE: Record<Material, string> = {
  plain: "rounded-md data-highlighted:bg-foreground/8",
  glass: "rounded-[10px] data-highlighted:bg-current/12",
}

const hintsOf = (hint: CommandAction["hint"]): readonly string[] =>
  hint === undefined ? [] : typeof hint === "string" ? [hint] : hint

export function Command({
  open,
  onOpenChange,
  groups,
  placeholder = "type a command",
  label = "commands",
  empty = "nothing matches",
  container,
  material,
  scheme,
  className,
}: CommandProps) {
  const m = useMaterial(material)
  const platform = usePlatform()
  const [query, setQuery] = React.useState("")
  // The action picked runs once the dialog has shut and handed focus back (menu does
  // the same, for the same reason).
  const picked = React.useRef<(() => void) | null>(null)

  const sections = React.useMemo((): Section[] => {
    const all = groups.flatMap((g) =>
      g.actions.map((action) => ({ heading: g.heading, action })),
    )
    const seen = new Set<string>()
    for (const { heading, action } of all) {
      const key = `${heading}\u0000${action.id ?? action.label}`
      if (seen.has(key))
        throw new Error(
          `Command: two actions named "${action.id ?? action.label}" in "${heading}"; give one an id`,
        )
      seen.add(key)
    }
    const found = fuzzyFilter(all, query, ({ action }) => [
      action.label,
      ...(action.keywords ?? []),
    ])
    // Grouped in the order groups first appear: the groups' own order with nothing
    // typed, the best match's group first while typing.
    const out: Section[] = []
    for (const f of found) {
      const { heading, action } = f.item
      const at =
        out.find((s) => s.heading === heading) ??
        (out[out.push({ heading, items: [] }) - 1] as Section)
      at.items.push({
        key: `${heading}\u0000${action.id ?? action.label}`,
        action,
        ranges: f.ranges[0] ?? [],
      })
    }
    return out
  }, [groups, query])

  const run = (action: CommandAction) => {
    if (action.disabled) return
    picked.current = action.onSelect
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) return
        setQuery("")
        const action = picked.current
        picked.current = null
        action?.()
      }}
    >
      <DialogContent
        data-slot="command"
        container={container}
        material={m}
        scheme={scheme}
        className={cn(PLACE, className)}
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <Autocomplete.Root
          open
          inline
          autoHighlight="always"
          keepHighlight
          items={sections}
          filteredItems={sections}
          value={query}
          onValueChange={(value, details) => {
            // An action pressed runs; it never fills the field.
            if (details.reason !== "item-press") setQuery(value)
          }}
          itemToStringValue={(row: Row) => row.action.label}
        >
          <Autocomplete.Input
            data-slot="command-input"
            render={
              <InputGroup size="lg" start={<SearchIcon />} className="w-full" />
            }
            aria-label={label}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.stopPropagation()
                event.preventBaseUIHandler()
                setQuery("")
                return
              }
              // What the field edits with stays the field's (typing, ⌘X, ⌘⌫).
              if (ownedHere(event.nativeEvent)) return
              const action = groups
                .flatMap((g) => g.actions)
                .find(
                  (a) =>
                    !a.disabled &&
                    hintsOf(a.hint).some((h) => pressed(h, event, platform)),
                )
              if (!action) return
              event.preventDefault()
              event.preventBaseUIHandler()
              run(action)
            }}
          />
          <ScrollArea className="max-h-[min(22rem,50dvh)] pt-4 pb-4">
            <Autocomplete.Empty
              data-slot="command-empty"
              className="px-2 py-6 text-center text-[13px] text-current/50 empty:hidden"
            >
              {empty}
            </Autocomplete.Empty>
            <Autocomplete.List data-slot="command-list">
              {(section: Section) => (
                <Autocomplete.Group
                  key={section.heading}
                  items={section.items}
                  data-slot="command-group"
                  className="not-last:mb-2"
                >
                  <Autocomplete.GroupLabel className="px-2 pt-1 pb-1.5 font-mono text-[11px] text-current/45">
                    {section.heading}
                  </Autocomplete.GroupLabel>
                  <Autocomplete.Collection>
                    {(row: Row) => (
                      <Autocomplete.Item
                        key={row.key}
                        value={row}
                        disabled={row.action.disabled}
                        onClick={() => run(row.action)}
                        data-slot="command-item"
                        className={cn(ROW, FACE[m])}
                      >
                        <span
                          aria-hidden
                          className="grid size-4 shrink-0 place-items-center [&_svg]:size-3.5"
                        >
                          {row.action.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          <Highlight
                            text={row.action.label}
                            ranges={row.ranges}
                            className="text-current decoration-current/40"
                          />
                        </span>
                        {row.action.hint && (
                          <Hints hint={row.action.hint} className="ml-auto" />
                        )}
                      </Autocomplete.Item>
                    )}
                  </Autocomplete.Collection>
                </Autocomplete.Group>
              )}
            </Autocomplete.List>
          </ScrollArea>
        </Autocomplete.Root>
      </DialogContent>
    </Dialog>
  )
}
