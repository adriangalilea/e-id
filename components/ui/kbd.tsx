"use client"

// Keyboard shortcuts drawn as keys. `<Kbd keys="⌃⌥⌘A" />` draws one shortcut, in any
// notation lib/keys reads (`ctrl+alt+cmd+a`, `← →` for keys pressed in turn), and
// screams when the string is not keys. `<KeysText>` draws a sentence with its
// shortcuts as keys ("Press ⌃⌥⌘A to …"), for text that comes from somewhere else: a
// caption, a scene, a changelog. A renderer deciding between keys and code (`awake
// hotkey` is a command, not keys) asks lib/keys, `keys(text) !== null`, which a server
// component can call and this client module cannot offer it. Keys are `not-prose`: inside article
// typography they keep their own look, never a frame around the whole shortcut. Two
// materials (`material`): plain, a key with a deeper foot; glass, a small key of the
// material's glass (inside a glass tooltip or menu they are glass on their own).

import { type Material, useMaterial } from "@/components/ui/material"
import { glassVariants } from "@/components/ui/material-glass"
import { capLabel, keyName, keys, type Platform, withKeys } from "@/lib/keys"
import { cn } from "@/lib/utils"

/** One key. Every measure is in em, so a cap is the same shape at any size: inline
 *  in a sentence or large over a stage. The Mac's own face draws ⌃⌥⌘ as macOS does. */
const CAP =
  "inline-flex min-w-[1.8em] items-center justify-center rounded-[0.32em] px-[0.45em] py-[0.32em] text-[0.8em] font-medium leading-none [font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif]"

/** Plain, a key with its deeper foot; glass, a small key of the material's glass,
 *  its rim the edge a plain key draws as a border. */
const CAP_FACE: Record<Material, string> = {
  plain: "border border-b-2 border-border bg-muted text-foreground/90",
  glass: cn(
    glassVariants({ shape: "surface" }),
    "text-current [--glass-blur:8px] [--glass-radius:0.32em]",
  ),
}

/** One cap: `cap` is the key as lib/keys names it (⌘, ⇧, K). `platform` prints it
 *  as that system does ("Ctrl" off a Mac, `shortcut` passes it); without one it is
 *  the Mac's glyph. The one cap every shortcut is drawn with, so a key looks the same
 *  wherever it appears. */
export function KbdCap({
  cap,
  platform = "mac",
  material,
}: {
  cap: string
  platform?: Platform
  material?: Material
}) {
  const m = useMaterial(material)
  return (
    <kbd
      data-slot="kbd-cap"
      data-material={m}
      title={keyName(cap, platform)}
      className={cn(CAP, CAP_FACE[m])}
    >
      {capLabel(cap, platform)}
    </kbd>
  )
}

function Caps({ caps, material }: { caps: string[]; material?: Material }) {
  return (
    <span className="inline-flex gap-[0.25em]">
      {caps.map((cap, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: caps repeat (⌘ ⌘), position is identity
        <KbdCap key={i} cap={cap} material={material} />
      ))}
    </span>
  )
}

export function Kbd({
  keys: text,
  material,
  className,
}: {
  keys: string
  material?: Material
  className?: string
}) {
  const combos = keys(text)
  if (!combos) throw new Error(`Kbd: "${text}" is not a keyboard shortcut`)
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "not-prose inline-flex gap-[0.5em] align-[-0.12em] font-[inherit] not-italic",
        className,
      )}
    >
      {combos.map((caps, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a sequence is positional
        <Caps key={i} caps={caps} material={material} />
      ))}
    </kbd>
  )
}

export function KeysText({
  children,
  material,
}: {
  children: string
  material?: Material
}) {
  return (
    <>
      {withKeys(children).map((part, i) =>
        "keys" in part ? (
          <kbd
            // biome-ignore lint/suspicious/noArrayIndexKey: a sentence is positional
            key={i}
            data-slot="kbd"
            className="not-prose inline-flex align-[-0.12em] font-[inherit] not-italic"
          >
            <Caps caps={part.keys} material={material} />
          </kbd>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: a sentence is positional
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}
