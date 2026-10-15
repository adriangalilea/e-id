"use client"

import { useRender } from "@base-ui/react/use-render"
import * as React from "react"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import {
  GlassEdge,
  type GlassLight,
  GlassSpill,
  type GlassStyle,
  glassFront,
  glassStyle,
  glassVariants,
  schemeOf,
} from "@/components/ui/material-glass"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// THE CONTAINER: a surface that holds one thing. shadcn's Card, by another name (in
// this registry a name is a family, and `card-gallery`, `card-link` are their own
// items). Every box in the registry is this one, in either material: plain, the
// page's card with its hairline; glass, the material's glass, rounder, as glass is.
// Glass is a face of the panel, never a family of its own.
//
// What it is, above what it holds: `title`, a line under it (`description`),
// something to do with it beside them (`action`), what ends it (`footer`). Props, not
// five components to assemble, because a card's head is always the same three things
// in the same places.
//
// Its FRONT SURFACES: a `head` across its top and a `foot` along its bottom, strips of
// the panel itself, not pieces laid on it (a tab list, a board's column names, a
// card's buttons). In glass each is the material's front (`glassFront`): its own blur
// over what passes under it, one lit hairline as its inner edge, the panel's edge
// unbroken over both. Plain, a solid strip a step darker than the card. A head is
// `headHeight` tall (3rem), a foot `footHeight`, told to what it holds as
// `--panel-head` and `--panel-foot`; what pins under the head (a table's header row)
// pins at `--panel-under`.
//
//   <Panel material="glass" head={<TabsList>…</TabsList>} maxHeight="30rem">…</Panel>
//
// It SCROLLS when it is given a height: `maxHeight` (it grows to the cap, then
// scrolls) or `height` (it keeps it whatever it holds; what fills it, a log, scrolls
// itself). Its body is then the one capped scroller (`ScrollArea`), the head and the
// foot laid OVER it, so what scrolls passes beneath them and comes out from under them:
// in glass blurred by them, plain hidden by them. Never a front inside the scroller:
// a plain scroller's fade is a mask, which makes it a backdrop root, and a glass front
// inside it would blur nothing. Long ones wear thumbs (`thumb`, on).
// Growing with what it holds, its head can PIN to the page while the body scrolls
// under it (`pin`, a CSS length: below a site header). Plain, its frame is then drawn
// by the head and the body, so the head pinned mid-panel is still the panel's rounded
// top. `glide` eases the body to a new height (a tab of another length) instead of
// jumping.
//
// Glass is built of the material's parts, bottom to top: a back layer (the body: its
// blur, its fill, the shadow it casts), what it holds, the spill (`GlassSpill`: what
// nears the edge spills its light round it, on unless `spill={false}`), the front
// surfaces, the edge (`GlassEdge`). The root never blurs: a backdrop blur inside
// another sees only what is between the two, so a front inside a blurring root
// blurred nothing passing under it. What it holds stands on glass (`--glass-body`):
// a control inside takes its plain face unless chosen otherwise (no glass on glass).
//
// A frame is drawn once. What draws a box of its own when it stands alone (a log, a
// trace) asks `useInFrame()` and draws none inside one: a panel, or anything that
// says so with `<InFrame>`. A box inside a box was two edges, two corners and two
// grounds a few pixels apart; the default makes that impossible to write by accident,
// and the item's own `frame` prop still decides when given.

const Framed = React.createContext(false)

/** What it holds stands inside a frame already drawn: a box of its own is not. */
export function InFrame({ children }: { children: React.ReactNode }) {
  return <Framed.Provider value>{children}</Framed.Provider>
}

/** Whether a frame is already drawn round this point (a panel). */
export function useInFrame(): boolean {
  return React.useContext(Framed)
}

/** Inside a panel's head: what fits itself into the strip (a tab list) reads it. */
const InHead = React.createContext<{ material: Material } | null>(null)

/** The head this is inside, or null: a tab list in a head fits the strip (it stands
 *  as far from the panel's side as from the strip's top, a line list on the strip's
 *  rule). */
export function usePanelHead(): { material: Material } | null {
  return React.useContext(InHead)
}

/** The body of a panel that scrolls: its scroller, and whether the panel keeps a
 *  height its body fills (`height`). */
export type PanelBody = {
  scroller: React.RefObject<HTMLDivElement | null>
  filled: boolean
}
const InBody = React.createContext<PanelBody | null>(null)

/** The body of the panel this is inside when that panel scrolls, or null. A tab's
 *  panel keeps its own place in the scroll by it, and fills a panel of a set height. */
export function usePanelBody(): PanelBody | null {
  return React.useContext(InBody)
}

export type PanelProps = Omit<
  useRender.ComponentProps<"section">,
  "title" | "style"
> &
  GlassLight & {
    /** What it holds, in a few words. */
    title?: React.ReactNode
    /** A line under the title. */
    description?: React.ReactNode
    /** Something to do with it (a button, a menu): at the head's end, else beside
     *  the title. */
    action?: React.ReactNode
    /** What ends it, in its flow (its buttons, a note). */
    footer?: React.ReactNode
    /** A front surface across its top: a tab list, column names. */
    head?: React.ReactNode
    /** The head's height, a CSS length (3rem). */
    headHeight?: string
    headClassName?: string
    /** A front surface along its bottom: a card's buttons, a name. */
    foot?: React.ReactNode
    /** The foot's height, a CSS length (3rem). */
    footHeight?: string
    footClassName?: string
    /** A cap on its height, a CSS length: past it the body scrolls. */
    maxHeight?: string
    /** Its height, a CSS length, whatever it holds: the body scrolls what does not
     *  fit, and what scrolls itself (a log) fills it. */
    height?: string
    /** Where its head pins in a page that scrolls, a CSS length (`"0px"`, below a
     *  site header `"var(--header-height)"`). Only for a panel that grows. */
    pin?: string
    /** The head and the foot lie OVER what it holds, not above and below it, though
     *  the panel itself does not scroll: what it holds runs under them and pads
     *  itself by `--panel-head` and `--panel-foot` (a board's columns, each its
     *  own `ScrollArea cover="var(--panel-head)"`, scrolling under the head). */
    over?: boolean
    /** Overlay thumbs while its body scrolls. Default on. */
    thumb?: boolean
    /** Its body eases to a new height rather than jumping (a tab of another
     *  length). Only for a panel that grows. */
    glide?: boolean
    /** In glass, what nears its edge spills its light round it. Off for content
     *  that must stay crisp to the edge. Default on. */
    spill?: boolean
    /** Draws its surface (plain's card, glass's body and edge). Off, it is its
     *  layout and its context alone: what draws a box of its own when it stands
     *  alone (a log, a trace) passes `frame={!useInFrame()}` and is drawn once.
     *  Default on. */
    frame?: boolean
    /** Its corners, a CSS length (never a percentage): plain, the theme's xl;
     *  glass, 1.5rem. */
    radius?: string
    /** Classes on what lays out what it holds (its padding, its gap: `flex flex-col
     *  gap-4 p-5`). On the panel itself unless it has a head, a foot, a height or a
     *  glide; there `className` is the frame's alone. */
    bodyClassName?: string
    /** Glass: its body's colour (default the glass's own), and its front surfaces'
     *  (default the page's background at 55%), any CSS colour thin enough to stay
     *  glass. Set on that surface alone, so a panel inside keeps its own. */
    backColor?: string
    frontColor?: string
    material?: Material
    /** The colour scheme it stands in (material): default the nearest provider's.
     *  Dark, everything inside reads in the dark scheme too. */
    scheme?: Scheme
    style?: GlassStyle
  }

/** What lays out what a panel holds, unless `bodyClassName` says otherwise. */
const BODY = "flex flex-col gap-4 p-5"

/** A panel inside a frame already drawn (`useInFrame`: a panel's body, or what
 *  says so with `InFrame`), in either material: a step of light off the surface
 *  under it, a hairline and the theme's corner, nothing of glass's own (no blur,
 *  no rim, no spill: glass inside glass drew two rims, two blurs and two bodies
 *  where the eye wants one surface and what is on it). A panel that is a link
 *  brightens a step under the hand. Every box that stands in another (a profile,
 *  a post, a preview) is this one, drawn once here. */
const INSET =
  "rounded-(--panel-radius) border border-current/[0.07] bg-current/[0.035] transition-colors [a&]:hover:bg-current/[0.06]"

/** A plain front's face: recessed, a step darker than the card in both schemes
 *  (black over the card: 4% on a light one, 25% on a dark one, where steps must be
 *  wider apart to read), solid, so what scrolls under it stays hidden. A tab chosen
 *  in it wears the card's colour and rises out of it as a browser's tab does. A
 *  front of the card's own colour read as one flat box with a line in it, and one
 *  lighter than the card made the chosen tab a dark hole in it (Adrian, 2026-10-12). */
const PLAIN_FRONT = cn(
  "border-border bg-background bg-[linear-gradient(rgb(0_0_0/0.04),rgb(0_0_0/0.04)),linear-gradient(var(--color-card),var(--color-card))]",
  "scheme-dark:bg-[linear-gradient(rgb(0_0_0/0.25),rgb(0_0_0/0.25)),linear-gradient(var(--color-card),var(--color-card))]",
)

/** A plain panel whose head pins to the page draws its frame by its parts: the head
 *  is its TOP (its top and side edges, the top corners) and the body the rest (its
 *  sides, its foot, the bottom corners, the card's colour). Pinned mid-panel the head
 *  is still the panel's rounded top, the body's sides running on below it; drawn by
 *  the panel round them, the pinned head was a square strip between two straight
 *  edges (Adrian, 2026-10-12). */
const PLAIN_HEAD_EDGE = "border rounded-t-(--panel-radius)"
const PLAIN_BODY_EDGE =
  "border-border border-x border-b bg-background bg-[linear-gradient(var(--color-card),var(--color-card))] rounded-b-(--panel-radius)"

/** What a plain pinned head pins in: a square of the page's ground, the head
 *  (rounded) inside it, so rows passing under it never show behind its corners. */
const PLAIN_PIN = "sticky top-(--panel-pin) z-10 bg-background"

/** How a glass panel's light follows its state: a panel that moves (a card lifting
 *  under the pointer) and catches more light does both as one gesture, the light on
 *  its own 500 ms ease trailing the movement by a breath. Eased on the two elements
 *  that draw it (the edge, the fronts), never on the root: the rim is inherited,
 *  and moving there restyled everything the panel holds on every frame. */
const PANEL_LIGHT =
  "[transition:--glass-rim_500ms_cubic-bezier(0.22,1,0.36,1)_40ms] motion-reduce:[transition:none]"

/** The body's glide (`glide`): the height it is given follows what it holds, eased
 *  on the tabs' curve; on after the first reading, so the page opens at its height,
 *  never growing from nothing. */
const GLIDE =
  "transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"

function useGlide(on: boolean) {
  const [inner, setInner] = React.useState<HTMLDivElement | null>(null)
  const [height, setHeight] = React.useState<number | null>(null)
  const [moving, setMoving] = React.useState(false)
  React.useLayoutEffect(() => {
    if (!on || !inner) return
    const read = () => setHeight(inner.getBoundingClientRect().height)
    read()
    const frame = requestAnimationFrame(() => setMoving(true))
    const sizes = new ResizeObserver(read)
    sizes.observe(inner)
    return () => {
      cancelAnimationFrame(frame)
      sizes.disconnect()
    }
  }, [on, inner])
  return { setInner, height, moving }
}

export function Panel({
  title,
  description,
  action,
  footer,
  head,
  headHeight = "3rem",
  headClassName,
  foot,
  footHeight = "3rem",
  footClassName,
  maxHeight,
  height,
  pin,
  over = false,
  thumb = true,
  glide = false,
  spill = true,
  frame = true,
  radius,
  bodyClassName,
  backColor,
  frontColor,
  rim,
  rimWidth,
  rimColor,
  tint,
  tintAmount,
  material,
  scheme,
  render,
  className,
  style,
  children,
  ref,
  ...props
}: PanelProps) {
  // Inside a frame already drawn, its surface is the inset one (`INSET`) whatever
  // the material: its glass would be glass on glass.
  const inFrame = useInFrame()
  const own = useMaterial(material)
  const inset = frame && inFrame
  const m = inset ? "plain" : own
  const glass = m === "glass"
  const [s, here] = useSurfaceScheme<HTMLElement>(scheme, ref)
  const scroller = React.useRef<HTMLDivElement | null>(null)
  const scrolls = maxHeight !== undefined || height !== undefined
  // The fronts lie over what it holds: its own scroller's, or (`over`) content
  // that runs under them by itself.
  const laid = scrolls || over
  if (over && (scrolls || pin !== undefined))
    throw new Error(
      "Panel: `over` lays the fronts over content that scrolls by itself; a panel given a height lays them over its scroller already, and a pinned head is in the flow",
    )
  if (maxHeight !== undefined && height !== undefined)
    throw new Error(
      "Panel: `maxHeight` caps a panel that grows, `height` keeps one still; give one",
    )
  if (scrolls && (pin !== undefined || glide))
    throw new Error(
      "Panel: `pin` and `glide` are for a panel that grows with what it holds; one given a height scrolls itself, its head laid over its top",
    )
  if (pin !== undefined && head === undefined)
    throw new Error("Panel: `pin` pins the head to the page; give a `head`")
  if (head !== undefined && (title !== undefined || description !== undefined))
    throw new Error(
      "Panel: a panel with a head names itself in it (or in a heading above it); `title` and `description` are for one without",
    )
  if (
    !glass &&
    [backColor, frontColor, rim, rimWidth, rimColor, tint, tintAmount].some(
      (v) => v !== undefined,
    )
  )
    throw new Error(
      'Panel: `backColor`, `frontColor` and the light (`rim`, `tint`, …) are the glass face\'s; give `material="glass"`',
    )
  const glideBody = useGlide(glide)
  const titled = title || description || (action && head === undefined)
  // The panel is its own body (what lays out what it holds) unless something stands
  // apart from that body: a front surface, a scroller, a glide.
  const parts = head !== undefined || foot !== undefined || scrolls || glide
  // Plain and pinned to the page: the frame is drawn by the head and the body.
  const partsFrame = !glass && pin !== undefined && head !== undefined

  const header = titled && (
    <header
      data-slot="panel-header"
      className="flex items-start justify-between gap-4"
    >
      <div className="min-w-0 space-y-1">
        {title && (
          <h3
            data-slot="panel-title"
            className="font-medium text-sm leading-tight"
          >
            {title}
          </h3>
        )}
        {description && (
          <p
            data-slot="panel-description"
            className="text-pretty text-current/60 text-xs leading-5"
          >
            {description}
          </p>
        )}
      </div>
      {action && (
        <div data-slot="panel-action" className="-my-1 shrink-0">
          {action}
        </div>
      )}
    </header>
  )
  const footerPart = footer && (
    <footer data-slot="panel-footer" className="flex items-center gap-2 pt-1">
      {footer}
    </footer>
  )
  const held = (
    <>
      {header}
      {children}
      {footerPart}
    </>
  )

  // A front surface: laid over the scroller when the panel scrolls (or over what it
  // holds, `over`), else in the panel's flow (pinned to the page with `pin`).
  const front = (at: "top" | "bottom") => {
    const top = at === "top"
    const pinned = top && pin !== undefined
    return cn(
      "z-10 flex shrink-0 items-center gap-4 px-5",
      // A folder's tabs (a plain line list, tabs' `data-folder`) stand from a little
      // below the strip's top: the action stands as low, on their centre line.
      "[&:has(>[data-folder])>[data-slot=panel-action]]:self-stretch [&:has(>[data-folder])>[data-slot=panel-action]]:pt-2",
      top ? "h-(--panel-head)" : "h-(--panel-foot)",
      glass
        ? [
            glassFront[at],
            PANEL_LIGHT,
            // Pinned mid-panel it is square, the panel's clip rounding it at rest.
            pinned && "rounded-none",
          ]
        : [
            PLAIN_FRONT,
            top
              ? partsFrame
                ? PLAIN_HEAD_EDGE
                : "rounded-t-[inherit] border-b"
              : "rounded-b-[inherit] border-t",
          ],
      laid
        ? ["absolute inset-x-0", top ? "top-0" : "bottom-0"]
        : pinned
          ? glass
            ? "sticky top-(--panel-pin)"
            : "relative"
          : "relative",
      top ? headClassName : footClassName,
    )
  }
  const headPart = head !== undefined && (
    <div data-slot="panel-head" className={front("top")}>
      <InHead.Provider value={{ material: m }}>{head}</InHead.Provider>
      {action && (
        <div
          data-slot="panel-action"
          className="ml-auto flex shrink-0 items-center gap-2"
        >
          {action}
        </div>
      )}
    </div>
  )
  const footPart = foot !== undefined && (
    <div data-slot="panel-foot" className={front("bottom")}>
      {foot}
    </div>
  )

  // What it holds stands on glass, told so (a sibling of the back layer, not inside
  // it): a control inside takes its plain face.
  const onGlass = glass && frame && "[--glass-body:1]"
  const body = scrolls ? (
    <ScrollArea
      ref={scroller}
      data-slot="panel-scroller"
      thumb={thumb}
      // edge: in glass the spill ends it, a fade under it ended it twice.
      fade={!(glass && frame && spill)}
      cover={head === undefined ? undefined : "var(--panel-head)"}
      coverEnd={foot === undefined ? undefined : "var(--panel-foot)"}
      className={cn(
        onGlass,
        maxHeight !== undefined
          ? "max-h-(--panel-max)"
          : "flex flex-1 flex-col",
      )}
    >
      <InBody.Provider value={{ scroller, filled: height !== undefined }}>
        <div
          data-slot="panel-body"
          className={cn(BODY, height !== undefined && "flex-1", bodyClassName)}
        >
          {held}
        </div>
      </InBody.Provider>
    </ScrollArea>
  ) : parts ? (
    <div
      data-slot="panel-body"
      className={cn(
        onGlass,
        glide && "overflow-clip",
        glide && glideBody.moving && GLIDE,
        partsFrame && PLAIN_BODY_EDGE,
        !glide && [BODY, bodyClassName],
      )}
      style={
        glide && glideBody.height !== null
          ? { height: `${glideBody.height}px` }
          : undefined
      }
    >
      {glide ? (
        <div ref={glideBody.setInner} className={cn(BODY, bodyClassName)}>
          {held}
        </div>
      ) : (
        held
      )}
    </div>
  ) : glass ? (
    // The panel is its own body: its layout stays the root's, and what it holds is
    // marked as standing on glass by a wrapper that lays out nothing.
    <div className={cn("contents", onGlass)}>{held}</div>
  ) : (
    held
  )

  const vars = {
    "--panel-radius": radius ?? (glass ? "1.5rem" : "var(--radius-xl)"),
    ...(head === undefined
      ? {}
      : {
          "--panel-head": headHeight,
          // Where the head ends, for what pins under it (a table's header row,
          // `sticky top-(--panel-under)`): below the pinned head on the page, or
          // the head's own height inside the panel's scroller.
          "--panel-under":
            pin === undefined
              ? "var(--panel-head)"
              : "calc(var(--panel-pin) + var(--panel-head))",
        }),
    ...(foot === undefined ? {} : { "--panel-foot": footHeight }),
    ...(maxHeight === undefined ? {} : { "--panel-max": maxHeight }),
    ...(height === undefined ? {} : { "--panel-height": height }),
    ...(pin === undefined ? {} : { "--panel-pin": pin }),
    ...(glass
      ? {
          "--glass-radius": "var(--panel-radius)",
          ...(frontColor === undefined
            ? {}
            : { "--glass-front-color": frontColor }),
          ...glassStyle({ rim, rimWidth, rimColor, tint, tintAmount }),
        }
      : {}),
  }
  // The edge and the spill draw the corners as an outline, which needs the length
  // itself, never a variable.
  const edgeRadius = radius ?? "1.5rem"

  // Pinned in glass: the head is square, so the panel's corners are a clip round
  // the head and the body; `clip`, which is no scroller, so the head pins on.
  const flow =
    glass && pin !== undefined && head !== undefined ? (
      <div className="flex flex-col overflow-clip rounded-[inherit]">
        {headPart}
        {body}
        {footPart}
      </div>
    ) : (
      <>
        {!laid &&
          headPart &&
          (partsFrame ? (
            <div className={cn(PLAIN_PIN, "shrink-0")}>{headPart}</div>
          ) : (
            headPart
          ))}
        {body}
        {!laid && footPart}
      </>
    )

  return useRender({
    defaultTagName: "section",
    render,
    ref: here,
    props: {
      "data-slot": "panel",
      "data-material": m,
      className: cn(
        "relative flex flex-col rounded-(--panel-radius)",
        !parts && [BODY, bodyClassName],
        height !== undefined && "h-(--panel-height)",
        schemeOf(s),
        !frame
          ? undefined
          : glass
            ? // No glass of its own (its body is the back layer): its corners,
              // the words a glass's body gives what it holds, and its own
              // movement (a card lifting under the pointer), which its light
              // follows on the same ease (PANEL_LIGHT).
              "isolate text-foreground scheme-light:text-zinc-950 [transition:translate_500ms_cubic-bezier(0.22,1,0.36,1),scale_500ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:[transition:none]"
            : inset
              ? INSET
              : partsFrame
                ? "shadow-sm"
                : // A panel that is a link brightens a step under the hand.
                  "border border-border bg-card text-card-foreground shadow-sm transition-colors [a&]:hover:bg-[color-mix(in_srgb,var(--card),var(--foreground)_3%)]",
        className,
      ),
      style: { ...vars, ...style } as React.CSSProperties,
      ...props,
      // What is inside stands on the panel, not on what is behind it: it wears the
      // panel's scheme, whatever decided it (a picture under the panel included).
      children: (
        <MaterialProvider scheme={s}>
          <InFrame>
            {glass && frame && (
              <div
                aria-hidden
                data-slot="panel-back"
                className={cn(
                  glassVariants({ shape: "surface", edge: false }),
                  "pointer-events-none absolute inset-0 -z-10 [--glass-radius:inherit]",
                )}
                style={
                  backColor === undefined
                    ? undefined
                    : ({ "--glass-tint": backColor } as GlassStyle)
                }
              />
            )}
            {flow}
            {glass && frame && spill && <GlassSpill radius={edgeRadius} />}
            {laid && headPart}
            {laid && footPart}
            {glass && frame && (
              <GlassEdge
                radius={edgeRadius}
                className={cn("z-20", PANEL_LIGHT)}
              />
            )}
          </InFrame>
        </MaterialProvider>
      ),
    },
  })
}
