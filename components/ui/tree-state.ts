"use client"

// THE TREE, HEADLESS: everything a tree knows and does except how it is drawn. The
// arithmetic is lib/tree-core (what is visible, filtered, where a key goes); this is
// its state over time: expansion (controlled or not, remembered as a setting says),
// lazy children and who is loading, the filter and the branches a person shut while
// it was on, selection (lib/selection, the way every set selects), the roving focus
// (the one row that is the tab stop), the window of rows mounted, rename in place, and
// the keys of the WAI-ARIA tree pattern. ui/tree draws a row grid on it; a list of
// another shape can draw on it too.

import * as React from "react"
import { fuzzy } from "@/lib/fuzzy"
import type { Setting } from "@/lib/remembered-core"
import {
  all,
  NONE,
  only,
  range,
  type Selection as SelectionState,
  toggle as toggleIn,
} from "@/lib/selection"
import {
  ancestors,
  branchIds,
  type Entry,
  filterTree,
  flatten,
  indexTree,
  type Nodelike,
  navigate,
  type Row,
  typeahead,
} from "@/lib/tree-core"
import { recall, remember } from "@/components/ui/remembered"

export type TreeSelection = "single" | "multi" | "none"

export interface TreeHandle {
  expandAll: () => void
  collapseAll: () => void
  /** move keyboard focus to a row, scrolling it into view */
  focus: (id: string) => void
}

export interface TreeOptions<N extends Nodelike<N>> {
  items: readonly N[]
  /** the row's text: searched, typed ahead to, renamed */
  label: (node: N) => string
  /** drawn faint (an offline disk), and so is everything under it */
  dimmed?: (node: N) => boolean
  /** cannot be selected, activated or renamed, nor can anything under it; still
   *  reachable by keys */
  disabled?: (node: N) => boolean

  expanded?: readonly string[]
  defaultExpanded?: readonly string[]
  onExpandedChange?: (expanded: string[]) => void
  /** the expansion kept as this setting keeps it (ui/remembered; uncontrolled only) */
  remembered?: Setting<readonly string[]>

  /** single (selection follows focus), multi (lib/selection: ⌘ toggles, ⇧ a range in
   *  row order, ⌘⇧ adds one, ⌘A all, Esc none), or none */
  selection?: TreeSelection
  selected?: readonly string[]
  defaultSelected?: readonly string[]
  onSelectedChange?: (selected: string[]) => void
  /** a click, or Enter */
  onActivate?: (node: N) => void

  /** children fetched on first expand; pair with isBranch, which says who has them */
  loadChildren?: (node: N) => Promise<readonly N[]>
  /** has (or can load) children. Default: a non-empty children list */
  isBranch?: (node: N) => boolean

  /** a search: matches and their ancestors stay, opened */
  filter?: string
  /** default: the query found in the label, fuzzily (lib/fuzzy) */
  match?: (node: N, query: string) => boolean

  /** rename in place: F2 (and what draws the tree, a double-click on the label) */
  onRename?: (node: N, name: string) => void
  /** a row's own keys, before the tree's; preventDefault to keep the tree out */
  onRowKeyDown?: (node: N, event: React.KeyboardEvent) => void

  /** px per row: every row is one height, so the window is arithmetic */
  rowHeight: number
}

/** Rows drawn before the scroller has been measured (the server's render). */
const FIRST_VIEW = 600
const OVERSCAN = 8

/** An id list, controlled when `value` is given, else its own state; `set` reports
 *  either way. */
function useIds(
  value: readonly string[] | undefined,
  initial: readonly string[],
  onChange?: (next: string[]) => void,
): [readonly string[], (next: string[]) => void] {
  const [own, setOwn] = React.useState(initial)
  const set = (next: string[]) => {
    if (value === undefined) setOwn(next)
    onChange?.(next)
  }
  return [value ?? own, set]
}

/** A tree's state and verbs (see the header). `keys` answers a press on the tree:
 *  `local` is asked after the row's own keys and the arrows, before the tree's own
 *  (Enter, Space, F2, ⌘A, Esc, type-ahead), and ends it by returning true. */
export function useTree<N extends Nodelike<N>>({
  items,
  label,
  dimmed,
  disabled,
  expanded: expandedProp,
  defaultExpanded = [],
  onExpandedChange,
  remembered,
  selection = "single",
  selected: selectedProp,
  defaultSelected = [],
  onSelectedChange,
  onActivate,
  loadChildren,
  isBranch,
  filter = "",
  match,
  onRename,
  onRowKeyDown,
  rowHeight: height,
}: TreeOptions<N>) {
  const scroller = React.useRef<HTMLDivElement>(null)

  // ── expansion, controlled or not, remembered as its setting says.
  const [expandedList, setExpandedIds] = useIds(
    expandedProp,
    defaultExpanded,
    onExpandedChange,
  )
  // Remembered by writing on every change a person makes and reading once after
  // mount (the server has no storage, and the first render must match it). Never an
  // effect that writes: it would store the default before the read had landed.
  const stored = remembered && !expandedProp ? remembered : null
  const setExpanded = (next: string[]) => {
    setExpandedIds(next)
    if (stored) remember(stored, next)
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only
  React.useEffect(() => {
    if (stored) setExpandedIds([...recall(stored)])
  }, [])

  // ── lazy children: what a loader brought, and who is loading.
  const [loaded, setLoaded] = React.useState<ReadonlyMap<string, readonly N[]>>(
    () => new Map(),
  )
  const [loading, setLoading] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const childrenOf = React.useCallback(
    (n: N) => n.children ?? loaded.get(n.id),
    [loaded],
  )
  const branchOf = React.useCallback(
    (n: N) => (isBranch ? isBranch(n) : (childrenOf(n)?.length ?? 0) > 0),
    [isBranch, childrenOf],
  )
  const index = React.useMemo(
    () => indexTree(items, childrenOf),
    [items, childrenOf],
  )

  // ── filter: matches and their ancestors stay, the ancestors open. A branch closed
  // by hand while filtering stays closed until the query changes.
  const query = filter.trim()
  const found = React.useMemo(() => {
    if (!query) return null
    const test = match
      ? (n: N) => match(n, query)
      : (n: N) => fuzzy(query, label(n)) !== null
    return filterTree(items, childrenOf, test)
  }, [items, childrenOf, query, match, label])
  const [shut, setShut] = React.useState<{
    query: string
    ids: ReadonlySet<string>
  }>({ query, ids: new Set() })
  if (shut.query !== query) setShut({ query, ids: new Set() })

  const expandedSet = React.useMemo(() => {
    const s = new Set(expandedList)
    if (found) for (const id of found.open) if (!shut.ids.has(id)) s.add(id)
    return s
  }, [expandedList, found, shut.ids])

  const rows = React.useMemo(
    () =>
      flatten(items, {
        expanded: expandedSet,
        children: childrenOf,
        branch: branchOf,
        keep: found?.keep,
      }),
    [items, expandedSet, childrenOf, branchOf, found],
  )
  const rowAt = React.useMemo(
    () => new Map(rows.map((r, i) => [r.id, i])),
    [rows],
  )

  // ── selection.
  const [selectedList, setSelected] = useIds(
    selectedProp,
    defaultSelected,
    onSelectedChange,
  )
  const selectedSet = React.useMemo(
    () => new Set(selection === "none" ? [] : selectedList),
    [selectedList, selection],
  )
  const anchor = React.useRef<string | null>(null)

  // ── the roving focus: the one row that is the tab stop.
  const [active, setActive] = React.useState<string | null>(null)
  const activeId =
    active !== null && rowAt.has(active)
      ? active
      : (selectedList.find((id) => rowAt.has(id)) ?? rows[0]?.id ?? null)
  const pendingFocus = React.useRef<string | null>(null)

  // ── the window.
  const [view, setView] = React.useState({ top: 0, height: FIRST_VIEW })
  React.useLayoutEffect(() => {
    const el = scroller.current as HTMLDivElement
    const measure = () =>
      setView({ top: el.scrollTop, height: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const onScroll = (e: React.UIEvent<HTMLElement>) =>
    setView({
      top: e.currentTarget.scrollTop,
      height: e.currentTarget.clientHeight,
    })

  React.useLayoutEffect(() => {
    const id = pendingFocus.current
    if (id === null) return
    pendingFocus.current = null
    const el = scroller.current?.querySelector<HTMLElement>(
      `[data-id="${CSS.escape(id)}"]`,
    )
    el?.focus({ preventScroll: true })
  })

  const [editing, setEditing] = React.useState<string | null>(null)

  // ── verbs.
  /** Fetch a lazy branch's children the first time it opens. */
  const load = (id: string) => {
    const n = (index.get(id) as { node: N }).node
    if (loadChildren && !childrenOf(n) && !loading.has(id)) {
      setLoading((s) => new Set(s).add(id))
      loadChildren(n)
        .then((kids) => setLoaded((m) => new Map(m).set(id, kids)))
        .finally(() =>
          setLoading((s) => {
            const next = new Set(s)
            next.delete(id)
            return next
          }),
        )
    }
  }
  /** Open branches: one gesture, one state change, whatever the count. */
  const open = (...ids: string[]) => {
    const next = ids.filter((id) => {
      const entry = index.get(id)
      return entry !== undefined && branchOf(entry.node)
    })
    setExpanded([...new Set([...expandedList, ...next])])
    if (next.some((id) => shut.ids.has(id)))
      setShut({
        query,
        ids: new Set([...shut.ids].filter((x) => !next.includes(x))),
      })
    for (const id of next) load(id)
  }
  const close = (id: string) => {
    setExpanded(expandedList.filter((x) => x !== id))
    if (found?.open.has(id)) setShut({ query, ids: new Set(shut.ids).add(id) })
  }
  const toggle = (id: string) => (expandedSet.has(id) ? close(id) : open(id))

  // A state a node has, its whole subtree has: what is under an offline disk is
  // offline too, so `disabled` and `dimmed` are asked of a node and its ancestors.
  const inherited = (own?: (n: N) => boolean) => (n: N) =>
    !!own &&
    (own(n) ||
      ancestors(index, n.id).some((a) => {
        const up = index.get(a)
        return up !== undefined && own(up.node)
      }))
  const isDisabled = inherited(disabled)
  const isDimmed = inherited(dimmed)

  const focusRow = (i: number) => {
    const row = rows[i]
    const el = scroller.current
    if (!row || !el) return
    const top = i * height
    if (top < el.scrollTop) el.scrollTop = top
    else if (top + height > el.scrollTop + el.clientHeight)
      el.scrollTop = top + height - el.clientHeight
    setActive(row.id)
    pendingFocus.current = row.id
  }

  // The set's order for the kernel (lib/selection): the rows shown, top to bottom,
  // that can be selected. A range runs in it, ⌘A takes it.
  const order = () => rows.filter((r) => !isDisabled(r.node)).map((r) => r.id)
  const current = (): SelectionState => ({
    ids: selectedSet,
    anchor: anchor.current ?? undefined,
  })
  const choose = (next: SelectionState) => {
    anchor.current = next.anchor ?? null
    setSelected([...next.ids])
  }
  /** A press or a key on a row, as every set selects (lib/selection): alone, ⌘ in or
   *  out, ⇧ a range from the last pressed (⌘⇧ adding it). Single selection: alone. */
  const select = (
    id: string,
    how: "replace" | "toggle" | "range",
    keep = false,
  ) => {
    if (selection === "none") return
    const entry = index.get(id)
    if (!entry || isDisabled(entry.node)) return
    choose(
      selection === "single" || how === "replace"
        ? only(id)
        : how === "toggle"
          ? toggleIn(current(), id)
          : range(order(), current(), id, keep),
    )
  }

  const activate = (n: N) => {
    if (isDisabled(n)) return
    if (onActivate) onActivate(n)
    else if (branchOf(n)) toggle(n.id)
  }

  const startRename = (n: N) => {
    if (onRename && !isDisabled(n)) setEditing(n.id)
  }
  const endRename = (n: N, name: string | null) => {
    setEditing(null)
    pendingFocus.current = n.id
    const next = name?.trim()
    if (next && next !== label(n)) onRename?.(n, next)
  }

  const handle: TreeHandle = {
    expandAll: () => setExpanded(branchIds(items, childrenOf)),
    collapseAll: () => setExpanded([]),
    focus: (id: string) => {
      const i = rowAt.get(id)
      if (i !== undefined) focusRow(i)
    },
  }

  // ── keys.
  const typed = React.useRef({ text: "", at: 0 })
  /** The tree's keys, for the row in focus; see the hook's comment for `local`. */
  const keys = (
    e: React.KeyboardEvent<HTMLElement>,
    local?: (e: React.KeyboardEvent<HTMLElement>, row: Row<N>) => boolean,
  ) => {
    const i = activeId === null ? -1 : (rowAt.get(activeId) ?? -1)
    const row = rows[i]
    if (row && onRowKeyDown) {
      onRowKeyDown(row.node, e)
      if (e.defaultPrevented) return
    }
    const mod = e.metaKey || e.ctrlKey || e.altKey
    const page = Math.max(1, Math.floor(view.height / height) - 1)
    const nav = mod ? null : navigate(rows, i, e.key, page)
    if (nav) {
      e.preventDefault()
      if ("focus" in nav) {
        const to = rows[nav.focus] as Row<N>
        focusRow(nav.focus)
        if (selection === "single") select(to.id, "replace")
        else if (selection === "multi" && e.shiftKey) select(to.id, "range")
      } else if ("expand" in nav) open(nav.expand)
      else if ("collapse" in nav) close(nav.collapse)
      else
        open(
          ...rows
            .filter((r) => r.parent === nav.expandSiblings && r.branch)
            .map((r) => r.id),
        )
      return
    }
    if (!row) return
    if (local?.(e, row)) return
    if (e.key === "Enter") {
      e.preventDefault()
      select(row.id, "replace")
      activate(row.node)
    } else if (e.key === " ") {
      e.preventDefault()
      select(row.id, selection === "multi" ? "toggle" : "replace")
    } else if (e.key === "F2") {
      e.preventDefault()
      startRename(row.node)
    } else if (
      selection === "multi" &&
      (e.metaKey || e.ctrlKey) &&
      e.key.toLowerCase() === "a"
    ) {
      e.preventDefault()
      choose(all(order(), current()))
    } else if (
      selection === "multi" &&
      e.key === "Escape" &&
      selectedSet.size > 0
    ) {
      e.preventDefault()
      choose({ ...NONE, anchor: anchor.current ?? undefined })
    } else if (e.key.length === 1 && !mod && /\S/.test(e.key)) {
      e.preventDefault()
      const now = e.timeStamp
      const t = typed.current
      t.text = now - t.at > 600 ? e.key : t.text + e.key
      t.at = now
      // One letter pressed again cycles through the rows starting with it.
      const same = [...t.text].every((c) => c === t.text[0])
      const q = same ? e.key : t.text
      const hit = typeahead(rows, same ? i : i - 1, q, label)
      if (hit >= 0) {
        focusRow(hit)
        if (selection === "single") select((rows[hit] as Row<N>).id, "replace")
      }
    }
  }

  // ── the rows mounted: the scroller's view and an overscan, and the focused row
  // wherever it is, so focus is never lost to a scroll.
  const first = Math.max(0, Math.floor(view.top / height) - OVERSCAN)
  const last = Math.min(
    rows.length - 1,
    Math.ceil((view.top + view.height) / height) + OVERSCAN,
  )
  const drawn: number[] = []
  for (let i = first; i <= last; i++) drawn.push(i)
  const activeAt = activeId === null ? undefined : rowAt.get(activeId)
  if (activeAt !== undefined && (activeAt < first || activeAt > last))
    drawn.push(activeAt)

  return {
    scroller,
    rows,
    rowAt,
    index: index as ReadonlyMap<string, Entry<N>>,
    childrenOf,
    branchOf,
    query,
    /** the filter's matches (their ancestors are shown but do not match) */
    matches: found?.matches ?? null,
    selection,
    selectedSet,
    activeId,
    setActive,
    loading,
    editing,
    drawn,
    onScroll,
    open,
    close,
    toggle,
    select,
    activate,
    focusRow,
    order,
    current,
    isDisabled,
    isDimmed,
    startRename,
    endRename,
    keys,
    handle,
  }
}

export type TreeState<N extends Nodelike<N>> = ReturnType<typeof useTree<N>>
