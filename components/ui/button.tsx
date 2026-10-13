"use client"

import { Button as BaseButton } from "@base-ui/react/button"
import { useRender } from "@base-ui/react/use-render"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import {
  glassStyle,
  glassVariants,
  schemeOf,
} from "@/components/ui/material-glass"
import { Spinner, type SpinnerSize } from "@/components/ui/spinner"

// THE BUTTON, one behaviour in two materials. Base UI's button underneath, so it is a
// real <button> (or, with `render`, a link that behaves as one), keeps its focus when
// a `loading` press makes it wait, and reports `data-disabled`. shadcn's six variants
// and its sizes, with two differences, both so a row of controls reads as one:
//
//   the heights are the input's (28, 32, 40 px), so a field and its button sit flush
//   in a row (shadcn's 32/36/40 leave the default a step taller than its field);
//   the colours are the registry's: the page's own foreground at alpha tiers for the
//   quiet variants, `tone-bad` (@ag/tokens) for destructive, one red everywhere.
//
// `material="glass"` draws the same button in liquid glass (material-glass): the
// collection's look, its rim lighting up under the hand, a press swelling it on a
// spring. Each variant keeps its meaning there: default is the glass itself, secondary
// a quieter glass, outline the rim alone, ghost nothing until the hand comes,
// destructive a glass stained red, link a line of text.
//
// `pressed` makes it a toggle: on, it wears the text's colour faintly, in its fill or
// its glass, never a change of size. Its state is said ONE way: `aria-pressed` on a
// fixed name, or, with `on`/`off`, the name itself changing ("follow", "following")
// and no aria-pressed, which would say it twice. `loading` keeps its width (the label
// stays, unseen but still its name) and turns a spinner in its middle; it cannot be
// pressed again. `scheme` is the colour scheme it stands in (material).

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link"
export type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon" | "icon-lg"
export type ButtonCorners = "pill" | "soft"

/** Every button, whatever it wears. An icon inside takes the size's icon size unless
 *  it sets one. */
const BASE =
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap font-medium select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"

const SIZE: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
  md: "h-8 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-4",
  lg: "h-10 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
  "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
  icon: "size-8 [&_svg:not([class*='size-'])]:size-4",
  "icon-lg": "size-10 [&_svg:not([class*='size-'])]:size-[18px]",
}

/** A glass pill's radius, half of `SIZE`'s height. */
const GLASS_PILL: Record<ButtonSize, string> = {
  sm: "[--glass-radius:14px]",
  md: "[--glass-radius:16px]",
  lg: "[--glass-radius:20px]",
  "icon-sm": "[--glass-radius:14px]",
  icon: "[--glass-radius:16px]",
  "icon-lg": "[--glass-radius:20px]",
}

const SPINNER: Record<ButtonSize, SpinnerSize> = {
  sm: "sm",
  md: "md",
  lg: "md",
  "icon-sm": "sm",
  icon: "md",
  "icon-lg": "lg",
}

/** The plain faces: shadcn's default as the page's primary, the rest at the
 *  foreground's alpha tiers. */
const PLAIN: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 data-pressed:shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)]",
  secondary:
    "bg-foreground/8 text-foreground hover:bg-foreground/12 data-pressed:bg-foreground/16",
  outline:
    "text-foreground ring-1 ring-foreground/15 ring-inset hover:bg-foreground/5 data-pressed:bg-foreground/10",
  ghost: "text-foreground hover:bg-foreground/8 data-pressed:bg-foreground/10",
  destructive:
    "bg-tone-bad text-white hover:bg-tone-bad/90 data-pressed:shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)]",
  link: "h-auto px-0 text-foreground underline-offset-4 hover:underline",
}

/** The glass that answers the hand: its rim catches more light under the pointer and
 *  a press swells it on a spring that settles back slower than it came, as macOS
 *  glass controls do. Its rim answers to the button alone (set here, not inherited),
 *  so a card that brightens its own edge does not brighten the buttons inside it. */
const GLASS_LIVE =
  "[--glass-change-ease:cubic-bezier(0.34,1.56,0.64,1)] active:[--glass-change-duration:150ms] [--glass-moves:scale_var(--glass-change)] hover:[--glass-rim:1.5]! active:scale-[1.06] motion-reduce:active:scale-100"

/** On, a glass toggle wears the text's own colour in its glass, faintly, with a
 *  brighter rim: on and off differ in light, never in size. */
const GLASS_PRESSED =
  "data-pressed:[--glass-stain-amount:16%]! data-pressed:[--glass-stain:currentColor]! data-pressed:[--glass-rim:1.8]!"

/** The glass faces, over the material's surface. A face's dark half is the
 *  scheme's (`scheme-dark:`), never the page's alone, or a dark glass on a light
 *  page would take the light half. */
const GLASS: Record<ButtonVariant, string> = {
  default: GLASS_PRESSED,
  secondary: `[--glass-tint:rgb(238_241_245/0.4)] scheme-dark:[--glass-tint:rgb(16_16_18/0.35)] [--glass-rim:0.7] hover:[--glass-rim:1.2]! ${GLASS_PRESSED}`,
  // An outline is the glass's edge with no body under it (`edge: "only"`), and a line
  // all the way round, which the glass's specular edge (a catch of light at a
  // corner) is not: its own faint ring, in its words' colour.
  outline: `ring-1 ring-current/25 ring-inset ${GLASS_PRESSED}`,
  ghost: "",
  destructive: `text-tone-bad ${GLASS_PRESSED}`,
  link: "",
}

const hasHref = (props: unknown): boolean =>
  typeof props === "object" &&
  props !== null &&
  (props as { href?: unknown }).href !== undefined

/** A link in the button's face: the element it is handed, its own semantics kept. */
function ButtonLink({
  render,
  look,
  rest,
  children,
}: {
  render: React.ReactElement
  look: React.HTMLAttributes<HTMLElement> & Record<`data-${string}`, string>
  rest: Record<string, unknown>
  children: React.ReactNode
}) {
  const { ref, ...other } = rest as { ref?: React.Ref<HTMLElement> }
  return useRender({ render, ref, props: { ...other, ...look, children } })
}

export type ButtonProps = Omit<
  React.ComponentProps<typeof BaseButton>,
  "className" | "style"
> & {
  style?: React.CSSProperties
  variant?: ButtonVariant
  size?: ButtonSize
  /** A pill, or soft corners. Default: soft when plain, a pill in glass. */
  corners?: ButtonCorners
  material?: Material
  /** The colour scheme it stands in: the page's, or dark over a picture. Default
   *  the nearest MaterialProvider's. */
  scheme?: Scheme
  /** A toggle's state: on or off. Unset, it is a plain button. */
  pressed?: boolean
  /** A toggle's words on and off ("following", "follow"). Given both, the button
   *  holds the width of the wider, both laid in one cell with the other hidden, so
   *  pressing it never moves what sits beside it; `children` is then unused. */
  on?: React.ReactNode
  off?: React.ReactNode
  /** The press is being answered: a spinner in its middle, its width kept, no
   *  second press. */
  loading?: boolean
  className?: string
}

/** Inside a glass ButtonGroup: the group is the pane, so a button in it draws none
 *  of its own. */
const InGlassGroup = React.createContext(false)

/** A button that is a part of a glass group: no glass of its own, lit under the hand,
 *  its outer ends rounded as the group's pane is (the group's radius, inherited). */
const GLASS_PART =
  "rounded-none first:rounded-l-(--glass-radius) last:rounded-r-(--glass-radius) text-current transition-colors hover:bg-foreground/8 data-pressed:bg-foreground/12"

/** Buttons joined into one: a split button (an action, and its options under a
 *  chevron), or a run of actions read as one control.
 *
 *    <ButtonGroup>
 *      <Button>Visit</Button>
 *      <Button size="icon" aria-label="every domain"><ChevronDown /></Button>
 *    </ButtonGroup>
 *
 *  Plain, each button keeps its own face, the corners where two meet square and a
 *  hairline between them. Glass, the group is ONE pane of glass and its buttons its
 *  parts, lit under the hand: a glass face states one corner radius, so two joined
 *  panes could only be two pills touching. */
export function ButtonGroup({
  material,
  scheme,
  size = "md",
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<"div"> & {
  material?: Material
  scheme?: Scheme
  /** The size of the buttons it holds, which sets a glass pane's pill radius. */
  size?: ButtonSize
}) {
  const m = useMaterial(material)
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme, ref)
  const glass = m === "glass"
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset groups form fields; a run of action buttons is a group
    <div
      ref={here}
      role="group"
      data-slot="button-group"
      data-material={m}
      className={cn(
        "inline-flex items-stretch",
        schemeOf(s),
        glass
          ? [
              glassVariants({ shape: "surface" }),
              GLASS_PILL[size],
              "[&>*+*]:border-current/15 [&>*+*]:border-l",
            ]
          : [
              "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none",
              // Outlines draw their own edges: two side by side overlap by one pixel,
              // so their meeting edges are one line, never two.
              "[&>[data-variant=outline]+[data-variant=outline]]:-ml-px",
              // Solid faces meet with a hairline between them.
              "[&>*+*:not([data-variant=outline])]:border-current/15 [&>*+*:not([data-variant=outline])]:border-l",
            ],
        className,
      )}
      {...props}
    >
      <InGlassGroup.Provider value={glass}>{children}</InGlassGroup.Provider>
    </div>
  )
}

export function Button({
  variant = "default",
  size = "md",
  corners,
  material,
  scheme,
  pressed,
  on,
  off,
  loading = false,
  disabled,
  render,
  nativeButton,
  className,
  style,
  children: words,
  ref,
  ...props
}: ButtonProps) {
  const m = useMaterial(material)
  // Over a picture it is read by the part of it under the button.
  const [s, own] = useSurfaceScheme<HTMLElement>(scheme, ref)
  const worded = on !== undefined && off !== undefined
  const face = (node: React.ReactNode, shown: boolean) => (
    <span
      aria-hidden={!shown}
      className={cn(
        "col-start-1 row-start-1 inline-flex items-center justify-center gap-[inherit]",
        !shown && "invisible",
      )}
    >
      {node}
    </span>
  )
  const children = worded ? (
    <span className="grid gap-[inherit]">
      {face(on, pressed === true)}
      {face(off, pressed !== true)}
    </span>
  ) : (
    words
  )
  const part = React.useContext(InGlassGroup)
  const glass =
    !part && m === "glass" && variant !== "link" && variant !== "ghost"
  const pill = (corners ?? (m === "glass" ? "pill" : "soft")) === "pill"
  // Glass states its radius, which places its light too: a pill's is half its
  // height (an icon size is square, its pill a circle).
  const round = part
    ? undefined
    : glass
      ? pill
        ? GLASS_PILL[size]
        : "[--glass-radius:10px]"
      : pill
        ? "rounded-full"
        : m === "glass"
          ? "rounded-[10px]"
          : "rounded-md"
  const look = {
    "data-slot": "button",
    "data-variant": variant,
    "data-material": m,
    style:
      variant === "destructive" && m === "glass"
        ? {
            ...glassStyle({ tint: "var(--tone-bad)" }),
            ...style,
          }
        : style,
    className: cn(
      BASE,
      SIZE[size],
      schemeOf(s),
      variant !== "link" && round,
      glass && [
        glassVariants({
          shape: "surface",
          edge: variant === "outline" ? "only" : true,
        }),
        GLASS_LIVE,
      ],
      part
        ? GLASS_PART
        : m === "glass"
          ? variant === "ghost"
            ? "text-current transition-colors hover:bg-foreground/8 data-pressed:bg-foreground/12"
            : GLASS[variant]
          : ["transition-[color,background-color,box-shadow]", PLAIN[variant]],
      variant === "link" && PLAIN.link,
      className,
    ),
  }
  // A link wearing the button's look stays a link: Base UI's button gives anything
  // that is not a <button> `role="button"`, and a screen reader then calls the hero's
  // "read the essay" a button. It is never disabled, loading or a toggle; asked to be,
  // it screams.
  if (React.isValidElement(render) && hasHref(render.props)) {
    if (disabled || loading || pressed !== undefined || on || off)
      throw new Error(
        "Button: a link (render with an href) is never disabled, loading or a toggle",
      )
    return (
      <ButtonLink render={render} look={look} rest={{ ...props, ref: own }}>
        {children}
      </ButtonLink>
    )
  }
  return (
    <BaseButton
      {...look}
      data-loading={loading || undefined}
      data-pressed={pressed || undefined}
      aria-pressed={worded ? undefined : pressed}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      // Waiting, it keeps the focus the press gave it: a keyboard user is not
      // thrown back to the page's start while the work runs.
      focusableWhenDisabled={loading}
      render={render}
      nativeButton={nativeButton ?? render === undefined}
      {...props}
      ref={own}
    >
      {loading ? (
        // The label stays the button's name (transparent, never `invisible`, which
        // would take it out of the accessibility tree and leave "loading" as the
        // name); the spinner is the eye's, aria-busy already says it.
        <>
          <span className="inline-flex items-center gap-[inherit] opacity-0">
            {children}
          </span>
          <span aria-hidden className="absolute grid place-items-center">
            <Spinner size={SPINNER[size]} material={m} />
          </span>
        </>
      ) : (
        children
      )}
    </BaseButton>
  )
}
