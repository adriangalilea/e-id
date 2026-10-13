const MODIFIERS = ["fn", "⌃", "⌥", "⇧", "⌘"] as const
const MODIFIER_GLYPHS = "⌃⌥⇧⌘"

/** Where the keys are pressed. `mod` is ⌘ on a Mac and Control elsewhere, and only
 *  the Mac reads modifiers as glyphs. */
export type Platform = "mac" | "other"

/** The platform a browser reports (`navigator.platform`), decided in one place so
 *  every item reads `mod` the same way. */
export function platformOf(reported: string): Platform {
  return /Mac|iPhone|iPad|iPod/.test(reported) ? "mac" : "other"
}

/** A cap as the platform writes it: the Mac's glyphs on a Mac, words elsewhere
 *  ("Ctrl", "Shift"), the way Windows and Linux print a shortcut. */
export function capLabel(cap: string, platform: Platform): string {
  if (platform === "mac") return cap
  const words: Record<string, string> = {
    "⌃": "Ctrl",
    "⌥": "Alt",
    "⇧": "Shift",
    "⌘": "Win",
    "↩": "Enter",
    "⌫": "Backspace",
    "⇥": "Tab",
    fn: "Fn",
    esc: "Esc",
    space: "Space",
  }
  return words[cap] ?? cap
}

/** Named keys as people write them, to the cap macOS shows. */
const NAMED: Record<string, string> = {
  ctrl: "⌃",
  control: "⌃",
  alt: "⌥",
  opt: "⌥",
  option: "⌥",
  shift: "⇧",
  cmd: "⌘",
  command: "⌘",
  meta: "⌘",
  fn: "fn",
  esc: "esc",
  escape: "esc",
  enter: "↩",
  return: "↩",
  tab: "⇥",
  space: "space",
  delete: "⌫",
  backspace: "⌫",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  home: "home",
  end: "end",
}

/** The caps of named keys (← ↩ ⌫ esc), as against characters typed. */
const NAMED_CAPS = new Set(Object.values(NAMED))

/** One key (not a modifier) as its cap, or null when it is not a key. */
function key(token: string): string | null {
  const named = NAMED[token.toLowerCase()]
  if (named && !MODIFIER_GLYPHS.includes(named) && named !== "fn") return named
  if (/^f([1-9]|1[0-9]|20)$/i.test(token)) return token.toUpperCase()
  if ([...token].length === 1 && !MODIFIER_GLYPHS.includes(token)) return token
  return null
}

function modifier(token: string, platform: Platform): string | null {
  if (MODIFIER_GLYPHS.includes(token) && token.length === 1) return token
  if (token.toLowerCase() === "mod") return platform === "mac" ? "⌘" : "⌃"
  const named = NAMED[token.toLowerCase()]
  return named && (MODIFIER_GLYPHS.includes(named) || named === "fn")
    ? named
    : null
}

function ordered(mods: string[]): string[] {
  const set = new Set(mods)
  return MODIFIERS.filter((m) => set.has(m))
}

/** Modifiers held with something that is not a key (`mod`, `shift` before a click),
 *  as their caps in macOS order, or null when any of them is not a modifier. */
export function modifiers(
  tokens: string[],
  platform: Platform = "mac",
): string[] | null {
  const mods = tokens.map((t) => modifier(t.trim(), platform))
  return mods.some((m) => m === null) ? null : ordered(mods as string[])
}

/** One combination pressed together ("⌃⌥⌘A", "ctrl+alt+cmd+a", "esc"), as its caps
 *  with the modifiers in macOS order and a letter capitalised under a modifier.
 *  `mod` is the platform's own (⌘ on a Mac, ⌃ elsewhere). Null when the string is
 *  not a shortcut. */
export function combo(
  text: string,
  platform: Platform = "mac",
): string[] | null {
  const s = text.trim()
  if (!s) return null
  // Written with +: every part a modifier, the last one a key ("⌘+" is Command
  // and the plus key, read as glyphs below).
  const parts = s.split("+")
  if (parts.length > 1 && parts.every(Boolean)) {
    const last = key(parts.at(-1) as string)
    const mods = parts.slice(0, -1).map((p) => modifier(p, platform))
    if (!last || mods.some((m) => m === null)) return null
    return [...ordered(mods as string[]), last.toUpperCase()]
  }
  // Written in glyphs: modifier glyphs, then one key.
  const chars = [...s]
  let i = 0
  while (i < chars.length && MODIFIER_GLYPHS.includes(chars[i] as string)) i++
  const rest = chars.slice(i).join("")
  const mods = chars.slice(0, i)
  if (!rest) return null
  const last = key(rest)
  if (!last) return null
  return [...ordered(mods), mods.length ? last.toUpperCase() : last]
}

/** Combinations pressed one after another, space-separated ("← →", "g g"), or null
 *  when any of them is not a shortcut. */
export function keys(
  text: string,
  platform: Platform = "mac",
): string[][] | null {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  const combos = parts.map((p) => combo(p, platform))
  return combos.every((c) => c !== null) ? (combos as string[][]) : null
}

/** A key press as the browser reports it (a KeyboardEvent has these). `code` is the
 *  physical key ("KeyF", "Digit1"): where ⌥ turns a letter into another character
 *  (⌥F is "ƒ" on a Mac) it is how the letter is still known. */
export interface Press {
  key: string
  code?: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

/** The cap a browser's `key` names, as `combo` writes it. */
const CAP_OF: Record<string, string> = {
  Enter: "↩",
  Backspace: "⌫",
  Delete: "⌫",
  Escape: "esc",
  Tab: "⇥",
  " ": "space",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Home: "home",
  End: "end",
}

/** Whether `press` is the one combination `text` names ("mod+backspace", "enter"):
 *  exactly its modifiers, and its key. A sequence ("g g") is never one press. */
export function pressed(
  text: string,
  press: Press,
  platform: Platform = "mac",
): boolean {
  const caps = combo(text, platform)
  if (!caps) return false
  const want = caps.slice(0, -1)
  const last = caps.at(-1) as string
  // A symbol is typed as the layout types it (+ is ⇧= on most): shift is part of the
  // character, never a modifier asked for, unless the shortcut names it. A named key
  // drawn as a glyph (← ↩ ⌫) is not a character: ⇧← is its own shortcut.
  const symbol =
    [...last].length === 1 && !/[a-z0-9]/i.test(last) && !NAMED_CAPS.has(last)
  const held = [
    press.ctrlKey && "⌃",
    press.altKey && "⌥",
    press.shiftKey && !(symbol && !want.includes("⇧")) && "⇧",
    press.metaKey && "⌘",
  ].filter(Boolean)
  if (want.length !== held.length || want.some((m) => !held.includes(m)))
    return false
  return capOf(press).toLowerCase() === (caps.at(-1) as string).toLowerCase()
}

/** The cap a press is, as `combo` writes it: its key, unless a modifier made the key
 *  another character (⌥F is "ƒ", ⌥1 is "¡" on a Mac), where the physical key's letter
 *  or digit stands in. The typed letter wins whenever it is one, so a layout that
 *  moves letters (AZERTY) keeps its own. */
export function capOf(press: Press): string {
  const cap = CAP_OF[press.key] ?? press.key
  if (/^[a-z0-9]$/i.test(cap)) return cap
  const physical = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(press.code ?? "")
  return physical ? ((physical[1] ?? physical[2]) as string) : cap
}

// ── who a key belongs to ────────────────────────────────────────────────────────

/** A press where it landed: the press, and whether something on its way already took
 *  it (`defaultPrevented`). */
export interface KeyPress extends Press {
  defaultPrevented: boolean
}

/** What a key landed in, as facts a page reads off the element it was pressed in (ui's
 *  key-router does): whether it takes typing, and the widget roles from that element
 *  up to the listener's own root, nearest first (an element's implicit role counts: a
 *  `<button>` is "button", a checkbox input "checkbox"). The root's own role is not in
 *  it: a timeline that is a slider still hears its own arrows. */
export interface KeyTarget {
  /** A text field, a textarea, an editable element. */
  editable: boolean
  roles: readonly string[]
}

const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"])
const NAVIGATION = new Set([...ARROWS, "Home", "End", "PageUp", "PageDown"])
const press1 = (p: KeyPress) => !p.metaKey && !p.ctrlKey && !p.altKey
/** A character typed to jump to an item (a list's typeahead): one printable key. */
const typeahead = (p: KeyPress) => press1(p) && [...p.key].length === 1
const activates = (p: KeyPress) => p.key === " " || p.key === "Enter"

/** The keys each widget role answers itself, by the ARIA practices it follows: a
 *  button's Space and Enter, a slider's arrows, a list's arrows and typeahead, a
 *  popup's Escape. A role not here takes no keys from the page. */
const ROLE_KEYS: Record<string, (p: KeyPress) => boolean> = {
  button: activates,
  link: (p) => p.key === "Enter",
  checkbox: (p) => p.key === " ",
  switch: (p) => p.key === " " || p.key === "Enter",
  radio: (p) => p.key === " " || ARROWS.has(p.key),
  radiogroup: (p) => ARROWS.has(p.key),
  tab: (p) => activates(p) || NAVIGATION.has(p.key),
  tablist: (p) => NAVIGATION.has(p.key),
  slider: (p) => NAVIGATION.has(p.key),
  // A separator that takes focus is a window splitter (a resizable's handle): the
  // arrows, Home and End move it, Enter puts it back. One that does not never holds
  // a key at all.
  separator: (p) => NAVIGATION.has(p.key) || p.key === "Enter",
  spinbutton: (p) => NAVIGATION.has(p.key),
  scrollbar: (p) => NAVIGATION.has(p.key),
  toolbar: (p) =>
    p.key === "ArrowLeft" ||
    p.key === "ArrowRight" ||
    p.key === "Home" ||
    p.key === "End",
  combobox: (p) => activates(p) || NAVIGATION.has(p.key) || p.key === "Escape",
  dialog: (p) => p.key === "Escape",
  alertdialog: (p) => p.key === "Escape",
}
/** The composite lists: arrows, Home and End, activation, Escape to close a popup,
 *  and typeahead. */
const LIST = (p: KeyPress) =>
  activates(p) || NAVIGATION.has(p.key) || p.key === "Escape" || typeahead(p)
for (const role of [
  "listbox",
  "option",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "tree",
  "treeitem",
  "grid",
  "gridcell",
  "treegrid",
  "row",
])
  ROLE_KEYS[role] = LIST

/** Text editing's own combinations, which a field keeps even with ⌘ or ⌃ held: select
 *  all, copy, cut, paste, undo, redo, and moving or deleting by word and line. */
const EDITING = new Set(["a", "c", "x", "v", "z", "y"])

/** Whether a press belongs to what it landed in, so a page-wide shortcut must leave it
 *  alone: already taken (`defaultPrevented`); typed into a field (every key a field
 *  edits with, Escape and Tab aside, and a shortcut with ⌘ or ⌃ that is not editing:
 *  ⌘K still reaches the page from a search field); or a key a widget on the way up
 *  answers itself (Space on a switch, an arrow in tabs or a slider, a letter in a
 *  menu's typeahead). One answer for every listener, so a player's Space never also
 *  toggles a focused switch, and a gallery's arrows never also move a slider. */
export function ownsKeys(press: KeyPress, target: KeyTarget): boolean {
  if (press.defaultPrevented) return true
  if (target.editable) {
    if (press.key === "Escape" || press.key === "Tab") return false
    if (!press.metaKey && !press.ctrlKey) return true
    const k = capOf(press).toLowerCase()
    return (
      EDITING.has(k) ||
      NAVIGATION.has(press.key) ||
      press.key === "Backspace" ||
      press.key === "Delete"
    )
  }
  return target.roles.some((role) => ROLE_KEYS[role]?.(press) ?? false)
}

/** A cap as ARIA names it in `aria-keyshortcuts` (the UI Events key values, `Space`
 *  for the space bar, the modifiers as words). */
const ARIA_OF: Record<string, string> = {
  "⌃": "Control",
  "⌥": "Alt",
  "⇧": "Shift",
  "⌘": "Meta",
  space: "Space",
  "↩": "Enter",
  "⌫": "Backspace",
  "⇥": "Tab",
  esc: "Escape",
  "←": "ArrowLeft",
  "→": "ArrowRight",
  "↑": "ArrowUp",
  "↓": "ArrowDown",
  home: "Home",
  end: "End",
  // The separator itself, written out (ARIA's own spelling).
  "+": "Plus",
}

/** Shortcuts as `aria-keyshortcuts` takes them: each combination's caps joined by
 *  "+" ("Shift+ArrowLeft"), combinations by spaces, each once. A shortcut that is not
 *  keys throws: an attribute a screen reader reads is no place for a guess. */
export function ariaKeyshortcuts(shortcuts: readonly string[]): string {
  const out = new Set<string>()
  for (const text of shortcuts) {
    const caps = combo(text)
    if (!caps) throw new Error(`ariaKeyshortcuts: "${text}" is not a shortcut`)
    out.add(
      caps
        .map((c) => ARIA_OF[c] ?? (c.length === 1 ? c.toUpperCase() : c))
        .join("+"),
    )
  }
  return [...out].join(" ")
}

/** A cap's name, for a person who does not read the glyphs (⌃ is easily taken for
 *  ⇧): "Control", "Option", "Command". A letter is its own name. */
export function keyName(cap: string, platform: Platform = "mac"): string {
  const other: Record<string, string> = {
    "⌥": "Alt",
    "⌘": "Windows",
    "↩": "Enter",
    "⌫": "Backspace",
  }
  if (platform === "other" && other[cap]) return other[cap]
  const names: Record<string, string> = {
    "⌃": "Control",
    "⌥": "Option",
    "⇧": "Shift",
    "⌘": "Command",
    fn: "Function",
    "↩": "Return",
    "⇥": "Tab",
    "⌫": "Delete",
    esc: "Escape",
    "←": "Left Arrow",
    "→": "Right Arrow",
    "↑": "Up Arrow",
    "↓": "Down Arrow",
    space: "Space",
  }
  return names[cap] ?? cap
}

/** A text with shortcuts written in glyphs ("Press ⌃⌥⌘A to keep your Mac awake."),
 *  split so each shortcut can be drawn as keys and the rest stays text. */
export function withKeys(
  text: string,
): ({ text: string } | { keys: string[] })[] {
  const out: ({ text: string } | { keys: string[] })[] = []
  const run =
    /[⌃⌥⇧⌘]+(?:F(?:[1-9]|1[0-9]|20)(?![0-9])|[↩⇥⌫⎋←→↑↓␣]|[A-Za-z0-9](?![A-Za-z0-9])|[^\s\p{L}\p{N}])/gu
  let at = 0
  for (const m of text.matchAll(run)) {
    const found = combo(m[0])
    if (!found) continue
    if (m.index > at) out.push({ text: text.slice(at, m.index) })
    out.push({ keys: found })
    at = m.index + m[0].length
  }
  if (at < text.length) out.push({ text: text.slice(at) })
  return out
}
