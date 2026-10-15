"use client"

// A menu of verbs for whatever asked: a row's right click, its ⋯, ⇧F10, a selection's
// actions. Every entry carries its glyph and the press it stands for, drawn on the
// right, so the menu teaches the shortcut it replaces. Anchored to the element that
// asked, or to the point a right click was made at (a desktop's context menu). The
// same entries feed `selection-bar`: one list of verbs, shown as a menu or as a bar.
// A key a menu draws is a key it answers to: pressed while it is open, the verb runs
// (`verbFor` lets the set behind it answer the same keys while it is shut). Two
// materials (`material`): plain, the page's popover; glass, the material's glass, its
// rows lit in the text's own colour, its keys glass too. Its second shape, the
// dropdown a control owns (`DropdownMenu` and its parts), is at the foot.

import { Menu as Base } from "@base-ui/react/menu"
import { Check } from "lucide-react"
import * as React from "react"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import { usePortalTarget } from "@/components/ui/portal"
import { Shortcut, shortcut, usePlatform } from "@/components/ui/shortcut"
import { combo, type Platform, type Press, pressed } from "@/lib/keys"
import { cn } from "@/lib/utils"

/** A verb, or a line between groups. `hint` is the input it stands in for, written as
 *  `shortcut` reads it ("mod+click", "shift+f10"), drawn as keys and a pointer glyph;
 *  any other text is shown as it is. Several are alternatives, each drawn ("open":
 *  double-click, enter). */
export type MenuEntry =
  | {
      /** what it does, as a glyph: every entry has one, the eye finds the verb by it */
      icon: React.ReactNode
      label: React.ReactNode
      onSelect: () => void
      hint?: string | readonly string[]
      destructive?: boolean
      disabled?: boolean
    }
  | "separator"

/** The verb whose drawn keys are this press, if any: what a menu teaches, it also
 *  answers to, open or not. Pointer hints never match a key. */
export function verbFor(
  entries: readonly MenuEntry[],
  press: Press,
  platform: Platform,
): Exclude<MenuEntry, "separator"> | undefined {
  for (const entry of entries) {
    if (entry === "separator" || entry.disabled || !entry.hint) continue
    const hints = typeof entry.hint === "string" ? [entry.hint] : entry.hint
    if (hints.some((h) => pressed(h, press, platform))) return entry
  }
  return undefined
}

/** A verb's inputs, drawn small: keys and pointer glyphs, or the text as it is.
 *  `keysOnly` keeps the keyboard's alone, for a surface that is pressed and never
 *  double-clicked (a bar), where a pointer glyph would only read as a second icon. */
export function Hints({
  hint,
  keysOnly = false,
  className,
}: {
  hint: string | readonly string[]
  keysOnly?: boolean
  className?: string
}) {
  const all = (typeof hint === "string" ? [hint] : hint).filter(
    (h) => !keysOnly || combo(h) !== null,
  )
  if (all.length === 0) return null
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {all.map((h) =>
        shortcut(h) ? (
          <Shortcut key={h} input={h} size="sm" className="opacity-70" />
        ) : (
          <span key={h} className="text-[11px] text-current/45">
            {h}
          </span>
        ),
      )}
    </span>
  )
}

const ITEM =
  "flex cursor-default select-none items-center gap-4 px-2 py-1.5 text-[13px] text-current/85 outline-none data-[disabled]:opacity-45 data-[highlighted]:text-current"

/** Each material's popup, row and line between groups. Glass: the material's glass
 *  at a menu's blur, its rows lit in the text's own colour, so it reads on any tone;
 *  a destructive row lights in `tone-bad`. */
const FACE = {
  plain: {
    popup:
      "rounded-lg border border-border bg-popover text-popover-foreground shadow-md",
    item: "rounded-md data-[highlighted]:bg-foreground/8",
    bad: "data-[highlighted]:bg-foreground/8",
    line: "bg-foreground/10",
  },
  glass: {
    popup: "[--glass-radius:14px] [--glass-blur:14px]",
    item: "rounded-[10px] data-[highlighted]:bg-current/12",
    bad: "data-[highlighted]:bg-tone-bad/18",
    line: "bg-current/14",
  },
} as const

export function Menu({
  entries,
  anchor,
  onClose,
  returnTo,
  material,
  scheme,
}: {
  entries: readonly MenuEntry[]
  /** the element it opens from, or the point (client px) a right click was made at;
   *  null: closed */
  anchor: Element | { x: number; y: number } | null
  onClose: () => void
  /** where focus goes when it closes */
  returnTo?: () => HTMLElement | null
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
}) {
  const m = useMaterial(material)
  // Over a picture it is read by the part of it under the menu.
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme)
  const face = FACE[m]
  const point = anchor !== null && !(anchor instanceof Element) ? anchor : null
  const at = React.useMemo(
    () =>
      point && {
        getBoundingClientRect: () => new DOMRect(point.x, point.y, 0, 0),
      },
    [point],
  )
  // The entry picked runs once the menu has shut and handed focus back to the row: an
  // entry that opens something focusable (a dialog, a page) takes focus after that,
  // and nothing takes it back. Run on the click, the focus handed back landed after
  // the dialog had taken it, and a dialog that closes on focus out shut as it opened.
  const picked = React.useRef<(() => void) | null>(null)
  const platform = usePlatform()
  const target = usePortalTarget()
  return (
    <Base.Root
      modal={false}
      open={anchor !== null && entries.length > 0}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onOpenChangeComplete={(open) => {
        if (open) return
        const run = picked.current
        picked.current = null
        run?.()
      }}
    >
      <Base.Portal container={target}>
        <Base.Positioner
          anchor={at ?? (anchor as Element | null)}
          side="bottom"
          align={at ? "start" : "end"}
          sideOffset={2}
          className="z-50 outline-none"
        >
          <Base.Popup
            ref={here}
            data-slot="menu"
            finalFocus={returnTo}
            onKeyDown={(event) => {
              // A highlighted entry keeps Enter and Space for itself.
              if (
                (event.key === "Enter" || event.key === " ") &&
                (event.target as HTMLElement).getAttribute("role") ===
                  "menuitem"
              )
                return
              const verb = verbFor(entries, event, platform)
              if (!verb) return
              event.preventDefault()
              event.stopPropagation()
              picked.current = verb.onSelect
              onClose()
            }}
            data-material={m}
            className={cn(
              "min-w-44 p-1 outline-none",
              schemeOf(s),
              m === "glass" && glassVariants({ shape: "surface" }),
              face.popup,
            )}
          >
            <MaterialProvider material={m} scheme={s}>
              {entries.map((entry, i) =>
                entry === "separator" ? (
                  <Base.Separator
                    // biome-ignore lint/suspicious/noArrayIndexKey: entries are rebuilt per open, place is identity
                    key={i}
                    className={cn("mx-1.5 my-1 h-px", face.line)}
                  />
                ) : (
                  <Base.Item
                    // biome-ignore lint/suspicious/noArrayIndexKey: entries are rebuilt per open, place is identity
                    key={i}
                    disabled={entry.disabled}
                    onClick={() => {
                      picked.current = entry.onSelect
                    }}
                    className={cn(
                      ITEM,
                      face.item,
                      entry.destructive && [
                        "text-tone-bad data-[highlighted]:text-tone-bad",
                        face.bad,
                      ],
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="-mr-2 grid size-4 shrink-0 place-items-center [&_svg]:size-3.5"
                    >
                      {entry.icon}
                    </span>
                    {entry.label}
                    {entry.hint && (
                      <Hints hint={entry.hint} className="ml-auto" />
                    )}
                  </Base.Item>
                ),
              )}
            </MaterialProvider>
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  )
}

// ── THE DROPDOWN, the menu's second shape. A list of verbs (above) is data: whatever
// asked hands its entries over. A dropdown is a control's own: its trigger, and rows
// that may be choices (a speed, a language, an account), composed as parts the way
// shadcn's are:
//
//   <DropdownMenu>
//     <DropdownMenuTrigger render={<Button material="glass">sign in</Button>} />
//     <DropdownMenuContent material="glass">
//       <DropdownMenuItem onClick={…}>github</DropdownMenuItem>
//     </DropdownMenuContent>
//   </DropdownMenu>
//
// A row is a verb (`DropdownMenuItem`), a link (`DropdownMenuLinkItem`) or a choice.
// Base UI's menu underneath (keyboard, typeahead, focus given back, an outside press
// closes it), never modal: a scroll lock rewrites the body's padding and shifts any
// layout that reserves room with it. It opens at least as wide as its trigger, in the
// list's two faces, its rows reading the material from the content.

export function DropdownMenu(props: Omit<Base.Root.Props, "modal">) {
  return <Base.Root modal={false} {...props} />
}

/** The control that opens it; `render` makes any button the trigger. While open it
 *  carries `data-popup-open`. */
export const DropdownMenuTrigger = Base.Trigger

export function DropdownMenuContent({
  material,
  scheme,
  side = "bottom",
  align = "end",
  sideOffset = 6,
  container,
  className,
  children,
  ref,
  ...props
}: Base.Popup.Props &
  Pick<Base.Positioner.Props, "align" | "side" | "sideOffset"> &
  Pick<Base.Portal.Props, "container"> & {
    material?: Material
    /** The colour scheme it stands in (material): default the nearest provider's. */
    scheme?: Scheme
  }) {
  const m = useMaterial(material)
  const target = usePortalTarget()
  // Over a picture (a player's layer, in fullscreen) it is read by the part of it
  // under the menu; its rows wear what it reads.
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme, ref)
  return (
    <Base.Portal container={container ?? target}>
      <Base.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50 outline-none"
      >
        <Base.Popup
          ref={here}
          data-slot="dropdown-menu"
          data-material={m}
          className={cn(
            "min-w-(--anchor-width) p-1 outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            side === "top"
              ? "data-[starting-style]:translate-y-1"
              : "data-[starting-style]:-translate-y-1",
            schemeOf(s),
            m === "glass"
              ? [
                  glassVariants({ shape: "surface" }),
                  "[--glass-moves:opacity_150ms_var(--ease-out),translate_150ms_var(--ease-out)]",
                ]
              : "transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none",
            FACE[m].popup,
            className,
          )}
          {...props}
        >
          <MaterialProvider material={m} scheme={s}>
            {children}
          </MaterialProvider>
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  )
}

const ROW =
  "flex cursor-default select-none items-center gap-2 px-2 py-1.5 text-[13px] text-current/85 outline-none data-[disabled]:opacity-45 data-[highlighted]:text-current [&_svg]:size-3.5 [&_svg]:shrink-0"

export function DropdownMenuItem({
  destructive,
  className,
  ...props
}: Base.Item.Props & {
  /** A row that destroys: in `tone-bad`, lit red. */
  destructive?: boolean
}) {
  const face = FACE[useMaterial()]
  return (
    <Base.Item
      data-slot="dropdown-menu-item"
      className={cn(
        ROW,
        face.item,
        destructive && [
          "text-tone-bad data-[highlighted]:text-tone-bad",
          face.bad,
        ],
        className,
      )}
      {...props}
    />
  )
}

/** A row that is a link: it goes where its `href` says, as a link does (a new tab on
 *  ⌘ click, its address on hover); `render` takes a router's own (`<Link href />`).
 *  Followed, the menu shuts: a router's navigation keeps the page, and the menu with
 *  it. */
export function DropdownMenuLinkItem({
  className,
  closeOnClick = true,
  ...props
}: Base.LinkItem.Props) {
  const face = FACE[useMaterial()]
  return (
    <Base.LinkItem
      data-slot="dropdown-menu-link-item"
      closeOnClick={closeOnClick}
      className={cn(ROW, face.item, className)}
      {...props}
    />
  )
}

/** One choice among the rows: a radio group, its value the one checked. */
export const DropdownMenuRadioGroup = Base.RadioGroup

/** A row that is a choice: its words, and a check at its end while it is the one. */
export function DropdownMenuRadioItem({
  className,
  children,
  closeOnClick = true,
  ...props
}: Base.RadioItem.Props) {
  const face = FACE[useMaterial()]
  return (
    <Base.RadioItem
      data-slot="dropdown-menu-radio-item"
      closeOnClick={closeOnClick}
      className={cn(ROW, "justify-between gap-3", face.item, className)}
      {...props}
    >
      {children}
      <Base.RadioItemIndicator className="grid place-items-center">
        <Check aria-hidden />
      </Base.RadioItemIndicator>
    </Base.RadioItem>
  )
}

/** A quiet line above the rows (who is signed in), not a row itself. */
export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn(
        "truncate px-2 py-1.5 text-[11px] text-current/55",
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Base.Separator>) {
  const face = FACE[useMaterial()]
  return (
    <Base.Separator
      className={cn("mx-1.5 my-1 h-px", face.line, className)}
      {...props}
    />
  )
}
