// A clip: anything drawn from an instant, told as the facts a driver moves through it
// by: how long it runs, how it is cut, and (when it is told in frames) its rate. The
// content's own lib makes its clip (macos-session's scene clock, terminal-session's
// session timeline); a driver moves through it (the player by the clock, a scroll
// stage by scroll, a still by one fixed instant); the component draws the frame at a
// progress. One contract, so any content plays in any driver. Framework-free.
//
// The words, each with one meaning: an INSTANT is a point in time (ms); a SPAN is a
// stretch `{from, to}` (ms); the OUTLINE is how the clip is cut, coarse to fine; a
// LEVEL is one depth of it (chapter, scene, shot); a DIVISION is one item of a level,
// written the concise way, a start and a title, running to the next division's start.
// Chapters are the outline's first level. Nesting is never stored: a scene's chapter
// is the chapter containing its start, so a level that cuts across another breaks
// nothing.

/** One item of a level: where it starts (ms) and its title. It runs to the next
 *  division's start, the last to the end. */
export interface Division {
  start: number
  title: string
  /** The title is code, as typed (a terminal's command): drawn in mono. */
  code?: boolean
}

/** A division of the outline's first level. */
export type Chapter = Division

/** One depth of the outline: its name (`chapter`, `scene`, `shot`) and its divisions,
 *  ordered by start. */
export interface Level {
  name: string
  divisions: Division[]
}

/** How a clip is cut, coarse to fine. */
export type Outline = Level[]

export interface Clip {
  /** ms */
  duration: number
  /** The outline's first level, the one a bar divides into. */
  chapters: Chapter[]
  /** Finer levels below the chapters, coarse to fine (scenes, shots), when known. */
  levels?: Level[]
  /** Frames per second, for a clip told in frames (two copies of a film compared
   *  frame by frame): its timebase steps by them. */
  fps?: number
}

/** The clip's whole outline: its chapters as the first level, then any finer ones.
 *  A clip with no chapters is one level of one division, so every outline has a
 *  first level to divide a bar into. */
export function outlineOf(clip: Clip): Outline {
  const chapters: Level = {
    name: "chapter",
    divisions: clip.chapters.length ? clip.chapters : [{ start: 0, title: "" }],
  }
  return [chapters, ...(clip.levels ?? [])]
}

/** An instant of the clip (ms) as the 0..1 progress its component draws. */
export function progressAt(clip: Clip, ms: number): number {
  return Math.min(1, Math.max(0, ms / clip.duration))
}

/** A stretch of time, ms: what a scroll stage's act cues (ui/playback `cue`), what a
 *  timebase loops in, where a division runs. */
export interface Span {
  from: number
  to: number
}

/** Chapters `first` through `last` as one span: from the first's start to the last's
 *  end. An act that tells messages 4 and 5 of a chat is `chapterSpan(clip, 4, 5)`. */
export function chapterSpan(clip: Clip, first: number, last = first): Span {
  const all = spans(clip)
  const a = all[first]
  const b = all[last]
  if (!a || !b || last < first)
    throw new Error(
      `chapterSpan: chapters ${first}..${last} outside 0..${all.length - 1}`,
    )
  return { from: a.start, to: b.end }
}

/** A local 0..1 across a span, as the progress of the whole clip: a scrubbed card
 *  that tells only part of its clip. */
export function progressWithin(clip: Clip, span: Span, local: number): number {
  const t = Math.min(1, Math.max(0, local))
  return progressAt(clip, span.from + (span.to - span.from) * t)
}

/** A level's divisions with their ends, the last running to `duration`. */
export function divisionSpans(
  level: Level,
  duration: number,
): (Division & { end: number })[] {
  const list = level.divisions.length
    ? level.divisions
    : [{ start: 0, title: "" }]
  return list.map((d, i) => ({ ...d, end: list[i + 1]?.start ?? duration }))
}

/** The division of a level containing `ms`. */
export function divisionAt(
  level: Level,
  duration: number,
  ms: number,
): (Division & { end: number }) | undefined {
  const all = divisionSpans(level, duration)
  return all.findLast((d) => ms >= d.start) ?? all[0]
}

/** The chapters with their ends; a clip without chapters is one whole span. */
export function spans(clip: Clip): (Chapter & { end: number })[] {
  return divisionSpans(
    { name: "chapter", divisions: clip.chapters },
    clip.duration,
  )
}
