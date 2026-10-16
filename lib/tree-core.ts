// THE TREE'S ARITHMETIC, framework-free: a forest of nodes in, the rows a list draws
// out, plus every question a tree UI asks of its data (what is visible, what a filter
// keeps, what a count sums to, where a drag lands, what a key does). ui/tree draws on
// it; anything else can too (a server rendering a sidebar, a test). Marks on a tree
// (include, exclude, the lens) are lib/tree-marks-core's, a layer over this.
//
// A NODE is any object with an `id` and optional `children`; nothing else is read
// here. Children are always asked through a `Children` function rather than read off
// the node, so a lazy tree (children fetched on expand, kept beside the data) and an
// eager one go through the same arithmetic. Every function is pure: nothing mutates
// its input, and a move returns a new forest.

export type Nodelike<N> = { id: string; children?: readonly N[] }

/** The children a node has right now: its own, or what a loader brought. */
export type Children<N> = (node: N) => readonly N[] | undefined

export const ownChildren = <N extends Nodelike<N>>(node: N) => node.children

/** One drawn row: a node at its place in the flattened, visible tree. */
export interface Row<N> {
  node: N
  id: string
  /** 0 for a root */
  depth: number
  parent: string | null
  /** 1-based place among its visible siblings (aria-posinset) */
  index: number
  /** how many visible siblings, itself included (aria-setsize) */
  size: number
  branch: boolean
  expanded: boolean
}

/** The rows a list draws, in order: every root, and the children of every expanded
 *  branch. `keep`, when given, is the only ids drawn (a filter), and it is also what
 *  siblings are counted over, so posinset and setsize describe what is on screen. */
export function flatten<N extends Nodelike<N>>(
  roots: readonly N[],
  opts: {
    expanded: ReadonlySet<string>
    children: Children<N>
    branch: (node: N) => boolean
    keep?: ReadonlySet<string>
  },
): Row<N>[] {
  const { expanded, children, branch, keep } = opts
  const out: Row<N>[] = []
  const walk = (nodes: readonly N[], depth: number, parent: string | null) => {
    const shown = keep ? nodes.filter((n) => keep.has(n.id)) : nodes
    shown.forEach((node, i) => {
      const isBranch = branch(node)
      const open = isBranch && expanded.has(node.id)
      out.push({
        node,
        id: node.id,
        depth,
        parent,
        index: i + 1,
        size: shown.length,
        branch: isBranch,
        expanded: open,
      })
      const kids = open ? children(node) : undefined
      if (kids) walk(kids, depth + 1, node.id)
    })
  }
  walk(roots, 0, null)
  return out
}

/** Where every known node sits: its parent and depth, by id. */
export interface Entry<N> {
  node: N
  parent: string | null
  depth: number
}

export function indexTree<N extends Nodelike<N>>(
  roots: readonly N[],
  children: Children<N>,
): Map<string, Entry<N>> {
  const out = new Map<string, Entry<N>>()
  const walk = (nodes: readonly N[], depth: number, parent: string | null) => {
    for (const node of nodes) {
      if (out.has(node.id)) throw new Error(`tree: duplicate id ${node.id}`)
      out.set(node.id, { node, parent, depth })
      const kids = children(node)
      if (kids) walk(kids, depth + 1, node.id)
    }
  }
  walk(roots, 0, null)
  return out
}

/** The ids above a node, nearest first. */
export function ancestors<N>(
  index: ReadonlyMap<string, Entry<N>>,
  id: string,
): string[] {
  const out: string[] = []
  for (
    let p = index.get(id)?.parent ?? null;
    p;
    p = index.get(p)?.parent ?? null
  )
    out.push(p)
  return out
}

/** Every known id under a node, not the node itself. */
export function descendants<N extends Nodelike<N>>(
  node: N,
  children: Children<N>,
): string[] {
  const out: string[] = []
  const walk = (n: N) => {
    for (const k of children(n) ?? []) {
      out.push(k.id)
      walk(k)
    }
  }
  walk(node)
  return out
}

/** Every id in tree order (preorder), the order a lens or a range is read in. */
export function preorder<N extends Nodelike<N>>(
  roots: readonly N[],
  children: Children<N>,
): string[] {
  const out: string[] = []
  const walk = (nodes: readonly N[]) => {
    for (const n of nodes) {
      out.push(n.id)
      walk(children(n) ?? [])
    }
  }
  walk(roots)
  return out
}

/** Every known node with children, `depth` levels down from the roots (all of them
 *  when absent): what "expand all" opens, or what a tree opens on its first look (1:
 *  the roots open on their children, everything deeper folded until asked for). */
export function branchIds<N extends Nodelike<N>>(
  roots: readonly N[],
  children: Children<N>,
  depth = Number.POSITIVE_INFINITY,
): string[] {
  const out: string[] = []
  const walk = (nodes: readonly N[], level: number) => {
    if (level > depth) return
    for (const n of nodes) {
      const kids = children(n)
      if (kids?.length) {
        out.push(n.id)
        walk(kids, level + 1)
      }
    }
  }
  walk(roots, 1)
  return out
}

// ── filter

/** What a search keeps: the matches, every ancestor of one (so a match is reached
 *  the way it lives), and every descendant of one (a matched folder still opens onto
 *  its contents). `open` is the ancestors, which a list expands while it filters. */
export function filterTree<N extends Nodelike<N>>(
  roots: readonly N[],
  children: Children<N>,
  match: (node: N) => boolean,
): { keep: Set<string>; matches: Set<string>; open: Set<string> } {
  const keep = new Set<string>()
  const matches = new Set<string>()
  const open = new Set<string>()
  const all = (n: N) => {
    keep.add(n.id)
    for (const k of children(n) ?? []) all(k)
  }
  // True when the node or something under it matched.
  const walk = (n: N): boolean => {
    if (match(n)) {
      matches.add(n.id)
      all(n)
      for (const k of children(n) ?? []) if (walk(k)) open.add(n.id)
      return true
    }
    let hit = false
    for (const k of children(n) ?? []) if (walk(k)) hit = true
    if (hit) {
      keep.add(n.id)
      open.add(n.id)
    }
    return hit
  }
  for (const r of roots) walk(r)
  return { keep, matches, open }
}

// ── counts

/** A count that rolls up: each node's own number plus everything under it. `total`,
 *  when it knows a node's whole count, stands for its subtree instead of the sum: a
 *  store that counts distinct files under a tag knows that a file tagged twice below
 *  it is still one file, which no sum can know. */
export function rollup<N extends Nodelike<N>>(
  roots: readonly N[],
  children: Children<N>,
  own: (node: N) => number,
  total?: (node: N) => number | undefined,
): Map<string, number> {
  const out = new Map<string, number>()
  const walk = (n: N): number => {
    let sum = own(n)
    for (const k of children(n) ?? []) sum += walk(k)
    const known = total?.(n)
    out.set(n.id, known ?? sum)
    return known ?? sum
  }
  for (const r of roots) walk(r)
  return out
}

// ── paths

export interface PathNode {
  /** the full path: `vehicles/sedan` */
  id: string
  /** the last segment: `sedan` */
  name: string
  children?: PathNode[]
}

/** A tree from slash paths, in first-seen order. A path implies its parents, so
 *  `["vehicles/sedan", "color/red"]` makes four nodes. */
export function fromPaths(paths: readonly string[], sep = "/"): PathNode[] {
  const roots: PathNode[] = []
  const byId = new Map<string, PathNode>()
  for (const path of paths) {
    const parts = path.split(sep).filter(Boolean)
    let siblings = roots
    let id = ""
    for (const name of parts) {
      id = id ? `${id}${sep}${name}` : name
      let node = byId.get(id)
      if (!node) {
        node = { id, name }
        byId.set(id, node)
        siblings.push(node)
      }
      node.children ??= []
      siblings = node.children
    }
  }
  // A leaf is a node nothing was placed under: drop its empty list so it reads as one.
  for (const n of byId.values()) if (n.children?.length === 0) delete n.children
  return roots
}

// ── moving (drag to reorder and reparent)

/** Where a drop lands relative to its target row. */
export type Drop = "before" | "inside" | "after"

/** A move is legal unless it would put a node inside itself or onto itself. */
export function canMove<N>(
  index: ReadonlyMap<string, Entry<N>>,
  ids: readonly string[],
  target: string,
  drop: Drop,
): boolean {
  if (ids.includes(target)) return false
  const above = ancestors(index, target)
  if (ids.some((id) => above.includes(id))) return false
  return drop !== "inside" || index.has(target)
}

/** The forest with `ids` moved before, inside (last child) or after `target`. A node
 *  whose ancestor also moves travels with it rather than on its own; the moved nodes
 *  keep their tree order. `rebuild` makes a node with new children (default: a
 *  spread), for data that is not a plain object. */
export function moveNodes<N extends Nodelike<N>>(
  roots: readonly N[],
  ids: readonly string[],
  target: string,
  drop: Drop,
  rebuild: (node: N, children: N[]) => N = (node, children) => ({
    ...node,
    children,
  }),
): N[] {
  const index = indexTree(roots, ownChildren)
  if (!canMove(index, ids, target, drop))
    throw new Error(`tree: cannot move ${ids.join(",")} ${drop} ${target}`)
  const moving = new Set(ids)
  const top = preorder(roots, ownChildren).filter(
    (id) => moving.has(id) && !ancestors(index, id).some((a) => moving.has(a)),
  )
  const carried = top.map((id) => (index.get(id) as Entry<N>).node)
  const lifted = new Set(top)

  // Untouched subtrees come back as the same objects, so a renderer keyed on identity
  // redraws only the branches the move changed.
  const same = (a: readonly N[], b: readonly N[]) =>
    a.length === b.length && a.every((n, i) => n === b[i])
  const place = (nodes: readonly N[]): N[] => {
    const out: N[] = []
    for (const n of nodes) {
      if (lifted.has(n.id)) continue
      const kids = n.children ? place(n.children) : undefined
      const next =
        n.id === target && drop === "inside"
          ? rebuild(n, [...(kids ?? []), ...carried])
          : kids && n.children && !same(kids, n.children)
            ? rebuild(n, kids)
            : n
      if (n.id === target && drop === "before") out.push(...carried)
      out.push(next)
      if (n.id === target && drop === "after") out.push(...carried)
    }
    return out
  }
  return place(roots)
}

// ── keyboard (the WAI-ARIA tree pattern, as data)

export type Nav =
  | { focus: number }
  | { expand: string }
  | { collapse: string }
  | { expandSiblings: string | null }
  | null

/** What a key does at row `i`: move focus, open, close, or open every sibling branch.
 *  Right opens a closed branch and steps into an open one; Left closes an open branch
 *  and steps out to the parent otherwise. `page` is how many rows a page key moves. */
export function navigate<N>(
  rows: readonly Row<N>[],
  i: number,
  key: string,
  page = 10,
): Nav {
  const row = rows[i]
  if (!row) return rows.length ? { focus: 0 } : null
  const last = rows.length - 1
  switch (key) {
    case "ArrowDown":
      return { focus: Math.min(last, i + 1) }
    case "ArrowUp":
      return { focus: Math.max(0, i - 1) }
    case "Home":
      return { focus: 0 }
    case "End":
      return { focus: last }
    case "PageDown":
      return { focus: Math.min(last, i + page) }
    case "PageUp":
      return { focus: Math.max(0, i - page) }
    case "ArrowRight":
      if (!row.branch) return null
      if (!row.expanded) return { expand: row.id }
      return rows[i + 1]?.parent === row.id ? { focus: i + 1 } : null
    case "ArrowLeft": {
      if (row.branch && row.expanded) return { collapse: row.id }
      const p = rows.findIndex((r) => r.id === row.parent)
      return p >= 0 ? { focus: p } : null
    }
    case "*":
      return { expandSiblings: row.parent }
    default:
      return null
  }
}

/** Type-ahead: the next row after `from` whose label starts with `query`, wrapping. */
export function typeahead<N>(
  rows: readonly Row<N>[],
  from: number,
  query: string,
  label: (node: N) => string,
): number {
  const q = query.toLowerCase()
  for (let step = 1; step <= rows.length; step++) {
    const i = (from + step) % rows.length
    const r = rows[i] as Row<N>
    if (label(r.node).toLowerCase().startsWith(q)) return i
  }
  return -1
}

/** The ids from row `a` to row `b`, either direction: a shift-click's range. */
export function between<N>(
  rows: readonly Row<N>[],
  a: number,
  b: number,
): string[] {
  const [lo, hi] = a < b ? [a, b] : [b, a]
  return rows.slice(lo, hi + 1).map((r) => r.id)
}
