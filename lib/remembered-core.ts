// REMEMBERED: what a person set, kept, and given back to its default when it should be.
// Every "keep this" of an interface goes through here (a gallery's size, a player's
// volume, a rail's folded sections, a query for the session), so they all keep the same
// way: one definition per setting, its default the base, what was set an override on
// top, and how long it lives said where it is defined:
//
//   "tab"         this tab's session: kept across reloads and navigation, gone with the
//                 tab (a query being looked through, a private view switched on)
//   "always"      until changed (a size, lanes or rows, motion, a volume)
//   { idle: ms }  until untouched that long, then the default again (a fold, a slideshow
//                 setting): a thing set once and forgotten falls back, a thing in use
//                 stays, since every page that reads it touches it
//
// What is kept is checked by the setting's `parse` on every read: what fails it (a shape
// from before, a value from elsewhere) is said in the console and gives the default, and
// a plain object kept is laid over its default first, so a field the setting gained since
// takes its default. Framework-free: the shelf (a Storage's get, set and remove) is
// handed in, ui/remembered binds it to the page's and is what an interface imports.
//
//   const SIZE = setting("gallery:size", { initial: 280, keep: "always", parse: number })
//   read(SIZE, shelf, now)          → 280, or what was set
//   write(SIZE, shelf, 320, now)    → kept, with when

export type Keep = "tab" | "always" | { idle: number }

export interface Setting<T> {
  /** where it is kept, the same in every place that reads it */
  key: string
  /** what it is until a person sets it, and again once forgotten */
  initial: T
  keep: Keep
  /** what was kept, as this setting's value, or undefined when it is not one */
  parse: (raw: unknown) => T | undefined
}

/** The part of a Storage a setting is kept in. */
export interface Shelf {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** What is kept: the value, and when it was last touched (ms since the epoch). */
interface Kept {
  value: unknown
  at: number
}

/** Settings are kept under this prefix, so a page's other storage is never read. */
export const PREFIX = "remembered:"

export function setting<T>(
  key: string,
  o: { initial: T; keep: Keep; parse: (raw: unknown) => T | undefined },
): Setting<T> {
  if (!key.trim()) throw new Error("a setting needs a key")
  if (typeof o.keep === "object" && !(o.keep.idle > 0))
    throw new Error(
      `${key}: kept while idle for a time above 0 ms, not ${o.keep.idle}`,
    )
  if (o.parse(o.initial) === undefined)
    throw new Error(`${key}: its own default does not parse`)
  return { key, ...o }
}

const plain = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x)

/** The setting's value as kept, or its default: nothing kept, kept past its idle time,
 *  or kept as something it does not parse (said). */
export function read<T>(s: Setting<T>, shelf: Shelf, now: number): T {
  const text = shelf.getItem(PREFIX + s.key)
  if (text === null) return s.initial
  let kept: Kept
  try {
    kept = JSON.parse(text) as Kept
  } catch {
    console.error(`remembered ${s.key}: not JSON, back to its default`)
    shelf.removeItem(PREFIX + s.key)
    return s.initial
  }
  if (!plain(kept) || typeof kept.at !== "number" || !("value" in kept)) {
    console.error(`remembered ${s.key}: not a kept value, back to its default`)
    shelf.removeItem(PREFIX + s.key)
    return s.initial
  }
  if (typeof s.keep === "object" && now - kept.at > s.keep.idle) {
    shelf.removeItem(PREFIX + s.key)
    return s.initial
  }
  const raw =
    plain(s.initial) && plain(kept.value)
      ? { ...s.initial, ...kept.value }
      : kept.value
  const value = s.parse(raw)
  if (value === undefined) {
    console.error(
      `remembered ${s.key}: ${JSON.stringify(kept.value)} is not one of its values, back to its default`,
    )
    shelf.removeItem(PREFIX + s.key)
    return s.initial
  }
  return value
}

/** Keep a value as set now; the default itself is not kept, so a later default holds. */
export function write<T>(
  s: Setting<T>,
  shelf: Shelf,
  value: T,
  now: number,
): void {
  if (s.parse(value) === undefined)
    throw new Error(
      `remembered ${s.key}: ${JSON.stringify(value)} is not one of its values`,
    )
  if (JSON.stringify(value) === JSON.stringify(s.initial)) {
    shelf.removeItem(PREFIX + s.key)
    return
  }
  shelf.setItem(
    PREFIX + s.key,
    JSON.stringify({ value, at: now } satisfies Kept),
  )
}

/** The setting touched now: its idle time starts again. Nothing when nothing is kept. */
export function touch<T>(s: Setting<T>, shelf: Shelf, now: number): void {
  if (typeof s.keep !== "object") return
  const text = shelf.getItem(PREFIX + s.key)
  if (text === null) return
  shelf.setItem(
    PREFIX + s.key,
    JSON.stringify({ ...(JSON.parse(text) as Kept), at: now }),
  )
}

/** Forget what was set: the default again. */
export function forget<T>(s: Setting<T>, shelf: Shelf): void {
  shelf.removeItem(PREFIX + s.key)
}

// ── parsers for the common shapes, each a value or undefined.

export const isBoolean = (x: unknown): boolean | undefined =>
  typeof x === "boolean" ? x : undefined

export const isNumber = (x: unknown): number | undefined =>
  typeof x === "number" && Number.isFinite(x) ? x : undefined

/** One of a fixed set of values. */
export const oneOf =
  <const V extends string | number>(values: readonly V[]) =>
  (x: unknown): V | undefined =>
    values.includes(x as V) ? (x as V) : undefined

/** A list of strings. */
export const isStrings = (x: unknown): string[] | undefined =>
  Array.isArray(x) && x.every((v) => typeof v === "string")
    ? (x as string[])
    : undefined

/** A list, every item parsed by `item`: all of them right, or undefined. */
export const listOf =
  <T>(item: (x: unknown) => T | undefined) =>
  (x: unknown): T[] | undefined => {
    if (!Array.isArray(x)) return undefined
    const out: T[] = []
    for (const v of x) {
      const p = item(v)
      if (p === undefined) return undefined
      out.push(p)
    }
    return out
  }

/** An object of these fields, each parsed by its own: every field present and right,
 *  or undefined (a kept object is laid over the default first, so a new field takes the
 *  default's). */
export const fields =
  <T extends object>(
    parsers: { [K in keyof T]: (x: unknown) => T[K] | undefined },
  ) =>
  (x: unknown): T | undefined => {
    if (!plain(x)) return undefined
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(parsers)) {
      const v = parsers[k as keyof T](x[k])
      if (v === undefined) return undefined
      out[k] = v
    }
    return out as T
  }

/** A number inside [min, max]. */
export const between =
  (min: number, max: number) =>
  (x: unknown): number | undefined =>
    typeof x === "number" && x >= min && x <= max ? x : undefined
