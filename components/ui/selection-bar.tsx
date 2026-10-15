"use client"

// THE SELECTION'S VERBS, AS A BAR: it rises at the foot of the set while anything is
// selected, says how many (and how many the filter hides, which the verbs leave
// alone), and offers the consumer's verbs for exactly those, the same `MenuEntry`
// list a right click on a selected item opens, so a verb has one definition and two
// faces. Clear (or Esc with focus in the bar) empties the selection. The bar is
// placed by its parent: the gallery and the table pin it to the foot of their own
// scroller; anything else positions it as it likes.
//
// ONE ROW, NEVER WRAPPED (priority+): the verbs keep the order they are given, which is
// their menu's and so their priority, and as many as the room holds stand in the bar;
// the rest are a "more" menu at its end, the same entries, their separators kept. The
// count and the clear always stand. What fits is measured, never guessed: a ruler
// lays every verb out on one line where nothing sees it, and the split is worked out
// again whenever the room or the verbs change.

import { Ellipsis, X } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Hints, Menu, type MenuEntry } from "@/components/ui/menu"
import { Tip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/** A rule between a bar's groups. */
export const BAR_RULE = "mx-1 h-4 w-px shrink-0 bg-foreground/12"
/** The bar's body: a floating strip at the foot of a set. Any other bar a set raises
 *  there (a table's unsaved changes) wears it, so the bars read as one family. */
export const BAR =
  "flex w-fit max-w-full flex-wrap items-center gap-0.5 rounded-xl border border-border bg-popover/95 p-1 text-popover-foreground shadow-lg backdrop-blur-md transition-[opacity,translate] duration-200 starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none"

/** Entries without a separator at either end or two in a row. */
const trimmed = (entries: readonly MenuEntry[]): MenuEntry[] =>
  entries.filter(
    (e, i, all) =>
      e !== "separator" ||
      (i > 0 && i < all.length - 1 && all[i - 1] !== "separator"),
  )
export interface SelectionBarProps {
  /** How many are selected and shown: what the verbs act on. */
  count: number
  /** How many more are selected but hidden by a filter: named, never acted on. */
  hidden?: number
  /** The verbs for the selection, the same list its right-click menu shows. */
  entries: readonly MenuEntry[]
  onClear: () => void
  /** What one of the set is called, plural taken by adding s ("file", "row"). */
  noun?: string
  className?: string
}

export function SelectionBar({
  count,
  hidden = 0,
  entries,
  onClear,
  noun = "item",
  className,
}: SelectionBarProps) {
  const bar = React.useRef<HTMLDivElement>(null)
  const ruler = React.useRef<HTMLDivElement>(null)
  // How many of the entries stand in the bar; the rest are the more menu's.
  const [standing, setStanding] = React.useState(entries.length)
  const [more, setMore] = React.useState<Element | null>(null)
  React.useLayoutEffect(() => {
    const el = bar.current
    const r = ruler.current
    const room = el?.parentElement
    if (!el || !r || !room) return
    const fit = () => {
      // The ruler is the bar on one line: its parts' right edges, from its own left.
      const end = (part: string) => {
        const p = r.querySelector<HTMLElement>(`[data-part="${part}"]`)
        if (!p) throw new Error(`selection-bar: the ruler has no ${part}`)
        return p.offsetLeft + p.offsetWidth
      }
      const tail = (part: string) =>
        (r.querySelector<HTMLElement>(`[data-part="${part}"]`)?.offsetWidth ??
          0) + 2
      // The bar's own frame: its border, and its right padding (the ruler's edges count
      // its left, p-1 as the bar's).
      const frame = el.offsetWidth - el.clientWidth + 4
      const avail = room.clientWidth - frame
      const all = end(`entry-${entries.length - 1}`)
      if (entries.length === 0 || all + tail("clear") <= avail) {
        setStanding(entries.length)
        return
      }
      let n = 0
      for (let i = 0; i < entries.length; i++)
        if (end(`entry-${i}`) + tail("more") + tail("clear") <= avail) n = i + 1
      setStanding(n)
    }
    fit()
    const watch = new ResizeObserver(fit)
    watch.observe(room)
    watch.observe(r)
    return () => watch.disconnect()
  }, [entries.length])
  const shown = trimmed(entries.slice(0, standing))
  const rest = trimmed(entries.slice(standing))
  const verbs = (list: readonly MenuEntry[], ruling: boolean) =>
    list.map((entry, i) =>
      entry === "separator" ? (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: entries are rebuilt per render, place is identity
          key={i}
          aria-hidden="true"
          data-part={ruling ? `entry-${i}` : undefined}
          className={BAR_RULE}
        />
      ) : (
        <BarVerb
          // biome-ignore lint/suspicious/noArrayIndexKey: entries are rebuilt per render, place is identity
          key={i}
          entry={entry}
          part={ruling ? `entry-${i}` : undefined}
        />
      ),
    )
  const countLabel = (
    <span
      data-slot="selection-bar-count"
      className="shrink-0 whitespace-nowrap px-2 text-[13px] font-medium tabular-nums"
    >
      {count} {noun}
      {count === 1 ? "" : "s"} selected
      {hidden > 0 && (
        <span className="font-normal text-foreground/50">
          {" "}
          · {hidden} hidden by the filter
        </span>
      )}
    </span>
  )
  return (
    <div
      ref={bar}
      role="toolbar"
      aria-label="selection"
      data-slot="selection-bar"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        event.preventDefault()
        onClear()
      }}
      className={cn(BAR, "relative flex-nowrap", className)}
    >
      {/* The ruler: every verb on one line, in a box of no size, never seen or reached. */}
      <div aria-hidden="true" inert className="absolute size-0 overflow-hidden">
        <div ref={ruler} className="flex w-max items-center gap-0.5 p-1">
          {countLabel}
          {entries.length > 0 && <span className={BAR_RULE} />}
          {verbs(entries, true)}
          <span data-part="more" className="flex items-center gap-0.5">
            <span className={BAR_RULE} />
            <span className="size-7" />
          </span>
          <span data-part="clear" className="flex items-center gap-0.5">
            <span className={BAR_RULE} />
            <span className="size-7" />
          </span>
        </div>
      </div>
      {countLabel}
      {shown.length > 0 && <span aria-hidden="true" className={BAR_RULE} />}
      {verbs(shown, false)}
      {rest.length > 0 && (
        <>
          <span aria-hidden="true" className={BAR_RULE} />
          <Tip content="more">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="more"
              aria-haspopup="menu"
              onClick={(e) => setMore(more ? null : e.currentTarget)}
              data-popup-open={more ? "" : undefined}
              className="text-foreground/70 hover:text-foreground data-popup-open:bg-foreground/10"
            >
              <Ellipsis />
            </Button>
          </Tip>
          <Menu entries={rest} anchor={more} onClose={() => setMore(null)} />
        </>
      )}
      <span aria-hidden="true" className={BAR_RULE} />
      <Tip content={<>clear the selection</>} keys="escape">
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="clear the selection"
          onClick={onClear}
          className="text-foreground/55 hover:text-foreground"
        >
          <X />
        </Button>
      </Tip>
    </div>
  )
}

/** A verb, its keyboard keys drawn after its name as faded caps, so the bar teaches
 *  them too without a glyph that reads as a second icon. */
export function BarVerb({
  entry,
  part,
}: {
  entry: Exclude<MenuEntry, "separator">
  /** the ruler's name for it (selection-bar's measure) */
  part?: string
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={entry.disabled}
      onClick={entry.onSelect}
      data-part={part}
      className={cn(
        "shrink-0 whitespace-nowrap px-2 text-[13px] font-normal [&_svg]:size-3.5",
        entry.destructive
          ? "text-tone-bad hover:text-tone-bad"
          : "text-foreground/80 hover:text-foreground",
      )}
    >
      <span aria-hidden="true" className="grid size-4 place-items-center">
        {entry.icon}
      </span>
      {entry.label}
      {entry.hint && (
        <Hints hint={entry.hint} keysOnly className="ml-1.5 opacity-60" />
      )}
    </Button>
  )
}
