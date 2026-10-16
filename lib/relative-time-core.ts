// AN INSTANT SAID FROM NOW: "just now", "12s ago", "4m ago", "in 3d", and past a
// reach its date ("Oct 8", with its year when it is not now's). Framework-free, so a
// server, an email or a log line says it the same way the label does.
//
//   relativeText(at, now)               the words
//   nextChange(at, now)                 ms until the words change, or null for never
//
// Instants are ms since the epoch. A count is floored ("4m ago" from 4:00 to 4:59),
// ahead as behind ("in 4m" from 4:59 down to 4:00), in the largest unit that fits
// (seconds, minutes, hours, days, weeks, months of 30 days, years of 365). Under one
// of the finest unit said (`precision`) it is "just now", or "now" ahead. Past
// `dateAfter` days either way it is the date, in the reader's time zone.
//
// `nextChange` is what makes a label's clock follow the age: the words change once a
// second while they count seconds, once a minute while they count minutes, and a date
// changes only when the year turns. A clock that waits exactly that long ticks no
// more often than the words move, and never late.

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** The units a count is said in, finest first. */
const UNITS = [
  { name: "second", short: "s", ms: SECOND },
  { name: "minute", short: "m", ms: MINUTE },
  { name: "hour", short: "h", ms: HOUR },
  { name: "day", short: "d", ms: DAY },
  { name: "week", short: "w", ms: 7 * DAY },
  { name: "month", short: "mo", ms: 30 * DAY },
  { name: "year", short: "y", ms: 365 * DAY },
] as const
type Unit = (typeof UNITS)[number]

const unitAt = (i: number): Unit => {
  const unit = UNITS[i]
  if (!unit) throw new Error(`relative-time: no unit ${i}`)
  return unit
}

export interface RelativeOptions {
  /** The finest unit counted: under one of it, "just now" ("now" ahead). Default
   *  `second`; `minute` for a list where seconds are noise. */
  precision?: "second" | "minute"
  /** Days from now, either way, past which the instant is said as its date. Default
   *  7; `Infinity` counts on in weeks, months and years. */
  dateAfter?: number
}

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})
const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})
const FULL = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeStyle: "long",
})

function settle({ precision = "second", dateAfter = 7 }: RelativeOptions) {
  if (!(dateAfter > 0))
    throw new Error(
      `relative-time: dateAfter is days above 0, got ${dateAfter}`,
    )
  const finest = UNITS.findIndex((u) => u.name === precision)
  if (finest < 0) throw new Error(`relative-time: no precision "${precision}"`)
  return { finest, reach: dateAfter * DAY }
}

function assertInstant(what: string, t: number) {
  if (!Number.isFinite(t))
    throw new Error(`relative-time: ${what} is no instant (${t})`)
}

/** The largest unit from `finest` on that fits in `far` ms (`far` at least one of the
 *  finest). */
function unitFor(far: number, finest: number): number {
  let u = finest
  while (u + 1 < UNITS.length && unitAt(u + 1).ms <= far) u++
  return u
}

/** The instant as a date: "Oct 8", or "Oct 8, 2025" when its year is not now's. */
export function dateText(at: number, now: number): string {
  const date = new Date(at)
  return new Date(now).getFullYear() === date.getFullYear()
    ? MONTH_DAY.format(date)
    : MONTH_DAY_YEAR.format(date)
}

/** The instant in full, with its time and zone: what a title shows. */
export function fullText(at: number): string {
  assertInstant("at", at)
  return FULL.format(new Date(at))
}

/** The instant as it is said from `now`. */
export function relativeText(
  at: number,
  now: number,
  options: RelativeOptions = {},
): string {
  assertInstant("at", at)
  assertInstant("now", now)
  const { finest, reach } = settle(options)
  const ago = now - at
  const far = Math.abs(ago)
  if (far >= reach) return dateText(at, now)
  if (far < unitAt(finest).ms) return ago >= 0 ? "just now" : "now"
  const unit = unitAt(unitFor(far, finest))
  const count = `${Math.floor(far / unit.ms)}${unit.short}`
  return ago >= 0 ? `${count} ago` : `in ${count}`
}

/** The start of the year after `now`'s, in the reader's time zone. */
const nextYear = (now: number) =>
  new Date(new Date(now).getFullYear() + 1, 0, 1).getTime()

/** Ms from `now` until `relativeText(at, …)` says something else; null when it never
 *  will (a date that already shows its year, behind). */
export function nextChange(
  at: number,
  now: number,
  options: RelativeOptions = {},
): number | null {
  assertInstant("at", at)
  assertInstant("now", now)
  const { finest, reach } = settle(options)
  const ago = now - at
  const far = Math.abs(ago)
  const sameYear = new Date(now).getFullYear() === new Date(at).getFullYear()

  if (ago >= 0) {
    // Behind: the count grows. A date changes once, when the year turns under it.
    if (far >= reach) return sameYear ? nextYear(now) - now : null
    const fine = unitAt(finest).ms
    if (far < fine) return fine - far
    const u = unitFor(far, finest)
    const unit = unitAt(u)
    const larger = UNITS[u + 1]
    return (
      Math.min(
        (Math.floor(far / unit.ms) + 1) * unit.ms,
        larger ? larger.ms : Number.POSITIVE_INFINITY,
        reach,
      ) - far
    )
  }

  // Ahead: the count shrinks, and becomes "just now" as the instant passes.
  if (far >= reach) {
    // Counted once inside the reach; before that, its year shows until now's year
    // is its own.
    const counted = far - reach + 1
    const itsYear = new Date(new Date(at).getFullYear(), 0, 1).getTime()
    return sameYear ? counted : Math.min(counted, itsYear - now)
  }
  const fine = unitAt(finest).ms
  if (far < fine) return far
  const unit = unitAt(unitFor(far, finest))
  return far - Math.floor(far / unit.ms) * unit.ms + 1
}
