"use client"

import { Switch as BaseSwitch } from "@base-ui/react/switch"
import type * as React from "react"
import { fieldProps, useField } from "@/components/ui/field-context"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import {
  GHOST_EDGE,
  GLASS_GHOST,
  settingProps,
  useSetting,
} from "@/components/ui/setting-context"
import { cn } from "@/lib/utils"

// On or off, at once (Base UI's switch: a hidden input a form submits, Space and Enter
// flip it). A setting that takes effect the moment it changes is a switch; a choice
// that waits for a form's submit is a checkbox. Given `children`, the switch and its
// words are one label.
//
// Plain: a track in the field's well tone, the page's primary when on, a round thumb
// that slides across. `material="glass"`: a track of glass, lit and coloured by the
// text when on, the thumb a bright bead riding over it. Inside a `Setting` whose
// value is inherited, a ghost of the value that applies: the thumb hollow where the
// value puts it, the track faint and dashed (glass: the material's ghost).

export type SwitchSize = "sm" | "md" | "lg"

/** The track, its thumb, and how far the thumb travels: the track less its padding
 *  (2 px a side) less the thumb. */
const TRACK: Record<SwitchSize, string> = {
  sm: "h-4 w-7",
  md: "h-5 w-9",
  lg: "h-6 w-11",
}
/** The glass track's radius, half of `TRACK`'s height. */
const GLASS_RADIUS: Record<SwitchSize, string> = {
  sm: "[--glass-radius:8px]",
  md: "[--glass-radius:10px]",
  lg: "[--glass-radius:12px]",
}
const THUMB: Record<SwitchSize, string> = {
  sm: "size-3 data-checked:translate-x-3",
  md: "size-4 data-checked:translate-x-4",
  lg: "size-5 data-checked:translate-x-5",
}
const WORDS: Record<SwitchSize, string> = {
  sm: "gap-1.5 text-[12px]",
  md: "gap-2 text-[13px]",
  lg: "gap-2.5 text-sm",
}

const PLAIN =
  "bg-foreground/15 transition-colors hover:bg-foreground/22 data-checked:bg-primary data-checked:hover:bg-primary/90 aria-invalid:ring-1 aria-invalid:ring-tone-bad/70 data-invalid:ring-1 data-invalid:ring-tone-bad/70"
const GLASS =
  "hover:[--glass-rim:1.4]! data-checked:[--glass-stain:currentColor]! data-checked:[--glass-stain-amount:30%]! data-checked:[--glass-rim:1.8]! aria-invalid:[--glass-stain:var(--tone-bad)]! aria-invalid:[--glass-rim-color:var(--tone-bad)]! aria-invalid:[--glass-rim:2.2]! data-invalid:[--glass-stain:var(--tone-bad)]! data-invalid:[--glass-rim-color:var(--tone-bad)]! data-invalid:[--glass-rim:2.2]!"

const PLAIN_THUMB =
  "bg-background shadow-[0_1px_2px_rgb(0_0_0/0.25)] scheme-dark:data-checked:bg-primary-foreground scheme-dark:data-unchecked:bg-foreground/85"
const GLASS_THUMB =
  "bg-white shadow-[0_1px_3px_rgb(0_0_0/0.35),inset_0_-1px_1px_rgb(0_0_0/0.08)]"

/** Inherited (inside a `Setting`, nothing set here): a ghost of the value that
 *  applies. The track's colour at a fifth and a dashed edge plain, the material's
 *  ghost in glass; the thumb hollow, in the colour it would be filled with, where
 *  the value puts it. */
const PLAIN_GHOST = cn(
  "bg-transparent hover:bg-foreground/6 data-checked:bg-primary/20 data-checked:hover:bg-primary/26",
  GHOST_EDGE,
)
const GHOST_THUMB =
  "bg-transparent ring-[1.5px] ring-foreground/45 ring-inset data-checked:ring-primary"
const GLASS_GHOST_THUMB =
  "bg-transparent ring-[1.5px] ring-current/75 ring-inset"

export type SwitchProps = Omit<
  React.ComponentProps<typeof BaseSwitch.Root>,
  "className" | "children"
> & {
  size?: SwitchSize
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  /** Its words: the switch and these are one label. */
  children?: React.ReactNode
  className?: string
}

export function Switch({
  size = "md",
  material,
  scheme,
  children,
  className,
  ref,
  ...props
}: SwitchProps) {
  const m = useMaterial(material)
  // Over a picture it is read by the part of it under the track, the surface; its
  // words beside it wear the same.
  const [s, here] = useSurfaceScheme<HTMLElement>(scheme, ref)
  const field = useField()
  // Inside a setting: the value that applies drawn as a ghost while it is
  // inherited, described by where it comes from, read-only while locked there.
  const setting = useSetting()
  const ghost = setting?.inherited ?? false
  const glass = m === "glass"
  const wired = fieldProps(field, { named: !children })
  const track = (
    <BaseSwitch.Root
      ref={here}
      data-slot="switch"
      data-size={size}
      data-material={m}
      data-inherited={ghost ? "" : undefined}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 data-disabled:cursor-not-allowed data-readonly:cursor-default",
        TRACK[size],
        // With its words the label wears the scheme, the track inside it with them.
        !children && schemeOf(s),
        glass
          ? [
              glassVariants({ shape: "surface" }),
              GLASS,
              GLASS_RADIUS[size],
              ghost && GLASS_GHOST,
            ]
          : [PLAIN, ghost && PLAIN_GHOST],
        !children && ["data-disabled:opacity-50", className],
      )}
      // Inside a field: its wiring and read-only, named by the field's label unless
      // its own words name it; what is passed here wins.
      {...wired}
      {...settingProps(setting, wired["aria-describedby"])}
      {...props}
    >
      <BaseSwitch.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full transition-[translate,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.34,1.36,0.64,1)] motion-reduce:transition-none",
          THUMB[size],
          ghost
            ? glass
              ? GLASS_GHOST_THUMB
              : GHOST_THUMB
            : glass
              ? GLASS_THUMB
              : PLAIN_THUMB,
        )}
      />
    </BaseSwitch.Root>
  )
  if (!children) return track
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the switch inside is its control
    <label
      data-slot="switch-label"
      className={cn(
        "inline-flex cursor-pointer select-none items-center has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50",
        schemeOf(s),
        WORDS[size],
        m === "glass" ? "text-current/90" : "text-foreground/85",
        className,
      )}
    >
      {track}
      {children}
    </label>
  )
}
