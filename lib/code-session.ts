// AN EDIT, scripted: what a developer does to a project's files told as steps (open a
// file, type at a place in it, save), timed into a clip any driver moves through, and
// folded into the frame an editor draws at an instant: the tabs open, the file in
// front and what it holds so far, where the caret is, what is unsaved, and the modal
// editor's mode and command line. `ide` draws it as VS Code, `terminal-editor` as a
// modal editor in the terminal; a Player, a scroll stage or a fixed progress moves
// time. Framework-free.
//
// Text is only ever added, so every character the session will type has a place in
// the file as the session leaves it (`final`), and the frame at an instant is that
// file with what is not typed yet left out. Each character carries its offset in the
// final file (`origin`), which is where a view reads its colour: highlighted once,
// the finished file, so a half-typed attribute already reads as one.
//
// The pacing is one table (TYPE_MS, OPEN_MS, ...): a step's time is decided here and
// nowhere else, so a played edit and a scrubbed one are the same frames.

import type { Chapter, Clip } from "@/lib/clip"

/** A file of the project: its path (`/` between folders), and what it holds before
 *  the session. */
export interface CodeFile {
  path: string
  text: string
}

/** One thing done to the project, after `delay` ms (default none). */
export type CodeStep = (
  | /** The file comes to the front, in a tab of its own (opened once, then
   *  switched to). */
  { kind: "open"; path: string }
  /** Keys typed into the file in front. Where: `line` (from 1) and `column` (from
   *  1, absent the line's end), in the text as it is when the step starts; with
   *  neither, at the caret, where the last keys left it (a file's start before
   *  any). A newline's indentation lands with it, as an editor indents. */
  | { kind: "type"; text: string; line?: number; column?: number }
  /** The file in front saved: VS Code's ⌘S, a modal editor's `:w`. */
  | { kind: "save" }
) & { delay?: number }

/** One key typed into a file: a person who knows what they are writing. */
export const TYPE_MS = 55
/** A file coming to the front, before the next step. */
const OPEN_MS = 450
/** The caret placed (a click, a jump to the line) before the first key. */
const PLACE_MS = 300
/** A save: the modal editor's `:` and `w` and return, a key each. */
const SAVE_KEY_MS = 140
const SAVE_MS = SAVE_KEY_MS * 3 + 300
/** Insert mode left (Esc) after the last key. */
const ESC_MS = 220
/** The last frame held on screen after the last step, so it is seen. */
const HOLD_MS = 1400

/** A modal editor's mode: `insert` while keys are typed, `command` while a command
 *  line is, else `normal`. VS Code has none, and ignores it. */
export type CodeMode = "normal" | "insert" | "command"

/** The editor at an instant. */
export interface CodeFrame {
  /** The files open, in the order their tabs were opened. */
  open: string[]
  /** The file in front; null before one opens. */
  active: string | null
  /** The front file's text at this instant. */
  text: string
  /** Each character of `text`, its offset in the front file as the session leaves
   *  it (`CodeTimeline.final`): where a view reads its colour. */
  origin: number[]
  /** The caret, an offset into `text`. */
  caret: number
  /** The files changed since they were last saved. */
  dirty: string[]
  mode: CodeMode
  /** The command line while one is typed (`:w`), else empty. */
  command: string
  /** The last save, done: the file and the instant (ms) it landed. */
  saved: { path: string; at: number } | null
  /** The step under way or last done, -1 before the first. */
  step: number
}

/** A character of a file: when it was typed (ms), -1 when it was there before. */
export interface CodeChar {
  ch: string
  born: number
}
type Char = CodeChar

/** A `type` step, placed: the file, and its characters, in the order typed. */
export interface CodeTyped {
  path: string
  chars: Char[]
  /** Where the caret stood before the first key, as the character it stood before
   *  (null: the file's end). */
  before: Char | null
}

export interface CodeTimeline {
  files: CodeFile[]
  steps: CodeStep[]
  /** When each step begins (after its delay) and ends, ms. */
  starts: number[]
  ends: number[]
  total: number
  /** Each file as the session leaves it, by path. */
  final: Record<string, string>
  /** The edit as a clip: one chapter per file opened and per thing typed. */
  clip: Clip
  /** Each file's characters as the session leaves them, with when each was typed. */
  chars: Record<string, CodeChar[]>
  /** Each step's keys, placed (null for a step that types none). */
  typed: (CodeTyped | null)[]
}
type Typed = CodeTyped

function stepMs(s: CodeStep, typedKeys: number): number {
  switch (s.kind) {
    case "open":
      return OPEN_MS
    case "type":
      return PLACE_MS + typedKeys * TYPE_MS + ESC_MS
    case "save":
      return SAVE_MS
  }
}

/** Offset of `line`:`column` (both from 1; no column: the line's end) in `chars`.
 *  Throws on a place the text does not have. */
function offsetOf(
  chars: Char[],
  line: number,
  column: number | undefined,
  path: string,
): number {
  let at = 0
  for (let l = 1; l < line; l++) {
    while (at < chars.length && chars[at]?.ch !== "\n") at++
    if (at >= chars.length)
      throw new Error(
        `code-session: ${path} has ${l} lines, no line ${line} to type at`,
      )
    at++
  }
  let end = at
  while (end < chars.length && chars[end]?.ch !== "\n") end++
  if (column === undefined) return end
  if (column < 1 || at + column - 1 > end)
    throw new Error(
      `code-session: ${path}:${line} has ${end - at} columns, no column ${column}`,
    )
  return at + column - 1
}

/** Times an edit of `files`. `duration`, when longer than the edit (a clock shared
 *  with a browser that loads the result after it), holds the last frame to it.
 *  THROWS on a step that cannot happen: a path not in `files`, keys with no file in
 *  front, a place the text does not have, a delay below zero, a `duration` shorter
 *  than the edit. */
export function codeTimeline(
  files: CodeFile[],
  steps: CodeStep[],
  duration?: number,
): CodeTimeline {
  const chars: Record<string, Char[]> = {}
  for (const f of files) {
    if (chars[f.path])
      throw new Error(`code-session: ${f.path} is listed twice`)
    chars[f.path] = [...f.text].map((ch) => ({ ch, born: -1 }))
  }
  const carets: Record<string, Char | null> = {}
  const starts: number[] = []
  const ends: number[] = []
  const typed: (Typed | null)[] = []
  const chapters: Chapter[] = []
  let active: string | null = null
  let at = 0
  for (const s of steps) {
    if ((s.delay ?? 0) < 0)
      throw new Error(`code-session: delay ${s.delay} is below zero`)
    at += s.delay ?? 0
    starts.push(at)
    let keys = 0
    if (s.kind === "open") {
      if (!chars[s.path])
        throw new Error(`code-session: open ${s.path}, which files lacks`)
      active = s.path
      chapters.push({ start: at, title: s.path.split("/").at(-1) as string })
      typed.push(null)
    } else if (s.kind === "save") {
      if (!active) throw new Error("code-session: save with no file open")
      typed.push(null)
    } else {
      if (!active) throw new Error("code-session: keys typed with no file open")
      const doc = chars[active] as Char[]
      const caret = carets[active]
      const index =
        s.line !== undefined
          ? offsetOf(doc, s.line, s.column, active)
          : s.column !== undefined
            ? (() => {
                throw new Error("code-session: a column needs its line")
              })()
            : caret === undefined
              ? 0
              : caret === null
                ? doc.length
                : doc.indexOf(caret)
      const before = doc[index] ?? null
      // Each key lands TYPE_MS after the last; a newline's indentation lands
      // with it, as the editor indents the new line.
      const placed: Char[] = []
      const first = at + PLACE_MS
      let indenting = false
      for (const ch of s.text) {
        if (ch === "\n") indenting = true
        else if (indenting && (ch === " " || ch === "\t")) {
          placed.push({ ch, born: first + (keys - 1) * TYPE_MS })
          continue
        } else indenting = false
        placed.push({ ch, born: first + keys * TYPE_MS })
        keys++
      }
      doc.splice(index, 0, ...placed)
      carets[active] = before
      typed.push({ path: active, chars: placed, before })
      chapters.push({
        start: at,
        title: s.text.trim().split("\n")[0] as string,
        code: true,
      })
    }
    at += stepMs(s, keys)
    ends.push(at)
  }
  const natural = at + HOLD_MS
  if (duration !== undefined && duration < natural)
    throw new Error(
      `code-session: duration ${duration} ms is shorter than the edit's ${natural} ms`,
    )
  const total = duration ?? natural
  // An edit that opens a file at once never shows the empty editor as a chapter.
  if (chapters[0]?.start !== 0)
    chapters.unshift({ start: 0, title: "the editor" })
  const final: Record<string, string> = {}
  for (const [path, doc] of Object.entries(chars))
    final[path] = doc.map((c) => c.ch).join("")
  return {
    files,
    steps,
    starts,
    ends,
    total,
    final,
    clip: { duration: total, chapters },
    chars,
    typed,
  }
}

/** The frame at `ms`: every step done so far applied, the one under way partly. */
export function codeFrameAt(timeline: CodeTimeline, ms: number): CodeFrame {
  const open: string[] = []
  let active: string | null = null
  let mode: CodeMode = "normal"
  let command = ""
  let saved: CodeFrame["saved"] = null
  let step = -1
  /** Per file: the caret (the character it stands before, null at the end). */
  const carets: Record<string, Char | null> = {}
  /** Per file: the last save landed so far. */
  const savedAt: Record<string, number> = {}
  for (const [i, s] of timeline.steps.entries()) {
    const from = timeline.starts[i] as number
    const to = timeline.ends[i] as number
    if (ms < from) break
    step = i
    if (s.kind === "open") {
      if (!open.includes(s.path)) open.push(s.path)
      active = s.path
      continue
    }
    const path = active as string
    if (s.kind === "save") {
      const landed = from + SAVE_KEY_MS * 3
      if (ms < landed) {
        mode = "command"
        command = ms < from + SAVE_KEY_MS ? ":" : ":w"
      } else {
        savedAt[path] = landed
        saved = { path, at: landed }
      }
      continue
    }
    const t = timeline.typed[i] as Typed
    // The caret stands after the last key landed, else where the keys will go.
    let last: Char | null = null
    for (const c of t.chars) if (c.born <= ms) last = c
    const doc = timeline.chars[path] as Char[]
    carets[path] = last
      ? (doc[doc.indexOf(last) + 1] ?? null)
      : (t.before ?? null)
    if (ms < to) mode = "insert"
  }
  const dirty = open.filter((p) =>
    (timeline.chars[p] as Char[]).some(
      (c) => c.born >= 0 && c.born <= ms && c.born > (savedAt[p] ?? -1),
    ),
  )
  if (!active)
    return {
      open,
      active,
      text: "",
      origin: [],
      caret: 0,
      dirty,
      mode,
      command,
      saved,
      step,
    }
  const doc = timeline.chars[active] as Char[]
  const caretChar = carets[active]
  let text = ""
  const origin: number[] = []
  let caret = -1
  for (const [n, c] of doc.entries()) {
    if (c === caretChar) caret = origin.length
    if (c.born > ms) continue
    text += c.ch
    origin.push(n)
  }
  if (caret < 0) caret = caretChar === undefined ? 0 : origin.length
  return {
    open,
    active,
    text,
    origin,
    caret,
    dirty,
    mode,
    command,
    saved,
    step,
  }
}

/** A caret offset in `text` as a place: `line` and `column`, both from 1. */
export function placeOf(
  text: string,
  offset: number,
): { line: number; column: number } {
  let line = 1
  let start = 0
  for (let i = 0; i < offset; i++)
    if (text[i] === "\n") {
      line++
      start = i + 1
    }
  return { line, column: offset - start + 1 }
}
