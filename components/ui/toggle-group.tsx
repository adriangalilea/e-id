"use client"

import { Toggle as BaseToggle } from "@base-ui/react/toggle"
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group"
import * as React from "react"
import { useField } from "@/components/ui/field-context"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import {
  glassEdge,
  glassLift,
  glassVariants,
  schemeOf,
} from "@/components/ui/material-glass"
import { GLASS_GHOST, useSetting } from "@/components/ui/setting-context"
import { cn } from "@/lib/utils"

// A few options side by side in one bar, a segmented control (Base UI's toggle group:
// toggle buttons, one Tab stop, the arrow keys moving between them).
//
//   one       `value` is one option, always one once chosen (pressing the chosen one
//             keeps it): a highlight GLIDES to it, so a change reads as one thing
//             moving, never two states blinking.
//   multiple  `value` is a set: each pressed option lit on its own (bold, italic).
//
// Plain: a sunken well, the chosen lifted out of it as the page's own surface.
// `material="glass"`: a bar of glass, the chosen a lit pane inside it. At the input's
// heights, so it sits in a form's row as a field does. `readOnly`: shown, never
// changed (a press changes nothing, the Tab stop and the arrows stay). Inside a
// `Setting` whose value is inherited, the mark on the option that applies is a
// ghost, hollow and dashed (glass: the material's ghost), and pressing that option
// sets it there.
//
// Two looks (`variant`): `segment`, the bar above; `dots`, each option a dot and the
// chosen one stretched into a short pill (a carousel's pager, a story's acts), its
// words kept for a screen reader only, its target still a comfortable 24 px.
//
//   <ToggleGroup variant="dots" value={act} onValueChange={seek}>
//     {acts.map((a) => <ToggleGroupItem key={a.id} value={a.id}>{a.title}</ToggleGroupItem>)}
//   </ToggleGroup>

export type ToggleGroupSize = "sm" | "md" | "lg"
export type ToggleGroupVariant = "segment" | "dots"

/** A dot, and the chosen one stretched: the text's colour at a low alpha, lit and
 *  wider when chosen, the width easing on the same curve as the segment's glide.
 *  Glass: the same in the glass's words' colour, the chosen one with the rim's
 *  light round it. */
const DOT = cn(
  "block h-1.5 w-1.5 rounded-full bg-current/30 transition-[width,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
  "group-hover/toggle:bg-current/55 group-data-pressed/toggle:w-4 group-data-pressed/toggle:bg-current/90",
)
const GLASS_DOT =
  "group-data-pressed/toggle:shadow-[0_0_6px_color-mix(in_oklab,currentColor_55%,transparent)]"

const BAR: Record<ToggleGroupSize, string> = {
  sm: "h-7 text-[12px]",
  md: "h-8 text-[13px]",
  lg: "h-10 text-sm",
}
const ITEM: Record<ToggleGroupSize, string> = {
  sm: "h-6 px-2 [&_svg:not([class*='size-'])]:size-3.5",
  md: "h-7 px-2.5 [&_svg:not([class*='size-'])]:size-3.5",
  lg: "h-9 px-3.5 [&_svg:not([class*='size-'])]:size-4",
}

const PLAIN_BAR = "rounded-lg bg-foreground/[0.06]"
/** The glass bar is a pill: its radius half of `BAR`'s height. */
const GLASS_BAR: Record<ToggleGroupSize, string> = {
  sm: "[--glass-radius:14px]",
  md: "[--glass-radius:16px]",
  lg: "[--glass-radius:20px]",
}
/** What lifts the chosen: the page's surface in the well, a lit pane in the glass
 *  (`glassLift`, the glass's own edge). One element either way: the highlight that
 *  glides to the one chosen, or each pressed option's own where several can be. */
const LIFT: Record<Material, string> = {
  plain:
    "rounded-md bg-background shadow-[0_1px_2px_rgb(0_0_0/0.15)] ring-1 ring-foreground/8 scheme-dark:bg-foreground/12",
  glass: glassLift,
}
/** The glass lift is a pill: its radius half of `ITEM`'s height. */
const LIFT_RADIUS: Record<ToggleGroupSize, string> = {
  sm: "[--glass-radius:12px]",
  md: "[--glass-radius:14px]",
  lg: "[--glass-radius:18px]",
}

/** Inherited (inside a `Setting`, nothing set here): the mark on the option that
 *  applies is a ghost, hollow. Plain, a dashed outline where the lift would be;
 *  glass, the lit pane at the material's ghost, its fill a third as strong. */
const GHOST_LIFT: Record<Material, string> = {
  plain: "rounded-md border border-dashed border-current/45",
  glass: cn("bg-current/4", glassEdge, GLASS_GHOST),
}

const Group = React.createContext<{
  size: ToggleGroupSize
  variant: ToggleGroupVariant
  material: Material
  multiple: boolean
  ghost: boolean
} | null>(null)

type One = {
  multiple?: false
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string) => void
}
type Many = {
  multiple: true
  value?: readonly string[]
  defaultValue?: readonly string[]
  onValueChange?: (value: string[]) => void
}

export type ToggleGroupProps = (One | Many) & {
  size?: ToggleGroupSize
  /** `segment` (default), a bar; `dots`, a dot per option (`ToggleGroupVariant`). */
  variant?: ToggleGroupVariant
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  disabled?: boolean
  /** Shown, never changed here: a press changes nothing, the options stay in the
   *  Tab order and the arrows still move between them. Never dimmed (that is
   *  `disabled`). A field's read-only and a locked setting's hold it the same way. */
  readOnly?: boolean
  /** What is being chosen, for assistive tech. */
  "aria-label"?: string
  /** Or the label that names it (a field's: `aria-labelledby={c.labelId}`). */
  "aria-labelledby"?: string
  /** What else says something about it (a field's description and error). */
  "aria-describedby"?: string
  className?: string
  children: React.ReactNode
}

const list = (v: string | null | undefined) => (v ? [v] : [])

export function ToggleGroup(props: ToggleGroupProps) {
  const {
    size = "md",
    variant = "segment",
    material,
    scheme,
    disabled,
    "aria-label": label,
    className,
    children,
  } = props
  const m = useMaterial(material)
  const field = useField()
  // Inside a setting: the chosen option's mark a ghost while the value is
  // inherited, described by where it comes from, held still while locked there.
  const setting = useSetting()
  const ghost = setting?.inherited ?? false
  const readOnly =
    (props.readOnly ?? false) ||
    (field?.readOnly ?? false) ||
    (setting?.readOnly ?? false)
  const multiple = props.multiple === true
  const bar = React.useRef<HTMLDivElement>(null)
  // Over a picture the bar is read by the part of it under the bar.
  const [s, here] = useSurfaceScheme(scheme, bar)
  // One: the highlight's place, measured off the pressed option itself, so it fits
  // labels of any width.
  const [at, setAt] = React.useState<{ left: number; width: number } | null>(
    null,
  )
  React.useLayoutEffect(() => {
    if (multiple) return
    const chosen = bar.current?.querySelector<HTMLElement>(
      "[data-slot=toggle-group-item][data-pressed]",
    )
    const next = chosen
      ? { left: chosen.offsetLeft, width: chosen.offsetWidth }
      : null
    if (next?.left !== at?.left || next?.width !== at?.width) setAt(next)
  })
  // One, uncontrolled: the group holds the choice itself, not Base UI, so a press
  // renders the group and the highlight above is measured again (held inside Base UI
  // a press changed the pressed option and left the highlight where it was).
  const [own, setOwn] = React.useState(
    multiple ? null : ((props as One).defaultValue ?? null),
  )
  const controlled = props.value !== undefined
  const value = multiple
    ? (props as Many).value
    : list(controlled ? (props as One).value : own)
  const defaultValue = multiple ? (props as Many).defaultValue : undefined
  const look = React.useMemo(
    () => ({ size, variant, material: m, multiple, ghost }),
    [size, variant, m, multiple, ghost],
  )
  const dots = variant === "dots"
  const described =
    [
      props["aria-describedby"] ?? field?.wiring["aria-describedby"],
      setting?.says,
    ]
      .filter(Boolean)
      .join(" ") || undefined
  return (
    <MaterialProvider material={m} scheme={s}>
      <Group.Provider value={look}>
        <BaseToggleGroup
          ref={here}
          data-slot="toggle-group"
          data-size={size}
          data-material={m}
          data-inherited={ghost ? "" : undefined}
          data-readonly={readOnly ? "" : undefined}
          aria-label={label}
          // Inside a field: named by its label and described by it, unless named
          // here; described by a setting's words too.
          aria-labelledby={
            props["aria-labelledby"] ?? (label ? undefined : field?.labelId)
          }
          aria-describedby={described}
          aria-invalid={field?.wiring["aria-invalid"]}
          multiple={multiple}
          disabled={disabled ?? field?.wiring.disabled}
          value={value as string[] | undefined}
          defaultValue={defaultValue as string[] | undefined}
          onValueChange={(next, details) => {
            // Read-only: a press changes nothing, the focus stays where it is.
            if (readOnly) return details.cancel()
            if (multiple) return (props as Many).onValueChange?.(next)
            const [chosen] = next
            if (chosen === undefined) {
              // One, always one: pressing the chosen one keeps it. While its value
              // is inherited, that press says "this one, set here": reported.
              const kept = controlled ? (props as One).value : own
              if (ghost && kept) (props as One).onValueChange?.(kept)
              return
            }
            if (!controlled) setOwn(chosen)
            ;(props as One).onValueChange?.(chosen)
          }}
          className={cn(
            "relative inline-flex w-fit items-center data-disabled:opacity-50",
            schemeOf(s),
            dots
              ? // No bar: the dots stand on what is round them.
                "gap-0"
              : [
                  "gap-0.5 p-0.5",
                  BAR[size],
                  m === "glass"
                    ? [glassVariants({ shape: "surface" }), GLASS_BAR[size]]
                    : PLAIN_BAR,
                ],
            className,
          )}
        >
          {!multiple && !dots && (
            <span
              aria-hidden
              data-slot="toggle-group-highlight"
              className={cn(
                "pointer-events-none absolute top-0.5 bottom-0.5 transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                ghost ? GHOST_LIFT[m] : LIFT[m],
                m === "glass" && LIFT_RADIUS[size],
                at ? "opacity-100" : "opacity-0",
              )}
              style={at ?? undefined}
            />
          )}
          {children}
        </BaseToggleGroup>
      </Group.Provider>
    </MaterialProvider>
  )
}

export type ToggleGroupItemProps = Omit<
  React.ComponentProps<typeof BaseToggle>,
  "className"
> & {
  /** Its name, when it shows only a glyph. */
  "aria-label"?: string
  className?: string
}

/** One option of the group around it. */
export function ToggleGroupItem({
  className,
  children,
  ...props
}: ToggleGroupItemProps) {
  const group = React.useContext(Group)
  if (!group) throw new Error("ToggleGroupItem: place it inside a ToggleGroup")
  const glass = group.material === "glass"
  if (group.variant === "dots")
    return (
      <BaseToggle
        data-slot="toggle-group-item"
        className={cn(
          "group/toggle grid size-6 shrink-0 cursor-pointer in-data-readonly:cursor-default place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60 data-disabled:cursor-not-allowed data-disabled:opacity-50",
          className,
        )}
        {...props}
      >
        <span aria-hidden className={cn(DOT, glass && GLASS_DOT)} />
        {/* Its words, said and never shown. */}
        <span className="sr-only">{children}</span>
      </BaseToggle>
    )
  return (
    <BaseToggle
      data-slot="toggle-group-item"
      className={cn(
        "group/toggle relative isolate inline-flex shrink-0 cursor-pointer in-data-readonly:cursor-default select-none items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-[color,background-color,opacity,scale] duration-200 data-disabled:cursor-not-allowed data-disabled:opacity-50 [&_svg]:shrink-0",
        ITEM[group.size],
        glass
          ? "rounded-full ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[1.06] in-data-readonly:active:scale-100 motion-reduce:active:scale-100"
          : "rounded-md",
        // Inherited, the option that applies is lit a step less than one set here.
        glass
          ? cn(
              "opacity-60 hover:opacity-90 data-pressed:opacity-100",
              group.ghost && "data-pressed:opacity-80",
            )
          : cn(
              "text-foreground/55 hover:text-foreground/85 data-pressed:text-foreground",
              group.ghost && "data-pressed:text-foreground/75",
            ),
        className,
      )}
      {...props}
    >
      {/* Several: each pressed option lifts on its own, under its words. */}
      {group.multiple && (
        <span
          aria-hidden
          data-slot="toggle-group-lift"
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-200 group-data-pressed/toggle:opacity-100 motion-reduce:transition-none",
            group.ghost ? GHOST_LIFT[group.material] : LIFT[group.material],
            glass && LIFT_RADIUS[group.size],
          )}
        />
      )}
      {children}
    </BaseToggle>
  )
}
