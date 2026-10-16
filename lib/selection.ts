// THE SELECTION KERNEL, framework-free, one for every set that is shown (a gallery's
// files, a table's rows, a rail's rows): what a click, a ⌘-click, a ⇧-click, ⌘A, Esc
// and a marquee do to a selection, as pure functions over the set's order and the
// selection. The selection is `{ ids, anchor, cursor }`: the anchor is where a range
// starts (the last plain or ⌘ click), the cursor is where the keyboard is. A range is
// always in SET ORDER, never the rectangle on screen: the set's order is the
// meaningful one (from this date to that, this score to that), the keyboard extends
// the same way, and it is the list a slideshow plays. A marquee is the geometric
// selection and arrives here as the ids it touched.
//
// The selection outlives the set: a filter that hides selected items keeps them
// selected, and `shownOf` says how many are visible and how many the filter hides, so
// a bar can say "12 selected, 3 hidden by the filter" and act on the visible ones.
//
// What a verb acts on is decided once, here: `actsOn` is the visible selection when
// the item asked about is in it, else that item alone (a right click on an item
// outside the selection never acts on the selection).

export interface Selection {
  ids: ReadonlySet<string>
  anchor?: string
  cursor?: string
}

export const NONE: Selection = { ids: new Set() }

/** A plain click, or an arrow without ⇧: this one alone. */
export function only(id: string): Selection {
  return { ids: new Set([id]), anchor: id, cursor: id }
}

/** ⌘-click: this one in or out, the rest kept. */
export function toggle(selection: Selection, id: string): Selection {
  const ids = new Set(selection.ids)
  if (ids.has(id)) ids.delete(id)
  else ids.add(id)
  return { ids, anchor: id, cursor: id }
}

/** ⇧-click or ⇧-arrow: from the anchor to `to` in set order. `keep` (⌘ held as well)
 *  adds the range to what was selected instead of replacing it. With no anchor in the
 *  set (it was filtered away, or nothing was ever clicked) the range is `to` alone. */
export function range(
  order: readonly string[],
  selection: Selection,
  to: string,
  keep = false,
): Selection {
  const anchor =
    selection.anchor && order.includes(selection.anchor) ? selection.anchor : to
  const a = order.indexOf(anchor)
  const b = order.indexOf(to)
  if (b < 0) throw new Error(`selection: ${to} is not in the set`)
  const ids = new Set(keep ? selection.ids : [])
  for (let i = Math.min(a, b); i <= Math.max(a, b); i++)
    ids.add(order[i] as string)
  return { ids, anchor, cursor: to }
}

/** ⌘A: every item of the set (what the filter hides stays as it was). */
export function all(order: readonly string[], selection: Selection): Selection {
  return {
    ids: new Set([...selection.ids, ...order]),
    anchor: selection.anchor ?? order[0],
    cursor: selection.cursor ?? order[0],
  }
}

/** A marquee: the ids it touches, added to `base` when `keep` (⌘ or ⇧ held). */
export function area(
  base: Selection,
  touched: readonly string[],
  keep: boolean,
): Selection {
  const ids = new Set(keep ? base.ids : [])
  for (const id of touched) ids.add(id)
  const last = touched[touched.length - 1]
  return { ids, anchor: touched[0] ?? base.anchor, cursor: last ?? base.cursor }
}

/** The keyboard cursor counts only while it points inside the selection: a
 *  deselected grid must never open a ghost. */
export function target(selection: Selection): string | undefined {
  return selection.cursor && selection.ids.has(selection.cursor)
    ? selection.cursor
    : undefined
}

/** The selected ids in set order (what "play the selection" plays). */
export function inOrder(
  order: readonly string[],
  selection: Selection,
): string[] {
  return order.filter((id) => selection.ids.has(id))
}

/** What a verb asked of `id` acts on: the visible selection, in set order, when `id`
 *  is in it, else `id` alone. */
export function actsOn(
  order: readonly string[],
  selection: Selection,
  id: string,
): string[] {
  return selection.ids.has(id) ? inOrder(order, selection) : [id]
}

/** How many selected items the set shows and how many a filter hides. */
export function shownOf(
  order: readonly string[],
  selection: Selection,
): { shown: number; hidden: number } {
  const shown = inOrder(order, selection).length
  return { shown, hidden: selection.ids.size - shown }
}

/** Whether `id` lies inside the selection's own range (anchor to cursor, in set
 *  order): the band the grid washes so a set-order range reads as deliberate. */
export function inRange(
  index: ReadonlyMap<string, number>,
  selection: Selection,
  id: string,
): boolean {
  if (!selection.ids.has(id) || !selection.anchor || !selection.cursor)
    return false
  if (selection.anchor === selection.cursor) return false
  const a = index.get(selection.anchor)
  const b = index.get(selection.cursor)
  const i = index.get(id)
  if (a === undefined || b === undefined || i === undefined) return false
  return i >= Math.min(a, b) && i <= Math.max(a, b)
}
