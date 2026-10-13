export interface Person {
  /** The display name, in full: "John F. Kennedy". */
  name: string
  /** The name where room is short (a caption's speaker, a chip, a mention in running
   *  text): "Kennedy". Absent, `name`. */
  short?: string
  /** "@adriangalilea": what a mention types and a sub-line shows. */
  handle?: string
  /** The picture's URL. Absent, a surface draws its own placeholder. */
  avatar?: string
  /** An animated picture (mp4) that loops muted over `avatar`, where a surface
   *  animates one. */
  avatarVideo?: string
  /** The person's own colour, any CSS colour: what a surface that tells people apart
   *  by colour tints them with (a transcript's speaker). Absent, the surface picks one
   *  from its palette by order of appearance, so a page that never sets it still gets
   *  distinct people, and one that does keeps the same colour on every surface. */
  color?: string
}

/** The name to draw where room is short. */
export const shortName = (p: Person): string => p.short ?? p.name

/** Distinct, mid-light hues that read on a light page and a dark one alike: the
 *  palette a surface picks from for a person who states no `color`. One palette, so a
 *  chat and a transcript of the same people tint them the same. */
export const PERSON_PALETTE = [
  "oklch(0.64 0.15 250)",
  "oklch(0.66 0.15 40)",
  "oklch(0.64 0.14 150)",
  "oklch(0.62 0.17 320)",
  "oklch(0.70 0.13 90)",
  "oklch(0.64 0.12 200)",
] as const

/** Each key's colour: its person's own, else the palette's by the key's first place in
 *  `order` (the order people first appear in, so the first always wears the first hue).
 *  Repeats in `order` are fine; only the first place counts. */
export function personColors(
  order: readonly string[],
  people: Record<string, Person | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {}
  ;[...new Set(order)].forEach((key, i) => {
    out[key] =
      people[key]?.color ??
      (PERSON_PALETTE[i % PERSON_PALETTE.length] as string)
  })
  return out
}
