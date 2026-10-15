"use client"

// A TREE: files and places, a layers panel, a tag hierarchy, one component. The
// arithmetic is lib/tree-core (what is visible, filtered, counted, moved), the state
// over time ui/tree-state (`useTree`: expansion, selection, focus, the window, the
// keys); this file is the drawing and the hands.
//
// ONE GRID, every row: depth indent, a fixed chevron gutter (empty on a leaf, never
// absent), the icon column, the label, then the trailing meta. A level of depth is
// exactly the gutter plus its gap, so a child's chevron sits under its parent's icon
// and every row at one depth starts at one x. The numbers live in GRID below and reach
// the CSS as custom properties; nothing is measured.
//
// THE LIST IS FLAT AND WINDOWED: the visible tree is flattened into rows of one fixed
// height (the density's), absolutely placed, and only the rows in the scroller's view
// (plus an overscan) are mounted, so ten thousand rows cost what forty do. The focused
// row is always mounted, wherever it is, so focus is never lost to a scroll. The tree
// is role=tree over treeitems carrying aria-level/setsize/posinset (the flat form the
// pattern allows), with a roving tabindex: Tab enters at one row, arrows move.
//
// FOCUS IS SHOWN TO THE KEYBOARD ONLY: the ring is tokens' `:focus-visible` (with
// focus-source mounted, never on what a press focused), drawn just inside the row so
// the scroller cannot clip it. A click never rings a row.
//
// A LAYER adds a column at the row's end and what pressing it means: `layer`, a
// factory the tree hands its rows to each render (tree-marks' include and exclude
// marks, and their lens, are one). The tree knows a layer's column, its row press
// (a filter rail whose rows ARE its marks), its keys, its menu verbs, the word the
// row reads as (`TreeRowState.mark`) and its data on the row; nothing of what a mark
// means. RIGHT-CLICK, the ⋯ that appears on hover or focus, the context-menu key or
// ⇧F10 open the row's menu, anchored to the row: the layer's verbs, then `rowMenu`'s.

import { ChevronRight, Ellipsis, LoaderCircle } from "lucide-react"
import * as React from "react"
import { ownedHere } from "@/components/ui/key-router"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import { Menu, type MenuEntry } from "@/components/ui/menu"
import { Highlight } from "@/components/ui/search"
import {
  type TreeHandle,
  type TreeOptions,
  type TreeSelection,
  useTree,
} from "@/components/ui/tree-state"
import { actsOn } from "@/lib/selection"
import {
  ancestors,
  canMove,
  type Drop,
  type Entry,
  type Nodelike,
  type Row,
} from "@/lib/tree-core"
import { cn } from "@/lib/utils"
import "./edge-fade"

export type { TreeHandle, TreeSelection }
export type TreeDensity = "compact" | "comfortable"

/** What a slot (icon, meta, actions) knows about the row it draws in. */
export interface TreeRowState {
  depth: number
  branch: boolean
  expanded: boolean
  selected: boolean
  loading: boolean
  /** the row matched the filter (its ancestors are shown but do not match) */
  match: boolean
  /** what the row reads as in the tree's layer (tree-marks: "include", "exclude",
   *  "mixed"), null without one or unmarked */
  mark: string | null
}

/** What a layer is told of the tree each render: its rows and how to reach a node. */
export interface TreeApi<N extends Nodelike<N>> {
  items: readonly N[]
  rows: readonly Row<N>[]
  rowAt: ReadonlyMap<string, number>
  index: ReadonlyMap<string, Entry<N>>
  childrenOf: (node: N) => readonly N[] | undefined
  isDisabled: (node: N) => boolean
  setActive: (id: string) => void
}

/** A column at the row's end and what pressing it means (see the header): what
 *  `layer` makes of the tree's rows each render. */
export interface TreeLayer<N extends Nodelike<N>> {
  /** a press on the row is the layer's (a filter rail whose rows are its marks), not
   *  selection's: a click, Enter */
  pressRows: boolean
  /** the word the row reads as in the layer, handed to the slots as `mark` */
  stateOf: (id: string) => string | null
  /** data attributes on the row, for a consumer's styling (`data-mark`) */
  rowData: (id: string) => Record<string, string | undefined>
  /** classes on the label (an excluded row struck through) */
  labelClass?: string
  /** the column at the row's end, or null for a row without one */
  column: (node: N, text: string) => React.ReactNode
  /** a press on the row (with `pressRows`) or on its column, modifiers and all */
  press: (e: React.MouseEvent | React.KeyboardEvent, node: N) => void
  /** a key the layer answers on the focused row (Space, + and −): true takes it */
  key: (e: React.KeyboardEvent, node: N) => boolean
  /** its verbs, first in the row's menu; absent, it adds none (and alone opens no
   *  menu) */
  menu?: (node: N, state: TreeRowState) => MenuEntry[]
}

export interface TreeProps<N extends Nodelike<N>>
  extends Omit<TreeOptions<N>, "rowHeight"> {
  /** the label column drawn as something richer than its text (a chip, a name and a
   *  badge); `label` stays the text searched, typed to and named */
  content?: (node: N, state: TreeRowState) => React.ReactNode
  /** the icon column; leave it out and the tree has none */
  icon?: (node: N, state: TreeRowState) => React.ReactNode
  /** trailing meta: a count, a badge, "offline · 4". Strings and numbers are set in
   *  the meta voice. */
  meta?: (node: N, state: TreeRowState) => React.ReactNode
  /** hover actions (TreeAction buttons); one marked `pinned` stays visible */
  actions?: (node: N, state: TreeRowState) => React.ReactNode

  /** a column at the row's end and what pressing it means, made of the rows each
   *  render (the gallery's include and exclude marks are one, `useTreeMarks`) */
  layer?: (tree: TreeApi<N>) => TreeLayer<N>
  /** trailing columns kept empty on a tree that has none, so its meta lines up
   *  with trees beside it that have them (one rail, one column system): `mark` the
   *  layer's column, `more` the ⋯ */
  reserve?: readonly ("mark" | "more")[]
  /** the row's menu after the layer's verbs: right-click, the ⋯, ⇧F10. `ids` is what
   *  its verbs act on: the selection, in row order, when the row is in it, else the
   *  row alone (lib/selection's `actsOn`, as every set's menu) */
  rowMenu?: (
    node: N,
    state: TreeRowState,
    ids: readonly string[],
  ) => MenuEntry[]

  /** drag to reorder and reparent; apply it with lib/tree-core's moveNodes */
  onMove?: (ids: string[], target: string, drop: Drop) => void
  /** narrow where a drag may land (only groups take children, say) */
  canDrop?: (ids: readonly string[], target: N, drop: Drop) => boolean
  /** whether a row takes a dropped row inside it, the middle half of the row being
   *  "inside": by default a branch does and a leaf does not (a file is no folder);
   *  a tag tree says every tag can become a parent */
  nestable?: (node: N) => boolean
  /** before the row menu opens; preventDefault to keep it (and draw your own) */
  onContextMenu?: (node: N, event: React.MouseEvent) => void

  density?: TreeDensity
  /** a hairline down each open level */
  guides?: boolean
  /** plain, rows lit in the foreground's tiers; glass, the chosen row a pane of the
   *  material's glass */
  material?: Material
  /** the colour scheme it stands in (material): default the nearest provider's;
   *  dark over a picture, its words and its chosen row's glass with it */
  scheme?: Scheme
  "aria-label"?: string
  className?: string
  ref?: React.Ref<TreeHandle>
}

/** The grid, in px. A level of depth is the gutter and its gap, so a child's chevron
 *  sits exactly under its parent's icon. */
const GRID = {
  /** the row's own left padding, inside its hover fill */
  pad: 6,
  /** the chevron column, present on every row */
  gutter: 16,
  /** between the chevron and the icon */
  gap: 2,
  rows: { compact: 24, comfortable: 32 } satisfies Record<TreeDensity, number>,
}
const STEP = GRID.gutter + GRID.gap
/** The tree's own parts, whose keys it answers itself (focus walks its rows). */
const TREE_ROLES = ["tree", "treeitem", "group"]
/** How long a hovered, closed branch waits before a drag opens it. */
const SPRING_MS = 600

const ROW =
  "group/row absolute inset-x-1 top-0 flex h-(--ag-tree-row) translate-y-(--ag-tree-y) cursor-default select-none items-center pr-2 pl-(--ag-tree-indent) text-foreground/80 focus-visible:-outline-offset-2 aria-selected:text-foreground data-dimmed:text-foreground/40 aria-disabled:hover:bg-transparent"
/** Plain: rows lit in the foreground's tiers. Glass: the chosen row is glass (its
 *  pane comes from the material), the others lit under the hand only. */
const ROW_FACE: Record<Material, string> = {
  plain: "rounded-md hover:bg-foreground/5 aria-selected:bg-foreground/10",
  glass:
    "rounded-(--glass-radius) [--glass-radius:10px] hover:not-aria-selected:bg-foreground/8",
}
const META =
  "shrink-0 font-mono text-[11px] text-foreground/45 tabular-nums group-data-dimmed/row:text-foreground/35"
/** The icon column. A glyph placed straight in it (a folder, a file, a disk) is
 *  sized here and dimmed as a whole (its opacity), never by a translucent colour: its
 *  strokes would each be painted at that alpha and double where they cross. A mark that
 *  brings its own size and colour in a wrapper of its own (a tag's, gallery-tag: its
 *  icon in its hue, a face) is its own, and the rule reaches only the glyph that is
 *  the column's child: a coloured mark dimmed to half was a mark that could not be read. */
const ICON_COL =
  "ml-0.5 grid size-4 shrink-0 place-items-center text-foreground [&>svg]:size-3.5 [&>svg]:opacity-55 group-aria-selected/row:[&>svg]:opacity-80 group-data-dimmed/row:[&>svg]:opacity-35 group-data-dimmed/row:[&>:not(svg)]:opacity-45"

/** A hover action on a row (visibility, lock). Never a tab stop: the row is the stop,
 *  and the row's own keys (onRowKeyDown) are the keyboard's way to the same verb. */
export function TreeAction({
  label,
  pinned,
  onClick,
  children,
  className,
}: {
  label: string
  /** stays visible off hover: a hidden layer's closed eye */
  pinned?: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      data-slot="tree-action"
      data-pinned={pinned || undefined}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn(
        "grid size-5 place-items-center rounded-sm text-foreground hover:bg-foreground/10 [&_svg]:size-3.5 [&_svg]:opacity-45 hover:[&_svg]:opacity-100",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Tree<N extends Nodelike<N>>({
  content,
  icon,
  meta,
  actions,
  layer,
  reserve = [],
  rowMenu,
  onMove,
  canDrop,
  nestable,
  onContextMenu,
  density = "compact",
  guides = false,
  material,
  scheme,
  "aria-label": ariaLabel,
  className,
  ref,
  ...options
}: TreeProps<N>) {
  const mat = useMaterial(material)
  const height = GRID.rows[density]
  const { items, label, onRename, onActivate } = options
  const t = useTree({ ...options, rowHeight: height })
  const { rows, rowAt, index, scroller, selectedSet, activeId, setActive } = t
  // Over a picture it is read by the part of it under the tree; its row menu wears
  // what it reads.
  const [sch, here] = useSurfaceScheme(scheme, scroller)
  React.useImperativeHandle(ref, () => t.handle)

  // The layer, made of the rows as they stand this render.
  const lay = layer?.({
    items,
    rows,
    rowAt,
    index,
    childrenOf: t.childrenOf,
    isDisabled: t.isDisabled,
    setActive,
  })

  const [drag, setDrag] = React.useState<string[] | null>(null)
  const [drop, setDrop] = React.useState<{ id: string; at: Drop } | null>(null)
  const spring = React.useRef<{ id: string; timer: number } | null>(null)

  // ── the row menu: one popup for the tree, anchored to whichever row asked.
  const [menu, setMenu] = React.useState<{
    id: string
    anchor: Element
  } | null>(null)
  const rowEl = (id: string) =>
    scroller.current?.querySelector<HTMLElement>(
      `[data-id="${CSS.escape(id)}"]`,
    ) ?? null
  const entriesFor = (n: N, state: TreeRowState): MenuEntry[] => {
    const own = lay?.menu && !t.isDisabled(n) ? lay.menu(n, state) : []
    const more = rowMenu?.(n, state, actsOn(t.order(), t.current(), n.id)) ?? []
    return own.length && more.length
      ? [...own, "separator", ...more]
      : [...own, ...more]
  }
  const hasMenu = !!lay?.menu || !!rowMenu
  const openMenu = (id: string, anchor: Element) => {
    setActive(id)
    setMenu({ id, anchor })
  }

  // ── keys: the row's own, the arrows, then the menu's and the layer's, then the
  // tree's own (ui/tree-state).
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // A rename in progress, a field, a row's own control (an action's button) and a
    // press from a portal (the row menu) keep their keys (key-router's `ownedHere`).
    if (t.editing !== null || !e.currentTarget.contains(e.target as Node))
      return
    if (ownedHere(e.nativeEvent, e.currentTarget, TREE_ROLES)) return
    t.keys(e, (e, row) => {
      if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
        e.preventDefault()
        const el = rowEl(row.id)
        if (hasMenu && el) openMenu(row.id, el)
        return true
      }
      if (!lay) return false
      if (e.key === "Enter" && lay.pressRows) {
        e.preventDefault()
        lay.press(e, row.node)
        return true
      }
      return lay.key(e, row.node)
    })
  }

  // ── drag.
  const dropAt = (
    e: React.DragEvent<HTMLElement>,
    i: number,
  ): { id: string; at: Drop } | null => {
    const row = rows[i]
    if (!drag || !row) return null
    const r = e.currentTarget.getBoundingClientRect()
    const y = (e.clientY - r.top) / r.height
    const container =
      nestable?.(row.node) ??
      (t.branchOf(row.node) || row.node.children !== undefined)
    let at: Drop = container
      ? y < 0.25
        ? "before"
        : y > 0.75
          ? "after"
          : "inside"
      : y < 0.5
        ? "before"
        : "after"
    let id = row.id
    // Below an open branch's middle is its first child's top, where the eye puts it.
    if (at === "after" && row.expanded && rows[i + 1]?.parent === row.id) {
      at = "before"
      id = (rows[i + 1] as typeof row).id
    }
    const target = (index.get(id) as { node: N }).node
    if (!canMove(index, drag, id, at)) return null
    if (canDrop && !canDrop(drag, target, at)) return null
    return { id, at }
  }
  // What a drag carries: the rows picked up and everything under them, drawn faint
  // where they stand, so it is plain the branch goes whole.
  const carried = React.useMemo(() => {
    if (!drag) return null
    const out = new Set<string>()
    for (const r of rows)
      if (
        drag.includes(r.id) ||
        ancestors(index, r.id).some((a) => drag.includes(a))
      )
        out.add(r.id)
    return out
  }, [drag, rows, index])
  /** How many nodes sit under these, at every depth. */
  const countUnder = (ids: readonly string[]) => {
    let n = 0
    const walk = (node: N) => {
      for (const k of t.childrenOf(node) ?? []) {
        n++
        walk(k)
      }
    }
    for (const id of ids) {
      const e = index.get(id)
      if (e) walk(e.node)
    }
    return n
  }
  /** Where a drop lands, in words: "into birds", "in animals, after gull", "at the
   *  top, before a face". */
  const landing = (d: { id: string; at: Drop }) => {
    const target = index.get(d.id)
    if (!target) return ""
    if (d.at === "inside") return `into ${label(target.node)}`
    const parent = target.parent ? index.get(target.parent) : undefined
    return `${parent ? `in ${label(parent.node)}` : "at the top"}, ${d.at} ${label(target.node)}`
  }
  const clearSpring = () => {
    if (spring.current) clearTimeout(spring.current.timer)
    spring.current = null
  }
  const endDrag = () => {
    clearSpring()
    setDrag(null)
    setDrop(null)
  }

  // ── draw.
  const stateOf = (row: Row<N>): TreeRowState => ({
    depth: row.depth,
    branch: row.branch,
    expanded: row.expanded,
    selected: selectedSet.has(row.id),
    loading: t.loading.has(row.id),
    match: t.matches?.has(row.id) ?? false,
    mark: lay?.stateOf(row.id) ?? null,
  })
  const menuRow = menu ? rows[rowAt.get(menu.id) ?? -1] : undefined
  const menuEntries = menuRow ? entriesFor(menuRow.node, stateOf(menuRow)) : []

  return (
    <div
      ref={here}
      role="tree"
      aria-label={ariaLabel}
      aria-multiselectable={t.selection === "multi" || undefined}
      data-slot="tree"
      data-density={density}
      data-material={mat}
      onKeyDown={onKeyDown}
      onScroll={t.onScroll}
      className={cn(
        // Scrolls both ways, its cut edges fading where there is more (scrims'
        // `ag-edge-fade-xy`).
        "ag-edge-fade-xy relative min-h-0 text-[13px] data-[density=comfortable]:text-sm",
        // In its scheme: dark over a picture, its words take the dark theme's ink.
        schemeOf(sch),
        sch === "dark" && "text-foreground",
        className,
      )}
      style={
        {
          "--ag-tree-row": `${height}px`,
          "--ag-tree-height": `${rows.length * height}px`,
        } as React.CSSProperties
      }
    >
      <div className="relative h-(--ag-tree-height)">
        {t.drawn.map((i) => {
          const row = rows[i] as Row<N>
          const n = row.node
          const isLoading = t.loading.has(row.id)
          const off = t.isDisabled(n)
          const state = stateOf(row)
          const indent = GRID.pad + row.depth * STEP
          const metaNode = meta?.(n, state)
          const text = label(n)
          const dropHere = drop?.id === row.id ? drop.at : null
          const column = lay?.column(n, text) ?? null
          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the tree's onKeyDown is every row's keyboard
            <div
              key={row.id}
              role="treeitem"
              data-slot="tree-row"
              data-id={row.id}
              data-dimmed={t.isDimmed(n) || undefined}
              {...lay?.rowData(row.id)}
              data-menu-open={menu?.id === row.id || undefined}
              data-drop={dropHere ?? undefined}
              aria-level={row.depth + 1}
              aria-setsize={row.size}
              aria-posinset={row.index}
              aria-expanded={row.branch ? row.expanded : undefined}
              aria-selected={
                t.selection === "none" ? undefined : state.selected
              }
              aria-disabled={off || undefined}
              aria-busy={isLoading || undefined}
              tabIndex={row.id === activeId ? 0 : -1}
              draggable={!!onMove && !off && t.editing !== row.id}
              className={cn(
                // Glass: the row chosen is a pane of the material's glass, the
                // others lit in the text's colour under the hand.
                mat === "glass" &&
                  state.selected &&
                  glassVariants({ shape: "surface" }),
                ROW,
                ROW_FACE[mat],
                // Inside: the row it goes into, lit as a target, unmistakable from
                // the before and after lines.
                dropHere === "inside" &&
                  "bg-tone-info/15 text-foreground ring-1 ring-tone-info/70 ring-inset",
                carried?.has(row.id) && "opacity-40",
              )}
              style={
                {
                  "--ag-tree-y": `${i * height}px`,
                  "--ag-tree-indent": `${indent}px`,
                } as React.CSSProperties
              }
              onFocus={() => {
                if (activeId !== row.id) setActive(row.id)
              }}
              onClick={(e) => {
                setActive(row.id)
                if (off) return
                // A drag that selected text (rows whose words are text to read,
                // inspect's) ends in a click: it is the reader's, not a press.
                if (!window.getSelection()?.isCollapsed) return
                if (lay?.pressRows) {
                  lay.press(e, n)
                  return
                }
                t.select(
                  row.id,
                  e.shiftKey
                    ? "range"
                    : e.metaKey || e.ctrlKey
                      ? "toggle"
                      : "replace",
                  e.metaKey || e.ctrlKey,
                )
                if (!e.shiftKey && !e.metaKey && !e.ctrlKey) onActivate?.(n)
              }}
              onDoubleClick={(e) => {
                const onLabel = (e.target as HTMLElement).closest(
                  "[data-slot=tree-label]",
                )
                if (onRename && onLabel) t.startRename(n)
                else if (row.branch) t.toggle(row.id)
              }}
              onContextMenu={(e) => {
                onContextMenu?.(n, e)
                if (e.defaultPrevented || !hasMenu) return
                e.preventDefault()
                openMenu(row.id, e.currentTarget)
              }}
              onDragStart={(e) => {
                const ids = selectedSet.has(row.id)
                  ? rows.map((r) => r.id).filter((id) => selectedSet.has(id))
                  : [row.id]
                setDrag(ids)
                e.dataTransfer.effectAllowed = "move"
                e.dataTransfer.setData("text/plain", ids.join("\n"))
                // The pointer carries a chip naming what moves, the branch counted:
                // the browser's own ghost is a faint copy of one row.
                const under = countUnder(ids)
                const ghost = document.createElement("div")
                ghost.textContent = `${ids.length > 1 ? `${ids.length} items` : text}${under ? `  + ${under} under ${ids.length > 1 ? "them" : "it"}` : ""}`
                Object.assign(ghost.style, {
                  position: "fixed",
                  top: "-1000px",
                  left: "0",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  font: "500 12px var(--font-sans, system-ui)",
                  background: "rgb(28 28 32 / 0.96)",
                  color: "white",
                  border: "1px solid rgb(255 255 255 / 0.14)",
                  boxShadow: "0 8px 24px rgb(0 0 0 / 0.5)",
                  whiteSpace: "nowrap",
                })
                document.body.append(ghost)
                e.dataTransfer.setDragImage(ghost, 14, 14)
                requestAnimationFrame(() => ghost.remove())
              }}
              onDragOver={(e) => {
                const d = dropAt(e, i)
                if (!d) {
                  if (drop?.id === row.id) setDrop(null)
                  return
                }
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                if (drop?.id !== d.id || drop.at !== d.at) setDrop(d)
                if (d.at === "inside" && row.branch && !row.expanded) {
                  if (spring.current?.id !== row.id) {
                    clearSpring()
                    spring.current = {
                      id: row.id,
                      timer: window.setTimeout(() => t.open(row.id), SPRING_MS),
                    }
                  }
                } else if (spring.current?.id === row.id) clearSpring()
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (drag && drop) {
                  onMove?.(drag, drop.id, drop.at)
                  // What was put inside is shown there: the new parent opens.
                  if (drop.at === "inside") t.open(drop.id)
                }
                endDrag()
              }}
              onDragEnd={endDrag}
            >
              {guides &&
                Array.from({ length: row.depth }, (_, d) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: a guide is its level
                    key={d}
                    aria-hidden
                    data-slot="tree-guide"
                    className="absolute inset-y-0 left-(--ag-tree-guide) w-px bg-foreground/10"
                    style={
                      {
                        "--ag-tree-guide": `${GRID.pad + d * STEP + GRID.gutter / 2}px`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              <span
                aria-hidden
                data-slot="tree-chevron"
                className="grid size-4 shrink-0 place-items-center text-foreground/40 hover:text-foreground"
                onClick={(e) => {
                  if (!row.branch) return
                  e.stopPropagation()
                  setActive(row.id)
                  t.toggle(row.id)
                }}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                {isLoading ? (
                  <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" />
                ) : row.branch ? (
                  <ChevronRight
                    className={cn(
                      "size-3 transition-transform duration-150 ease-out motion-reduce:transition-none",
                      row.expanded && "rotate-90",
                    )}
                  />
                ) : null}
              </span>
              {icon && (
                <span aria-hidden data-slot="tree-icon" className={ICON_COL}>
                  {icon(n, state)}
                </span>
              )}
              {t.editing === row.id ? (
                <input
                  data-slot="tree-input"
                  aria-label={`rename ${text}`}
                  defaultValue={text}
                  // biome-ignore lint/a11y/noAutofocus: rename was asked for, the field is where the keys go
                  autoFocus
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === "Enter") t.endRename(n, e.currentTarget.value)
                    else if (e.key === "Escape") t.endRename(n, null)
                  }}
                  onBlur={(e) => t.endRename(n, e.currentTarget.value)}
                  className="ml-1 h-5 min-w-0 flex-1 rounded-sm bg-background px-1 text-foreground outline-none ring-1 ring-foreground/30"
                />
              ) : (
                <span
                  data-slot="tree-label"
                  className={cn(
                    "ml-1.5 min-w-0 flex-1 truncate",
                    lay?.labelClass,
                  )}
                >
                  {content ? (
                    content(n, state)
                  ) : state.match ? (
                    <Highlight text={text} query={t.query} />
                  ) : (
                    text
                  )}
                </span>
              )}
              {actions && (
                <span
                  data-slot="tree-actions"
                  className="ml-1 flex shrink-0 items-center gap-0.5 [&>*]:opacity-0 group-hover/row:[&>*]:opacity-100 group-focus-visible/row:[&>*]:opacity-100 [&>[data-pinned]]:opacity-100"
                >
                  {actions(n, state)}
                </span>
              )}
              {metaNode !== undefined && metaNode !== null && (
                <span data-slot="tree-meta" className={cn("ml-2", META)}>
                  {metaNode}
                </span>
              )}
              {column}
              {column === null && reserve.includes("mark") && (
                <span aria-hidden className="ml-1.5 size-5 shrink-0" />
              )}
              {!hasMenu && reserve.includes("more") && (
                <span aria-hidden className="-mr-1 ml-0.5 size-5 shrink-0" />
              )}
              {hasMenu && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`${text}: more`}
                  aria-haspopup="menu"
                  data-slot="tree-more"
                  onClick={(e) => {
                    e.stopPropagation()
                    openMenu(
                      row.id,
                      e.currentTarget.closest("[role=treeitem]") as Element,
                    )
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="-mr-1 ml-0.5 grid size-5 shrink-0 place-items-center rounded-sm text-foreground/45 opacity-0 hover:bg-foreground/10 hover:text-foreground group-hover/row:opacity-100 group-focus-visible/row:opacity-100 group-data-menu-open/row:opacity-100"
                >
                  <Ellipsis className="size-3.5" />
                </button>
              )}
              {dropHere && (
                // Where it lands, said: the line or the lit row shows the place,
                // the words name it.
                <span
                  aria-hidden
                  data-slot="tree-landing"
                  className={cn(
                    "pointer-events-none absolute right-2 z-10 rounded-md bg-tone-info px-1.5 py-0.5 font-medium text-[10px] text-white leading-none shadow-md",
                    dropHere === "before"
                      ? "-top-2.5"
                      : dropHere === "after"
                        ? "-bottom-2.5"
                        : "top-1/2 -translate-y-1/2",
                  )}
                >
                  {landing({ id: row.id, at: dropHere })}
                </span>
              )}
              {(dropHere === "before" || dropHere === "after") && (
                <span
                  aria-hidden
                  data-slot="tree-drop"
                  className={cn(
                    "pointer-events-none absolute right-1 left-(--ag-tree-drop) h-0.5 rounded-full bg-foreground",
                    dropHere === "before" ? "-top-px" : "-bottom-px",
                  )}
                  style={
                    {
                      "--ag-tree-drop": `${indent + GRID.gutter}px`,
                    } as React.CSSProperties
                  }
                />
              )}
            </div>
          )
        })}
      </div>
      {hasMenu && (
        <Menu
          entries={menuEntries}
          anchor={menu?.anchor ?? null}
          onClose={() => setMenu(null)}
          returnTo={() => (menu ? rowEl(menu.id) : null)}
          material={mat}
          scheme={sch}
        />
      )}
    </div>
  )
}
