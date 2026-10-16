// The lightbox's action registry: the single source for key dispatch, buttons,
// tooltips, aria-keyshortcuts, the live region and the `?` sheet (`sheet()` renders
// the table for one layer set). Every pointer verb
// dispatches an id from this table too. Layers stack innermost first; `resolve` hands a
// key to the innermost active layer that owns it. Framework-free; the shape is what a
// future keymap item adopts unchanged.

export type Layer =
  | "always"
  | "fit"
  | "zoomed"
  | "video"
  | "sheet"
  | "fullscreen"

/** Innermost first: the order `resolve` and the Escape ladder walk. */
export const LAYERS: readonly Layer[] = [
  "sheet",
  "fullscreen",
  "zoomed",
  "fit",
  "video",
  "always",
]

export type Section = "navigate" | "zoom" | "video" | "view"
/** Table order: the `?` sheet groups rows by section in this order. */
export const SECTIONS: readonly Section[] = [
  "navigate",
  "zoom",
  "video",
  "view",
]

export type Action = {
  readonly id: string
  /** KeyboardEvent.key values; `Shift+` prefixes a named key. */
  readonly keys: readonly string[]
  readonly layer: Layer
  readonly section: Section
  readonly label: string
  /** Held-key repeat accepted unless false. */
  readonly repeat?: boolean
}

export const ACTIONS = [
  {
    id: "prev",
    keys: ["ArrowLeft"],
    layer: "fit",
    section: "navigate",
    label: "previous",
    repeat: false,
  },
  {
    id: "next",
    keys: ["ArrowRight"],
    layer: "fit",
    section: "navigate",
    label: "next",
    repeat: false,
  },
  {
    id: "step.prev",
    keys: ["Shift+ArrowLeft"],
    layer: "zoomed",
    section: "navigate",
    label: "previous",
  },
  {
    id: "step.next",
    keys: ["Shift+ArrowRight"],
    layer: "zoomed",
    section: "navigate",
    label: "next",
  },
  {
    id: "first",
    keys: ["Home"],
    layer: "always",
    section: "navigate",
    label: "first",
  },
  {
    id: "last",
    keys: ["End"],
    layer: "always",
    section: "navigate",
    label: "last",
  },
  {
    id: "zoom.in",
    keys: ["+", "="],
    layer: "always",
    section: "zoom",
    label: "zoom in",
  },
  {
    id: "zoom.out",
    keys: ["-", "_"],
    layer: "always",
    section: "zoom",
    label: "zoom out",
  },
  {
    id: "zoom.fit",
    keys: ["Escape", "0"],
    layer: "zoomed",
    section: "zoom",
    label: "fit",
  },
  {
    id: "pan.left",
    keys: ["ArrowLeft"],
    layer: "zoomed",
    section: "zoom",
    label: "pan",
  },
  {
    id: "pan.right",
    keys: ["ArrowRight"],
    layer: "zoomed",
    section: "zoom",
    label: "pan",
  },
  {
    id: "pan.up",
    keys: ["ArrowUp"],
    layer: "zoomed",
    section: "zoom",
    label: "pan",
  },
  {
    id: "pan.down",
    keys: ["ArrowDown"],
    layer: "zoomed",
    section: "zoom",
    label: "pan",
  },
  {
    id: "play",
    keys: [" ", "k"],
    layer: "video",
    section: "video",
    label: "play / pause",
  },
  {
    id: "seek.back",
    keys: ["j"],
    layer: "video",
    section: "video",
    label: "-10s",
  },
  {
    id: "seek.fwd",
    keys: ["l"],
    layer: "video",
    section: "video",
    label: "+10s",
  },
  { id: "mute", keys: ["m"], layer: "video", section: "video", label: "mute" },
  {
    id: "rail",
    keys: ["i"],
    layer: "always",
    section: "view",
    label: "details",
  },
  {
    id: "strip",
    keys: ["t"],
    layer: "always",
    section: "view",
    label: "thumbnails",
  },
  {
    id: "chrome",
    keys: ["h"],
    layer: "always",
    section: "view",
    label: "hide chrome",
  },
  {
    id: "fullscreen",
    keys: ["f"],
    layer: "always",
    section: "view",
    label: "fullscreen",
  },
  {
    id: "open",
    keys: ["o"],
    layer: "always",
    section: "view",
    label: "open original",
  },
  { id: "sheet", keys: ["?"], layer: "always", section: "view", label: "keys" },
  {
    id: "sheet.close",
    keys: ["Escape"],
    layer: "sheet",
    section: "view",
    label: "close keys",
  },
  {
    id: "close",
    keys: ["Escape"],
    layer: "fit",
    section: "view",
    label: "close",
  },
] as const satisfies readonly Action[]

export type ActionId = (typeof ACTIONS)[number]["id"]

/** Every key the registry claims, so the dialog can swallow them all while open. */
export const KEYS: ReadonlySet<string> = new Set(ACTIONS.flatMap((a) => a.keys))

export function action(id: ActionId): Action {
  const found = ACTIONS.find((a) => a.id === id)
  if (!found) throw new Error(`lightbox: unknown action ${id}`)
  return found
}

/** The innermost active layer owning `key`, or null. */
export function resolve(
  key: string,
  layers: ReadonlySet<Layer>,
): Action | null {
  for (const layer of LAYERS) {
    if (!layers.has(layer)) continue
    const owner = ACTIONS.find(
      (a) => a.layer === layer && (a.keys as readonly string[]).includes(key),
    )
    if (owner) return owner
  }
  return null
}

/** The Escape ladder, one rung per press: sheet closes, fullscreen exits (the browser
 *  does it, so null: we never double), zoomed springs to fit, then close. */
export function escRung(layers: ReadonlySet<Layer>): ActionId | null {
  if (layers.has("sheet")) return "sheet.close"
  if (layers.has("fullscreen")) return null
  if (layers.has("zoomed")) return "zoom.fit"
  return "close"
}

export type SheetRow = { keys: readonly string[]; label: string }
export type SheetSection = { section: Section; rows: SheetRow[] }

/** The `?` sheet: only what the world BEHIND the sheet answers to, grouped by section
 *  in table order. `sheet` is dropped from the layers (the sheet lists what its close
 *  reveals); `unavailable` ids are gone, not dimmed; Escape appears once, on its
 *  current rung; actions sharing a label collapse into one row (the four pans). A
 *  row left with no key is not a row. */
export function sheet(
  layers: ReadonlySet<Layer>,
  unavailable: ReadonlySet<string>,
): SheetSection[] {
  const behind = new Set(layers)
  behind.delete("sheet")
  const rung = escRung(behind)
  const out: SheetSection[] = []
  for (const a of ACTIONS) {
    if (!behind.has(a.layer) || unavailable.has(a.id)) continue
    const keys = a.keys.filter((k) => k !== "Escape" || a.id === rung)
    if (keys.length === 0) continue
    let section = out[out.length - 1]
    if (!section || section.section !== a.section) {
      section = { section: a.section, rows: [] }
      out.push(section)
    }
    const row = section.rows.find((r) => r.label === a.label)
    if (row) row.keys = [...row.keys, ...keys]
    else section.rows.push({ keys, label: a.label })
  }
  return out
}

/** A KeyboardEvent as a registry key; null yields the chord to the browser. Shift
 *  prefixes named keys only: a printable key already carries it ("?" is "?"). */
export function keyOf(e: {
  key: string
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
}): string | null {
  if (e.altKey || e.ctrlKey || e.metaKey) return null
  return e.shiftKey && e.key.length > 1 ? `Shift+${e.key}` : e.key
}

/** `aria-keyshortcuts` for a row: named keys as-is, Shift chords joined by +. */
export function keyshortcuts(a: Action): string {
  return a.keys.map((k) => (k === " " ? "Space" : k)).join(" ")
}

/** Human key caps for `<kbd>`. A chord is `Shift+<named key>`; a bare `+` is the
 *  plus key itself. */
export function keycap(key: string): string {
  const caps: Record<string, string> = {
    " ": "space",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Escape: "esc",
    Home: "home",
    End: "end",
  }
  const parts = key.startsWith("Shift+") ? ["shift", key.slice(6)] : [key]
  return parts.map((part) => caps[part] ?? part.toLowerCase()).join(" ")
}

// Two actions sharing a key within one layer is a dispatch ambiguity: scream at load.
for (const layer of LAYERS) {
  const seen = new Set<string>()
  for (const a of ACTIONS) {
    if (a.layer !== layer) continue
    for (const k of a.keys) {
      if (seen.has(k))
        throw new Error(
          `lightbox: key "${k}" is claimed twice in layer "${layer}" (${a.id})`,
        )
      seen.add(k)
    }
  }
}
// The sheet groups by section as it walks the table: a section split in two is a
// table out of order.
{
  const seen: Section[] = []
  for (const a of ACTIONS) {
    const last = seen[seen.length - 1]
    if (a.section === last) continue
    if (seen.includes(a.section))
      throw new Error(`lightbox: section "${a.section}" is split in the table`)
    seen.push(a.section)
  }
  if (seen.join() !== SECTIONS.join())
    throw new Error("lightbox: the table walks sections out of SECTIONS order")
}
