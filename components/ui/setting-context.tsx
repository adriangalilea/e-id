"use client"

import * as React from "react"

// WHAT A VALUE CONTROL READS FROM THE SETTING AROUND IT, and nothing else: the
// context `setting` provides, its own item so a switch, a number or a select can
// read it without installing the setting's slot, keys and words. The way a control
// reads `useField()` for its label, it reads `useSetting()` for where its value
// comes from.
//
// Inside a setting a value control:
//   inherited  draws its INHERITED face: a ghost of the value that applies (a
//              dashed edge plain, `--glass-ghost` in glass, its mark hollow, the
//              same colour at less strength), `data-inherited` on its root
//   says       is described by it (`aria-describedby`): where the value comes from
//   readOnly   holds still (locked here): takes no change, keeps its focus, is read
//              by a screen reader; never disabled
//   clear      what an empty commit does (a number, a text field) or a list's
//              "inherit" entry; null where there is nothing to clear
//   fallback   what applies when nothing is set here, and who says so
//
// The value itself is never in here: it reaches the control through its own props
// (the setting's render prop hands them over), so a control has one source for it.

/** What applies when nothing is set here, and who says so ("lark", "the fleet"). */
export interface Fallback<T> {
  value: T
  from: string
}

/** What a control inside a setting reads (`useSetting()`). */
export interface SettingContextValue {
  /** Nothing is set here: the fallback applies, drawn as a ghost. */
  inherited: boolean
  /** Locked here (set somewhere else): a readout. Never disabled. */
  readOnly: boolean
  /** The id of the words that say where the value comes from, for the control's
   *  `aria-describedby`; undefined at the root, which has nothing to say. */
  says: string | undefined
  /** Clear back to the fallback; null while inherited, locked, or at the root. */
  clear: (() => void) | null
  /** What applies when nothing is set here; null at the root of the chain. */
  fallback: Fallback<unknown> | null
}

export const SettingContext = React.createContext<SettingContextValue | null>(
  null,
)

/** The setting around a control, or null outside one. */
export const useSetting = () => React.useContext(SettingContext)

/** The setting as a value control's own props, spread after a field's and before
 *  the consumer's: described by where the value comes from (beside what describes
 *  it already, `around`), read-only while locked. */
export function settingProps(
  setting: SettingContextValue | null,
  around?: string,
): { "aria-describedby"?: string; readOnly?: boolean } {
  if (!setting) return {}
  const described = [around, setting.says].filter(Boolean).join(" ")
  return {
    ...(described ? { "aria-describedby": described } : {}),
    ...(setting.readOnly ? { readOnly: true } : {}),
  }
}

/** The plain face's ghost edge: a dashed line round the control in its own ink at
 *  less than half strength, on `::before` (a plain face draws nothing there; glass,
 *  whose edge is its light on both pseudo-elements, wears `--glass-ghost` instead).
 *  On a positioned element, rounded as the control is. One spelling for every
 *  control, so every inherited value reads alike. */
export const GHOST_EDGE =
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-dashed before:border-current/45 before:content-['']"

/** The glass face's ghost: the material's own state (thinner body, softer rim,
 *  fainter stain), since a glass rim is light and cannot be dashed. */
export const GLASS_GHOST = "[--glass-ghost:1]"
