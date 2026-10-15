export interface Visit {
  places: readonly string[]
  referrer?: string
  pages?: number
}

/** Where a visit went after its last place. */
export const EXIT = "(exit)"
/** Where a visit with no referrer came from. */
export const DIRECT = "(direct)"

/** A step of a visit is a place, or a named event that happened in one: `lore:download`,
 *  the place, a colon, the event (lib/visits' `eventStep` writes them so). A place's name
 *  holds no colon. */
export function stepOf(name: string): { place: string; event?: string } {
  const at = name.indexOf(":")
  return at < 0
    ? { place: name }
    : { place: name.slice(0, at), event: name.slice(at + 1) }
}

/** The distinct places of a visit, in the order first seen. */
export const distinct = (places: readonly string[]): string[] => [
  ...new Set(places),
]

/** One of the top paths: its first distinct places, how many more distinct places its
 *  visits went on to (the most any of them did), how many visits, and the median
 *  pages a visit on it saw. */
export interface PathRow {
  steps: readonly string[]
  more: number
  visits: number
  pages: number
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length / 2
  return sorted.length % 2
    ? (sorted[Math.floor(mid)] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
}

/** Every visit's path, its first `depth` distinct places, most visits first (ties: the
 *  shorter path first). */
export function topPaths(visits: readonly Visit[], depth = 4): PathRow[] {
  if (!(depth >= 1)) throw new Error(`user-flows: a depth of ${depth}`)
  const rows = new Map<
    string,
    { steps: string[]; more: number; pages: number[] }
  >()
  for (const v of visits) {
    if (v.places.length === 0)
      throw new Error("user-flows: a visit with no place")
    const all = distinct(v.places)
    const steps = all.slice(0, depth)
    const key = steps.join("\u0000")
    const row = rows.get(key) ?? { steps, more: 0, pages: [] }
    row.more = Math.max(row.more, all.length - steps.length)
    if (v.pages !== undefined && v.pages < v.places.length)
      throw new Error(
        `user-flows: a visit of ${v.places.length} places saw ${v.pages} pages`,
      )
    row.pages.push(v.pages ?? v.places.length)
    rows.set(key, row)
  }
  return [...rows.values()]
    .map((r) => ({
      steps: r.steps,
      more: r.more,
      visits: r.pages.length,
      pages: median(r.pages),
    }))
    .sort((a, b) => b.visits - a.visits || a.steps.length - b.steps.length)
}

/** A place on the path tree: the visits whose path reached it this way, how many of
 *  them left there (its last distinct place), and where the rest went next, most
 *  visits first. `id` is the path to it, unique in the tree. */
export interface PathNode {
  id: string
  place: string
  visits: number
  exited: number
  next: PathNode[]
}

/** The visits' paths folded by where they landed, `depth` places deep (what comes
 *  after is cut: a visit that went on past the depth did not leave there). */
export function pathTree(visits: readonly Visit[], depth = 3): PathNode[] {
  type Grow = { visits: number; exited: number; next: Map<string, Grow> }
  const root = new Map<string, Grow>()
  for (const v of visits) {
    const all = distinct(v.places)
    const path = all.slice(0, depth)
    let level = root
    path.forEach((place, i) => {
      const node = level.get(place) ?? { visits: 0, exited: 0, next: new Map() }
      node.visits++
      // Its last distinct place: the visit left here.
      if (i === all.length - 1) node.exited++
      level.set(place, node)
      level = node.next
    })
  }
  const out = (level: Map<string, Grow>, at: string): PathNode[] =>
    [...level.entries()]
      .map(([place, g]) => {
        const id = at ? `${at} › ${place}` : place
        return {
          id,
          place,
          visits: g.visits,
          exited: g.exited,
          next: out(g.next, id),
        }
      })
      .sort((a, b) => b.visits - a.visits)
  return out(root, "")
}

/** Places with how many visits each, most first; `outside` when it is no place of the
 *  site (a referrer, a direct arrival, the exit), nowhere a view can go to. */
export type Counted = { place: string; visits: number; outside: boolean }[]

const tally = (
  names: readonly string[],
  outside: (name: string) => boolean,
): Counted =>
  [
    ...names.reduce(
      (m, n) => m.set(n, (m.get(n) ?? 0) + 1),
      new Map<string, number>(),
    ),
  ]
    .map(([place, visits]) => ({ place, visits, outside: outside(place) }))
    .sort((a, b) => b.visits - a.visits)

/** One place, with the visits that reached it, where they came from and where they
 *  went next, and `through`: how many visits came from each place before and went to
 *  each place after, so the visits of one side can be followed to the other. */
export interface BeforeAndAfter {
  place: string
  visits: number
  before: Counted
  after: Counted
  through: Through
}

/** Visits by where they came from, then where they went next. */
export type Through = ReadonlyMap<string, ReadonlyMap<string, number>>

/** Of the visits that came from `from` (or went to `to`), how many went to (came from)
 *  each place of the other side; with neither, none. */
export function followed(
  through: Through,
  by: { from: string } | { to: string },
): ReadonlyMap<string, number> {
  if ("from" in by) return through.get(by.from) ?? new Map()
  const out = new Map<string, number>()
  for (const [from, tos] of through) {
    const n = tos.get(by.to)
    if (n) out.set(from, n)
  }
  return out
}

export function beforeAndAfter(
  visits: readonly Visit[],
  place: string,
): BeforeAndAfter {
  const before: string[] = []
  const after: string[] = []
  // What came from outside the site: told by where it stood, never by its name (a
  // referrer could be named like a place).
  const arrivals = new Set<string>()
  const through = new Map<string, Map<string, number>>()
  for (const v of visits) {
    const at = v.places.indexOf(place)
    if (at < 0) continue
    const from =
      at === 0 ? (v.referrer ?? DIRECT) : (v.places[at - 1] as string)
    const to = v.places[at + 1] ?? EXIT
    if (at === 0) arrivals.add(from)
    before.push(from)
    after.push(to)
    const tos = through.get(from) ?? new Map<string, number>()
    tos.set(to, (tos.get(to) ?? 0) + 1)
    through.set(from, tos)
  }
  return {
    place,
    visits: before.length,
    before: tally(before, (n) => arrivals.has(n)),
    after: tally(after, (n) => n === EXIT),
    through,
  }
}

/** One step of a funnel: the visits that reached it (having reached every step before
 *  it, in order), and where those that reached the step before but not this one went
 *  instead. */
export interface FunnelStep {
  step: string
  visits: number
  droppedTo: Counted
}

/** Visits through `steps` in order (each step reached any time after the one before);
 *  for each step past the first, where the visits that dropped went next after the
 *  step before (EXIT when they stopped there). */
export function funnel(
  visits: readonly Visit[],
  steps: readonly string[],
): FunnelStep[] {
  const [first, ...rest] = steps
  if (first === undefined) throw new Error("user-flows: a funnel of no step")
  let at = visits
    .map((v) => ({ v, i: v.places.indexOf(first) }))
    .filter((a) => a.i >= 0)
  const out: FunnelStep[] = [{ step: first, visits: at.length, droppedTo: [] }]
  for (const step of rest) {
    const reached: typeof at = []
    const dropped: string[] = []
    for (const a of at) {
      const next = a.v.places.indexOf(step, a.i + 1)
      if (next >= 0) reached.push({ v: a.v, i: next })
      else dropped.push(a.v.places[a.i + 1] ?? EXIT)
    }
    out.push({
      step,
      visits: reached.length,
      droppedTo: tally(dropped, (n) => n === EXIT),
    })
    at = reached
  }
  return out
}
