"use client"

import * as React from "react"
import type { WornScheme } from "@/components/ui/material-glass"

// WHAT A CONTROL IS MADE OF: plain (the page's own surfaces, shadcn's look) or glass
// (liquid glass, the material in material-glass), and the colour SCHEME it stands in.
// Every base control takes `material` and `scheme` and draws the face they name; its
// behaviour is written once and is the same in both. A page, a panel or a player sets
// them for everything inside it with <MaterialProvider>, the theme; a prop on one
// control overrides it there. Nothing set, a control is plain, in the page's scheme.
//
//   <MaterialProvider material="glass" scheme="dark">   a player's chrome
//     <Button>save</Button>               glass, dark: from the provider
//     <Button material="plain">…</Button>  plain, its own choice, still dark
//   </MaterialProvider>
//
// A provider that names only one of the two keeps the other from the one around it.
//
// A SURFACE NEVER DECIDES ITS SCHEME; something decides for it:
//
//   auto          the page (its theme, the system's or a toggle's)
//   light, dark   the author, whatever the page is
//   backdrop      the pixels behind it: a picture under the surface, measured live
//
// Whoever decides, a surface has its two faces and wears one (`WornScheme`, through
// `schemeOf`). `backdrop` is answered by the nearest `Backdrop` source above it (a
// VideoPicture, a <Backdrop> picture: only what holds pixels can answer), per
// surface: a control that passes its element to `useScheme` is read by the part of
// the picture under IT, one that does not by the whole picture. The source also sets
// how thick its glass is (as thick as its words need over that picture, no thicker)
// and how strongly its rim reads.

export type Material = "plain" | "glass"
export type Scheme = WornScheme | "backdrop"
export type { WornScheme }

/** The tokens' tones, for what says how a thing stands. */
export type Tone = "ok" | "warn" | "bad"
/** A tone as WORDS on a surface (a readout's value, a group's name). The tones are
 *  drawn for a mark on any ground; as words on a light one they are deepened to a
 *  lightness of at most 0.55, where they read at about 4.5:1 on white (the warn tone
 *  as it is, 0.8, read at under 2:1). The dark half is the tone itself. */
export const TONE_WORDS: Record<Tone, string> = {
  ok: "text-[oklch(from_var(--tone-ok)_min(l,0.55)_c_h)] scheme-dark:text-tone-ok",
  warn: "text-[oklch(from_var(--tone-warn)_min(l,0.55)_c_h)] scheme-dark:text-tone-warn",
  bad: "text-[oklch(from_var(--tone-bad)_min(l,0.55)_c_h)] scheme-dark:text-tone-bad",
}

const MaterialContext = React.createContext<{
  material: Material
  scheme: Scheme
}>({ material: "plain", scheme: "auto" })

/** What a picture under the surfaces answers: the scheme the pixels under an element
 *  ask for (`null`: the whole picture), now and on every change. Made by whatever
 *  holds the pixels (ui/backdrop); `watch` returns the stop. */
export interface BackdropSource {
  watch(
    element: HTMLElement | null,
    onChange: (scheme: "light" | "dark") => void,
  ): () => void
}

const BackdropContext = React.createContext<BackdropSource | null>(null)

/** Makes `source` the answer to `scheme="backdrop"` for everything inside. */
export function BackdropScope({
  source,
  children,
}: {
  source: BackdropSource
  children: React.ReactNode
}) {
  return (
    <BackdropContext.Provider value={source}>
      {children}
    </BackdropContext.Provider>
  )
}

/** Sets the material and the scheme of every control inside it. Nested, the nearest
 *  one wins, for each of the two it names. */
export function MaterialProvider({
  material,
  scheme,
  children,
}: {
  material?: Material
  scheme?: Scheme
  children: React.ReactNode
}) {
  const around = React.useContext(MaterialContext)
  const value = React.useMemo(
    () => ({
      material: material ?? around.material,
      scheme: scheme ?? around.scheme,
    }),
    [material, scheme, around.material, around.scheme],
  )
  return (
    <MaterialContext.Provider value={value}>
      {children}
    </MaterialContext.Provider>
  )
}

/** The material a control draws: its own `material` prop when given, else the
 *  nearest provider's, else plain. */
export function useMaterial(own?: Material): Material {
  const around = React.useContext(MaterialContext)
  return own ?? around.material
}

/** The scheme a control wears: its own `scheme` prop when given, else the nearest
 *  provider's, else the page's; `backdrop` answered by the picture under `element`
 *  (the control's root; unset, the whole picture). Dark until the picture has been
 *  read, the scheme of a picture still loading. */
export function useScheme(
  own?: Scheme,
  element?: HTMLElement | null,
): WornScheme {
  const around = React.useContext(MaterialContext)
  const source = React.useContext(BackdropContext)
  const asked = own ?? around.scheme
  if (asked === "backdrop" && !source)
    throw new Error(
      'scheme="backdrop" with no picture above to read: place it inside a VideoPicture or a <Backdrop>, or name a scheme',
    )
  const [seen, setSeen] = React.useState<"light" | "dark">("dark")
  React.useEffect(() => {
    if (asked !== "backdrop" || !source) return
    return source.watch(element ?? null, setSeen)
  }, [asked, source, element])
  return asked === "backdrop" ? seen : asked
}

/** A SURFACE's scheme: `useScheme` read by the surface's own element, and the ref
 *  that element takes (merged with the consumer's `ref`). Every control that is a
 *  surface or stands alone wears it on its root:
 *
 *    const [s, here] = useSurfaceScheme(scheme, ref)
 *    return <div ref={here} className={cn(schemeOf(s), …)} />
 */
export function useSurfaceScheme<T extends HTMLElement>(
  own?: Scheme,
  ref?: React.Ref<T>,
): [WornScheme, (node: T | null) => void] {
  const [element, setElement] = React.useState<T | null>(null)
  const scheme = useScheme(own, element)
  const here = React.useCallback(
    (node: T | null) => {
      setElement(node)
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  return [scheme, here]
}
