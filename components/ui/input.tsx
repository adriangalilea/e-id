"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
  type WornScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import {
  GHOST_EDGE,
  GLASS_GHOST,
  useSetting,
} from "@/components/ui/setting-context"

// A text field that looks like one: a sunken well (a faint fill and a hairline ring
// inset), the ring brightening under the hand and clear on focus, red when the value
// is wrong (`aria-invalid`). At the button's heights, so a field and its button sit
// as one row. `Input` alone, or inside `InputGroup` with things before and after it
// (an icon, a unit, a key, a clear button) that stay inside the well.
//
// `material="glass"`: a well of glass, a pill like the glass button beside it, its
// rim catching more light under the hand and more again while you type in it, red
// light on the rim when the value is wrong. The glass is the field's wrapper, never
// the <input>: an input draws no ::before, where the glass's rim lives.
//
// Inside a `Setting` whose value is inherited, the field is empty and its
// placeholder is the value that applies, drawn as a value (a ghost: the well
// dashed, the words a step back), not a hint; emptied, it clears what is set here.

export type InputSize = "sm" | "md" | "lg"

const HEIGHT: Record<InputSize, string> = {
  sm: "h-7 text-[12px]",
  md: "h-8 text-[13px]",
  lg: "h-10 text-sm",
}
const PAD: Record<InputSize, string> = {
  sm: "px-2",
  md: "px-2.5",
  lg: "px-3",
}
/** A pill's ends are rounder: the glass field's text stands further in. Its radius
 *  is half its height. */
const GLASS_PAD: Record<InputSize, string> = {
  sm: "px-3 [--glass-radius:14px]",
  md: "px-3.5 [--glass-radius:16px]",
  lg: "px-4 [--glass-radius:20px]",
}

/** The well: everything that makes a box read as a field, on whatever holds it (a
 *  field of chips wears it too, chip-input). */
export const WELL =
  "rounded-md bg-foreground/[0.04] ring-1 ring-foreground/12 ring-inset transition-[box-shadow,background-color] hover:ring-foreground/22 has-[input:focus-visible]:bg-foreground/[0.06] has-[input:focus-visible]:ring-foreground/40 has-[input[aria-invalid=true]]:ring-tone-bad/70 has-[input:disabled]:opacity-50"

/** The well in glass. A text field's focus is its rim catching light whichever way
 *  focus came (you type where it is, so a click is as much focus as a Tab); wrong, the
 *  rim takes the registry's red. */
export const GLASS_WELL =
  "hover:[--glass-rim:1.3]! focus-within:[--glass-rim:1.7]! has-[input[aria-invalid=true]]:[--glass-stain:var(--tone-bad)]! has-[input[aria-invalid=true]]:[--glass-rim-color:var(--tone-bad)]! has-[input[aria-invalid=true]]:[--glass-rim:2.2]! has-[input:disabled]:opacity-50"

/** The bare text, for inside a well. */
const FIELD =
  "min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"

/** Inherited (inside a `Setting`, nothing set here): the field is empty and its
 *  placeholder IS the value that applies, so it reads as a value, not a hint: in
 *  the words' ink a step back (a hint's is fainter), the well unfilled and dashed;
 *  glass, the material's ghost. */
const GHOST: Record<Material, string> = {
  plain: cn(
    "relative bg-transparent ring-0 [&_input]:placeholder:text-foreground/60",
    GHOST_EDGE,
  ),
  glass: cn(GLASS_GHOST, "[&_input]:placeholder:text-current/60"),
}

/** What a setting around the field changes: empty and with the fallback as its
 *  placeholder while inherited, emptied it clears, read-only while locked,
 *  described by where its value comes from. */
function useSettingInput({
  value,
  placeholder,
  readOnly,
  onChange,
  "aria-describedby": describedBy,
}: InputProps) {
  const setting = useSetting()
  if (!setting) return { ghost: false, props: {} }
  const ghost = setting.inherited
  return {
    ghost,
    props: {
      value: ghost ? "" : value,
      placeholder: setting.fallback
        ? String(setting.fallback.value)
        : placeholder,
      readOnly: readOnly || setting.readOnly,
      "aria-describedby":
        [describedBy, setting.says].filter(Boolean).join(" ") || undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value === "" && setting.clear) setting.clear()
        else onChange?.(e)
      },
    } satisfies Partial<InputProps>,
  }
}

export type InputProps = Omit<React.ComponentPropsWithRef<"input">, "size"> & {
  size?: InputSize
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
}

/** The wrapper's face in either material, in its scheme. */
function well(m: Material, size: InputSize, s: WornScheme) {
  return m === "glass"
    ? [
        schemeOf(s),
        glassVariants({ shape: "surface" }),
        GLASS_WELL,
        GLASS_PAD[size],
        "[&_input]:placeholder:text-current/40",
      ]
    : [schemeOf(s), WELL, PAD[size], "[&_input]:placeholder:text-foreground/35"]
}

/** A field on its own: the well and the text are one element. */
export function Input({
  size = "md",
  material,
  scheme,
  className,
  ...props
}: InputProps) {
  const m = useMaterial(material)
  // Over a picture the well is read by the part of it under the well; `ref` is the
  // <input>'s.
  const [s, here] = useSurfaceScheme<HTMLSpanElement>(scheme)
  const setting = useSettingInput(props)
  return (
    <span
      ref={here}
      data-slot="input"
      data-size={size}
      data-material={m}
      data-inherited={setting.ghost ? "" : undefined}
      className={cn(
        "flex items-center",
        HEIGHT[size],
        well(m, size, s),
        setting.ghost && GHOST[m],
        className,
      )}
    >
      <input className={FIELD} {...props} {...setting.props} />
    </span>
  )
}

/** A field with things in the well beside the text: `start` before it (an icon), `end`
 *  after it (a unit, a key, a clear button), set a little apart; `prefix`, text the
 *  value continues (`github.com/`, `@`), joined to it with no gap at all, so the two
 *  read as one address. They sit quiet, in the field's height. */
export function InputGroup({
  size = "md",
  material,
  scheme,
  start,
  prefix,
  end,
  className,
  ...props
}: Omit<InputProps, "prefix"> & {
  start?: React.ReactNode
  /** Text the value continues, joined to it: never a gap between them. */
  prefix?: React.ReactNode
  end?: React.ReactNode
}) {
  const m = useMaterial(material)
  const [s, here] = useSurfaceScheme<HTMLSpanElement>(scheme)
  const setting = useSettingInput(props)
  const quiet = m === "glass" ? "text-current/55" : "text-foreground/45"
  return (
    <span
      ref={here}
      data-slot="input-group"
      data-size={size}
      data-material={m}
      data-inherited={setting.ghost ? "" : undefined}
      className={cn(
        "flex items-center gap-1.5",
        HEIGHT[size],
        well(m, size, s),
        setting.ghost && GHOST[m],
        "[&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
    >
      {/* What sits in the well stands on the well: it wears the well's scheme. */}
      <MaterialProvider scheme={s}>
        {start && (
          <span
            data-slot="input-start"
            className={cn("flex shrink-0 items-center", quiet)}
          >
            {start}
          </span>
        )}
        {prefix ? (
          // The prefix and the value in one run of text: the group's gap is
          // between things beside the text, never inside it.
          <span className="flex min-w-0 flex-1 items-center">
            <span
              data-slot="input-prefix"
              className={cn("shrink-0 whitespace-pre", quiet)}
            >
              {prefix}
            </span>
            <input className={FIELD} {...props} {...setting.props} />
          </span>
        ) : (
          <input className={FIELD} {...props} {...setting.props} />
        )}
        {end && (
          <span
            data-slot="input-end"
            className={cn("flex shrink-0 items-center", quiet)}
          >
            {end}
          </span>
        )}
      </MaterialProvider>
    </span>
  )
}
