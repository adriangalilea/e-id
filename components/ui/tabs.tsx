"use client"

import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import {
  GlassEdge,
  type GlassStyle,
  glassFront,
  glassLift,
  glassVariants,
  schemeOf,
} from "@/components/ui/material-glass"
import { InFrame, Panel } from "@/components/ui/panel"
import "./edge-fade"
import {
  NO_SCROLLBAR,
  ScrollThumbs,
} from "@/components/ui/scroll-thumb"

// Views of one thing, one shown at a time (Base UI's tabs: the arrow keys move
// between tabs, Home and End to the ends, one Tab stop for the list; each panel is
// named by its tab). An indicator SLIDES to the active tab, so a change reads as one
// thing moving, never two states blinking.
//
//   <Tabs defaultValue="files">
//     <TabsList>
//       <TabsTab value="files">files</TabsTab>
//       <TabsTab value="people">people</TabsTab>
//     </TabsList>
//     <TabsPanel value="files">…</TabsPanel>
//     <TabsPanel value="people">…</TabsPanel>
//   </Tabs>
//
// Two looks: `segment` (the default), the tabs in a sunken well and the active one
// lifted out of it as toggle-group's chosen is; `line`, a rule under the tabs and the
// active one's stretch of it lit. Plain, or `material="glass"`: the well a bar of
// glass, the lift a lit pane, the line the glass's own lit edge.
//
// A panel mounts the first time its tab is shown and stays (`mount`, on TabsPanel);
// what inside it must pause while hidden asks `useTabsPanelActive()`. A tab can be a
// link (`render={<Link href="?view=files" />} nativeButton={false}`) with the
// active tab read back from the URL into `value`.
//
// Most tabs want a container: `TabsBox` is one surface, the tab list in its head
// pinned while the panels scroll under it, against the page or inside the box.

export type TabsSize = "sm" | "md" | "lg"
export type TabsVariant = "segment" | "line"
/** Which tabs show their words: all of them, or only the active one, the rest
 *  their icon alone (a row of many places that stays short). */
export type TabsLabels = "all" | "active"

const LIST: Record<TabsSize, string> = {
  sm: "text-[12px]",
  md: "text-[13px]",
  lg: "text-sm",
}
/** A tab in a segment's well, at the input's heights less the well's padding. */
const SEGMENT_TAB: Record<TabsSize, string> = {
  sm: "h-6 px-2.5",
  md: "h-7 px-3",
  lg: "h-9 px-4",
}
/** The glass segment is a pill, its radius half its height (a tab and the well's
 *  2 px either side); the chosen tab's lit pane likewise, half a tab's. */
const GLASS_LIST: Record<TabsSize, string> = {
  sm: "[--glass-radius:14px]",
  md: "[--glass-radius:16px]",
  lg: "[--glass-radius:20px]",
}
const GLASS_LIFT: Record<TabsSize, string> = {
  sm: "[--glass-radius:12px]",
  md: "[--glass-radius:14px]",
  lg: "[--glass-radius:18px]",
}
/** The one motion of a change of tab: the indicator's slide, and with
 *  `labels="active"` the words opening on the new tab and closing on the old over
 *  the same time and curve, so the three read as one movement. Base UI re-measures
 *  the indicator whenever a tab's size changes (a ResizeObserver per tab), so it
 *  follows a tab still opening. */
const GLIDE =
  "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"

const LINE_TAB: Record<TabsSize, string> = {
  sm: "h-7 px-2",
  md: "h-8 px-2.5",
  lg: "h-10 px-3",
}

/** The tabs' size and variant, for the list inside (material and scheme ride the
 *  MaterialProvider the tabs set). */
const Look = React.createContext<{
  size: TabsSize
  variant: TabsVariant
  labels: TabsLabels
}>({ size: "md", variant: "segment", labels: "all" })

export type TabsProps = Omit<
  React.ComponentProps<typeof BaseTabs.Root>,
  "className"
> & {
  size?: TabsSize
  variant?: TabsVariant
  /** `active`: every tab its icon, the active one its words too, opening as the
   *  indicator slides to it. Every tab then needs an `icon`. Default `all`. */
  labels?: TabsLabels
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  className?: string
}

export function Tabs({
  size = "md",
  variant = "segment",
  labels = "all",
  material,
  scheme,
  className,
  ref,
  ...props
}: TabsProps) {
  const m = useMaterial(material)
  // The root draws no surface: its words wear the scheme of what it stands on, and
  // what is inside it asks the same question itself. Over a picture the list (the
  // surface) is read by the part of it under the list, a control in a panel by the
  // part under that control.
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme, ref)
  const look = React.useMemo(
    () => ({ size, variant, labels }),
    [size, variant, labels],
  )
  return (
    <MaterialProvider material={m} scheme={scheme}>
      <Look.Provider value={look}>
        <BaseTabs.Root
          ref={here}
          data-slot="tabs"
          data-material={m}
          data-variant={variant}
          className={cn(
            "flex gap-3 data-[orientation=horizontal]:flex-col",
            schemeOf(s),
            className,
          )}
          {...props}
        />
      </Look.Provider>
    </MaterialProvider>
  )
}

export type TabsListProps = Omit<
  React.ComponentProps<typeof BaseTabs.List>,
  "className"
> & { className?: string }

/** Where the indicator comes to REST under `labels="active"`, in the list's own
 *  coordinates: the active tab's box once every other tab has closed and it has
 *  opened. Base UI's indicator measures where the tab IS, and while the words open
 *  that is a moving target: each frame restarted its glide toward a box still
 *  growing, so it chased, landed late and crept the last pixels, the words cut where
 *  the lift ended. This is the box it will be: a tab closed is its width less its
 *  words' track and the gap that track takes (the words' negative margin gives the
 *  gap back when closed, so the sum holds at any point of the motion), a tab open is
 *  that plus the gap and its words' own width (`scrollWidth`, whole even inside a
 *  closed track). The tabs come first in the list; anything after them (an add
 *  button) moves nothing before the indicator. */
function restingBox(list: HTMLElement): Box | null {
  const tabs = Array.from(
    list.querySelectorAll<HTMLElement>(":scope > [data-slot=tabs-tab]"),
  )
  const active = tabs.findIndex((tab) => tab.hasAttribute("data-active"))
  if (active === -1) return null
  const widths = tabs.map((tab) => {
    const words = tab.querySelector<HTMLElement>(
      ":scope > [data-slot=tabs-tab-words]",
    )
    const inner = words?.firstElementChild
    if (!words || !(inner instanceof HTMLElement))
      throw new Error(
        'TabsList: a tab under labels="active" has no words track',
      )
    const gap = Number.parseFloat(getComputedStyle(tab).columnGap) || 0
    const margin = Number.parseFloat(getComputedStyle(words).marginLeft) || 0
    const closed =
      tab.getBoundingClientRect().width -
      words.getBoundingClientRect().width -
      gap -
      margin
    return { closed, open: closed + gap + inner.scrollWidth }
  })
  const between = Number.parseFloat(getComputedStyle(list).columnGap) || 0
  const first = tabs[0]
  const tab = tabs[active]
  const width = widths[active]
  if (!first || !tab || !width)
    throw new Error("TabsList: the active tab vanished")
  const left = widths
    .slice(0, active)
    .reduce((x, w) => x + w.closed + between, first.offsetLeft)
  return {
    left,
    top: tab.offsetTop,
    width: width.open,
    height: tab.offsetHeight,
  }
}

type Box = { left: number; top: number; width: number; height: number }

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    a.top === b.top &&
    a.height === b.height)

/** The indicator's resting box under `labels="active"`, kept current: when a tab
 *  becomes active, and when the list changes size (a font arriving, the words
 *  moving: re-reading mid-motion gives the same box, so it settles at once).
 *  `moving` turns the glide on after the first placement, so the lift appears where
 *  it belongs instead of sliding in from the corner. */
function useRestingBox(list: HTMLElement | null, on: boolean) {
  const [box, setBox] = React.useState<Box | null>(null)
  const [moving, setMoving] = React.useState(false)
  React.useLayoutEffect(() => {
    if (!on || !list) return
    const place = () => {
      const next = restingBox(list)
      setBox((was) => (sameBox(was, next) ? was : next))
    }
    place()
    const frame = requestAnimationFrame(() => setMoving(true))
    const actives = new MutationObserver(place)
    actives.observe(list, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-active"],
    })
    const sizes = new ResizeObserver(place)
    sizes.observe(list)
    return () => {
      cancelAnimationFrame(frame)
      actives.disconnect()
      sizes.disconnect()
    }
  }, [list, on])
  return { box, moving }
}

/** The tabs, and the indicator that slides between them. */
export function TabsList({
  className,
  children,
  ref,
  ...props
}: TabsListProps) {
  const m = useMaterial()
  const [s, here] = useSurfaceScheme<HTMLDivElement>(undefined, ref)
  const { size, variant, labels } = React.useContext(Look)
  const glass = m === "glass"
  const folded = labels === "active"
  const [list, setList] = React.useState<HTMLDivElement | null>(null)
  const both = React.useCallback(
    (node: HTMLDivElement | null) => {
      setList(node)
      here(node)
    },
    [here],
  )
  const resting = useRestingBox(list, folded)
  const indicator = cn(
    "pointer-events-none absolute -z-10",
    (!folded || resting.moving) && [
      "transition-[translate,width,height]",
      GLIDE,
    ],
    variant === "segment"
      ? [
          "top-0 left-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top)",
          glass
            ? [glassLift, GLASS_LIFT[size]]
            : "rounded-md bg-background shadow-[0_1px_2px_rgb(0_0_0/0.15)] ring-1 ring-foreground/8 scheme-dark:bg-foreground/12",
        ]
      : [
          "bottom-0 left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full",
          glass
            ? "bg-current shadow-[0_0_8px_color-mix(in_oklab,currentColor_60%,transparent)]"
            : "bg-foreground",
        ],
  )
  return (
    <BaseTabs.List
      ref={both}
      data-slot="tabs-list"
      className={cn(
        "relative z-0 flex w-fit items-center",
        LIST[size],
        schemeOf(s),
        variant === "segment"
          ? [
              "gap-0.5 p-0.5",
              glass
                ? [glassVariants({ shape: "surface" }), GLASS_LIST[size]]
                : "rounded-lg bg-foreground/[0.06]",
            ]
          : [
              "gap-1",
              // The rule under the tabs: the page's hairline, or glass's lit line.
              "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-px after:content-['']",
              glass ? "after:bg-current/15" : "after:bg-foreground/10",
            ],
        className,
      )}
      {...props}
    >
      {children}
      {folded ? (
        // Its own indicator, on the same variables Base UI's sets, placed at the
        // resting box (`restingBox`); none until it is measured.
        resting.box && (
          <span
            aria-hidden
            data-slot="tabs-indicator"
            className={indicator}
            style={
              {
                "--active-tab-left": `${resting.box.left}px`,
                "--active-tab-top": `${resting.box.top}px`,
                "--active-tab-width": `${resting.box.width}px`,
                "--active-tab-height": `${resting.box.height}px`,
              } as React.CSSProperties
            }
          />
        )
      ) : (
        <BaseTabs.Indicator data-slot="tabs-indicator" className={indicator} />
      )}
    </BaseTabs.List>
  )
}

export type TabsTabProps = Omit<
  React.ComponentProps<typeof BaseTabs.Tab>,
  "className"
> & {
  /** Drawn before the words; required under `labels="active"`, where it is all an
   *  inactive tab shows. */
  icon?: React.ReactNode
  className?: string
}

/** The words of a tab under `labels="active"`: a one-column grid whose track opens
 *  from 0fr to 1fr on the active tab (the width of the words, whatever they are,
 *  with no measuring), the words fading in with it. Closed, a negative margin takes
 *  back the tab's gap so an icon alone sits centred. Still in the tab's text while
 *  closed, so the tab keeps its accessible name. */
const FOLDED_WORDS = cn(
  "grid grid-cols-[0fr] -ml-1.5 opacity-0 transition-[grid-template-columns,margin,opacity]",
  GLIDE,
  "group-data-active/tab:ml-0 group-data-active/tab:grid-cols-[1fr] group-data-active/tab:opacity-100",
)

export function TabsTab({ icon, className, children, ...props }: TabsTabProps) {
  const m = useMaterial()
  const { size, variant, labels } = React.useContext(Look)
  const glass = m === "glass"
  if (labels === "active" && icon === undefined)
    throw new Error(
      'TabsTab: labels="active" shows an inactive tab as its icon alone, and this tab has no icon',
    )
  return (
    <BaseTabs.Tab
      data-slot="tabs-tab"
      className={cn(
        "group/tab inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-[color,opacity] duration-200 select-none data-disabled:cursor-not-allowed data-disabled:opacity-40 [&_svg]:size-3.5 [&_svg]:shrink-0",
        variant === "segment"
          ? [SEGMENT_TAB[size], glass ? "rounded-full" : "rounded-md"]
          : [LINE_TAB[size], FOLDER_TAB],
        glass
          ? "opacity-60 hover:opacity-90 data-active:opacity-100"
          : "text-foreground/55 hover:text-foreground/85 data-active:text-foreground",
        className,
      )}
      {...props}
    >
      {icon}
      {labels === "active" ? (
        <span data-slot="tabs-tab-words" className={FOLDED_WORDS}>
          <span className="overflow-hidden">{children}</span>
        </span>
      ) : (
        children
      )}
    </BaseTabs.Tab>
  )
}

/** When a panel's content is mounted. `seen`: the first time its tab is shown, and
 *  from then on, hidden while another tab is shown (its state, its scroll and what
 *  was typed in it survive a switch; a panel never shown never mounts, so what it
 *  fetches on mount it fetches on first show, once). `active`: only while shown,
 *  so it starts over each time. `always`: from the start, shown or not (what must
 *  be in the page unseen). */
export type TabsPanelMount = "seen" | "active" | "always"

export type TabsPanelProps = Omit<
  React.ComponentProps<typeof BaseTabs.Panel>,
  "className" | "keepMounted" | "render"
> & {
  /** When its content is mounted (`TabsPanelMount`): default `seen`. */
  mount?: TabsPanelMount
  className?: string
}

/** Whether the panel round it is the one shown; null outside a panel. */
const PanelActive = React.createContext<boolean | null>(null)

/** Whether the panel this is inside is the one shown. For content that stays
 *  mounted while hidden (`mount="seen"`, the default) and must stop working
 *  meanwhile: a poll, a subscription, a clock. Throws outside a `TabsPanel`. */
export function useTabsPanelActive(): boolean {
  const active = React.useContext(PanelActive)
  if (active === null)
    throw new Error("useTabsPanelActive: not inside a TabsPanel")
  return active
}

/** Holds its content back until it is first shown, then keeps it. React's
 *  state-from-render: the latch flips in the render that first sees it shown,
 *  before anything commits, so the content mounts in that same commit. */
function Seen({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  const [seen, setSeen] = React.useState(active)
  if (active && !seen) setSeen(true)
  return seen || active ? children : null
}

/** What one tab shows. Base UI's panel either mounts only while shown or from the
 *  start (`keepMounted`); `seen` is the third way, built here: Base keeps the
 *  panel's element, `Seen` holds its content back until the first show. Hidden
 *  is the `hidden` attribute, which wins over a `flex` or `grid` on the panel
 *  (Tailwind's preflight makes it important). */
export function TabsPanel({
  mount = "seen",
  className,
  children,
  ...props
}: TabsPanelProps) {
  return (
    <BaseTabs.Panel
      data-slot="tabs-panel"
      className={cn("rounded-md", className)}
      {...props}
      keepMounted={mount !== "active"}
      render={(attrs, state) => {
        // Shown: not hidden, and not on its way out (Base keeps a panel visible
        // while its exit runs, `ending`).
        const active = !state.hidden && state.transitionStatus !== "ending"
        return (
          <PanelFace
            attrs={attrs}
            active={active}
            from={state.tabActivationDirection}
          >
            <PanelActive.Provider value={active}>
              {mount === "seen" ? (
                <Seen active={active}>{children}</Seen>
              ) : (
                children
              )}
            </PanelActive.Provider>
          </PanelFace>
        )
      }}
    />
  )
}

/** A panel's arrival: when it becomes the one shown (never on the page's first
 *  paint, where it simply is), it comes in from the side the indicator travelled
 *  from, 16 px, and up from nothing, over 220 ms on the indicator's curve: a tab
 *  to the right brings its panel in from the right, so the content moves the way
 *  the lift did and the two read as one gesture (Base UI's
 *  `tabActivationDirection`; vertical tabs move it vertically, `none` only fades).
 *  Short on purpose: it confirms the switch, it does not perform it. Played with
 *  the Web Animations API on the panel's own element, so it needs no stylesheet
 *  and leaves no style behind; none under reduced motion. The panel that leaves is
 *  hidden at once: two panels crossing in one place would read as both. */
type TabsTabActivationDirection = BaseTabs.Tab.ActivationDirection
const TRAVEL = 16
const FROM: Record<TabsTabActivationDirection, string> = {
  right: `translateX(${TRAVEL}px)`,
  left: `translateX(${-TRAVEL}px)`,
  down: `translateY(${TRAVEL}px)`,
  up: `translateY(${-TRAVEL}px)`,
  none: "none",
}
const ARRIVE_TIMING: KeyframeAnimationOptions = {
  duration: 220,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
}

function PanelFace({
  attrs,
  active,
  from,
  children,
}: {
  attrs: React.ComponentProps<"div">
  active: boolean
  /** The way the active tab moved, Base UI's `tabActivationDirection`. */
  from: TabsTabActivationDirection
  children: React.ReactNode
}) {
  const { ref, ...rest } = attrs
  const own = React.useRef<HTMLDivElement | null>(null)
  const was = React.useRef(active)
  const both = React.useCallback(
    (node: HTMLDivElement | null) => {
      own.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  React.useLayoutEffect(() => {
    const arrived = active && !was.current
    was.current = active
    const node = own.current
    if (!arrived || !node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    node.animate(
      [
        { opacity: 0, transform: FROM[from] },
        { opacity: 1, transform: "none" },
      ],
      ARRIVE_TIMING,
    )
  }, [active, from])
  return (
    <div ref={both} {...rest}>
      {children}
    </div>
  )
}

/** The box's body follows its panel's height rather than jumping to it: a switch
 *  between a short panel and a tall one resized the box in one frame and moved
 *  everything under it (Adrian, 2026-10-13: "layout shifting with tabs too
 *  harsh"). The panels' own height is read (a ResizeObserver on what holds them,
 *  so a panel that grows by itself, a calendar arriving, glides too) and the body
 *  is given it as a length, eased on the indicator's curve (`GLIDE`) so the box
 *  and the lift move as one. The glide turns on after the first reading: the page
 *  opens at its height, never growing from nothing. */
function useBodyHeight(on: boolean) {
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

/** The box's title: a heading OUTSIDE the box, above it, where a page's sections are
 *  named (Adrian, 2026-10-12: "what I always do everywhere"). In the strip it read
 *  as one more tab, and inside the box above the strip as loose words on it. The
 *  box is then the strip and what it shows, and stays named by the title. */
const BOX_TITLE = "font-medium text-sm leading-tight"

/** The strip's height: the list (28, 32, 40) with the strip's air either side,
 *  every item on its one centre line. A line list fills it, so its labels sit on
 *  that centre line and its active stretch on the strip's rule. */
const BOX_HEAD: Record<TabsSize, string> = {
  sm: "40px",
  md: "48px",
  lg: "56px",
}

/** A line list pulled left by its first tab's padding, so that label starts where
 *  the body does. */
const LINE_PULL: Record<TabsSize, string> = {
  sm: "[&>[data-slot=tabs-list]]:-ml-2",
  md: "[&>[data-slot=tabs-list]]:-ml-2.5",
  lg: "[&>[data-slot=tabs-list]]:-ml-3",
}

/** A segment strip's inset at its ends: what it is at its top and foot, the strip's
 *  height less the well's (BOX_HEAD 40, 48, 56 less 28, 32, 40, halved), so the
 *  well sits in the box's corner as far from its side as from its top and its round
 *  end follows the corner's. At the body's 20 px it stood twice as far from the
 *  side as from the top, off the corner (Adrian, 2026-10-12). */
const SEGMENT_INSET: Record<TabsSize, string> = {
  sm: "px-1.5",
  md: "px-2",
  lg: "px-2",
}

/** A folder strip's start: the body's inset (20 px) less a tab's padding (LINE_TAB:
 *  8, 10, 12) and its edge (1), so the first label starts where the body does while
 *  the chosen tab's edge stands well in from the box's. Pulled like a line list,
 *  that edge stood a sliver from the box's border (Adrian, 2026-10-12). */
const FOLDER_START: Record<TabsSize, string> = {
  sm: "pl-[11px]",
  md: "pl-[9px]",
  lg: "pl-[7px]",
}

/** The plain head's face, the strip's: recessed, a step darker than the body in
 *  both schemes (black over the card: 4% on a light one, 25% on a dark one, where
 *  steps must be wider apart to read), solid, so what scrolls under the strip stays
 *  hidden. The chosen tab is the body's colour, so it rises out of the strip as a
 *  browser's tab does. A head of the body's own colour read as one flat box with a
 *  line in it, and a head lighter than the body made the chosen tab a dark hole in
 *  it (Adrian, 2026-10-12). */
const PLAIN_HEAD = cn(
  "border-border bg-background bg-[linear-gradient(rgb(0_0_0/0.04),rgb(0_0_0/0.04)),linear-gradient(var(--color-card),var(--color-card))]",
  "scheme-dark:bg-[linear-gradient(rgb(0_0_0/0.25),rgb(0_0_0/0.25)),linear-gradient(var(--color-card),var(--color-card))]",
)

/** The plain box's frame is drawn by its two parts, never by the panel round them:
 *  the head is the box's TOP (its top and side edges, the panel's top corners) and
 *  the body the rest (its sides, its foot, the bottom corners, the card's colour).
 *  So the head pinned mid-box is still the box's rounded top, with the body's sides
 *  running on below it; drawn by the panel, the pinned head was a square strip
 *  between two straight edges, the box's corners gone (Adrian, 2026-10-12). The
 *  corners are one length, `--ag-tabs-box-radius` (BOX_RADIUS), worn by the panel,
 *  the head's top and the body's foot. */
const PLAIN_HEAD_EDGE =
  "border-x border-t border-b rounded-t-(--ag-tabs-box-radius)"
const PLAIN_BODY_EDGE =
  "border-border border-x border-b bg-background bg-[linear-gradient(var(--color-card),var(--color-card))] rounded-b-(--ag-tabs-box-radius)"

/** A filled box's body (`height`): the rest of the box below the head, the shown
 *  panel filling it and what the panel holds filling the panel, edge to edge, to
 *  scroll itself. A hidden panel stays hidden: preflight's `[hidden]` is important. */
const FILLED_BODY = cn(
  "flex min-h-0 flex-1 flex-col",
  "[&>[data-slot=tabs-panel]]:flex [&>[data-slot=tabs-panel]]:min-h-0 [&>[data-slot=tabs-panel]]:flex-1 [&>[data-slot=tabs-panel]]:flex-col",
  "[&>[data-slot=tabs-panel]>*]:min-h-0 [&>[data-slot=tabs-panel]>*]:flex-1",
)

/** The plain box's corner, the panel's own (rounded-xl). */
const BOX_RADIUS = "[--ag-tabs-box-radius:var(--radius-xl)]"

/** What a plain head pins in: a square of the page's ground, the head (rounded)
 *  inside it, so behind the head's corners the rows passing under a pinned head do
 *  not show; at rest, the page is what is there anyway. Its own element, under the
 *  head: a ground drawn by the head itself (a pseudo-element under it) painted over
 *  the head's face and its curved corners. */
const PLAIN_PIN = "sticky top-(--ag-tabs-box-top) z-10 bg-background"

/** The line look in a plain box: the chosen tab is cut from the body, a folder's
 *  tab. It wears the body's colour as it is seen, solid (the card over the page's
 *  ground, as the head's base is) and a hairline round its top, and stands a pixel
 *  over the head's rule, so it opens into what it shows; the rest sit in the head.
 *  Every tab keeps the edge, transparent, so choosing one moves nothing. Read by the
 *  tabs inside a head marked `data-folder`. */
const FOLDER_TAB = cn(
  "in-data-folder:rounded-t-lg in-data-folder:border in-data-folder:border-transparent in-data-folder:border-b-0",
  "in-data-folder:data-active:relative in-data-folder:data-active:top-px in-data-folder:data-active:border-border",
  "in-data-folder:data-active:bg-background in-data-folder:data-active:bg-[linear-gradient(var(--color-card),var(--color-card))]",
)

/** The glass head's face: the material's front surface (`glassFront.top`, what
 *  GlassPane and the glass group-box wear: its own blur and face, one lit hairline
 *  as its inner edge), placed by the head itself (`sticky`). Square: it lies under
 *  the title, or pinned mid-box, never along the box's rounded top; at rest at the
 *  very top the scroller's corners cut it. */
const GLASS_HEAD = cn(glassFront.top, "rounded-none")

/** The glass box's corners, a glass card's as the panel's are: one length for its
 *  body, its clip and its edge. */
const PANE_RADIUS = "var(--radius-3xl)"

/** The glass box's root: no glass of its own (its body is a back layer), only its
 *  corners and the words a glass's body gives what it holds. */
const GLASS_PANE =
  "relative isolate rounded-(--glass-radius) text-foreground scheme-light:text-zinc-950"

export type TabsBoxProps = Omit<
  TabsProps,
  "children" | "title" | "orientation"
> & {
  /** The tabs (`TabsTab`s, links included), drawn in the head's list. */
  tabs: React.ReactNode
  /** What the box holds, in a few words: a heading above the box, which names it.
   *  With a title, `className` places the two together. */
  title?: React.ReactNode
  /** Something at the head's end: a button, a count. */
  action?: React.ReactNode
  /** Where the head pins in a page that scrolls, a CSS length: below a site
   *  header, `"var(--header-height)"`. Default the page's top. */
  top?: string
  /** A cap on the box's height, a CSS length: past it the box scrolls itself, its
   *  head pinned at its own top. Unset, the box grows with what it holds and its
   *  head pins to the page (`top`). */
  maxHeight?: string
  /** The box's height, a CSS length, for panels whose content scrolls itself (a
   *  log, a trace, a list with its own scroller): what a panel holds fills the
   *  body, edge to edge, and the box itself never scrolls. */
  height?: string
  /** The `TabsPanel`s. */
  children: React.ReactNode
}

/** A box of tabs, its title a heading above it: one surface, the strip (the tab
 *  list, an action at its end), then the panels. The strip PINS while the body
 *  scrolls under it, against the page (`top`) or inside the box (`maxHeight`);
 *  given a `height`, the box stays still and what a panel holds fills it and
 *  scrolls itself (a log, a trace). The box is the frame: what draws a box of its
 *  own when alone draws none inside it (`InFrame`, panel's).
 *  Plain, the box is a `Panel` drawn as the tabs' root, and the strip a solid head
 *  a step off the card's colour, so what passes under it is hidden; in the line
 *  look the chosen tab is cut from the body, a folder's tab. Glass, the box is
 *  built as GlassPane is, of the material's parts (a body on a back layer, the
 *  front surface as the pinned strip, the edge over both), so what passes under the
 *  strip is seen through it only as light. What a panel pins of its own (a table's
 *  header row) pins under the head at `top-(--ag-tabs-box-under)`, on a ground of
 *  its own (plain, the card's colour).
 *
 *    <TabsBox defaultValue="ops" title="fleet" action={<Button>refresh</Button>}
 *      tabs={<><TabsTab value="ops">ops</TabsTab><TabsTab value="perf">perf</TabsTab></>}>
 *      <TabsPanel value="ops">…</TabsPanel>
 *      <TabsPanel value="perf">…</TabsPanel>
 *    </TabsBox>
 *
 *  Nothing in it is `overflow: hidden`, which makes a scroller and would end the
 *  pinning against the page; the body is cut to the box's corners with
 *  `overflow: clip`, which is no scroller. Capped, the scroller is an element
 *  inside the surface, never the surface: a scrolling surface would carry its
 *  glass rim away with the content, its rim being positioned pseudo-elements. */
export function TabsBox({
  tabs,
  title,
  action,
  top,
  maxHeight,
  height,
  material,
  scheme,
  size = "md",
  variant = "segment",
  className,
  children,
  ref,
  ...props
}: TabsBoxProps) {
  if ([top, maxHeight, height].filter((v) => v !== undefined).length > 1)
    throw new Error(
      "TabsBox: `top` pins the head to the page, `maxHeight` makes the box its own scroller and `height` gives it a height its panels fill; give one",
    )
  const filled = height !== undefined
  // The body glides to its panel's height when the box grows with what it holds;
  // a filled box has its height, and a capped one scrolls instead of growing.
  const glides = !filled && maxHeight === undefined
  const body = useBodyHeight(glides)
  const m = useMaterial(material)
  const titleId = React.useId()
  const scroller = React.useRef<HTMLDivElement>(null)
  // What is inside stands on the box: the panel and the tabs wear the one scheme
  // read here, whatever decided it.
  const [s, here] = useSurfaceScheme<HTMLElement>(scheme, ref)
  const glass = m === "glass"
  // Plain and pinned to the page: the head and the body draw the frame, so a head
  // pinned mid-box is still the box's rounded top. Capped or filled, the head never
  // leaves the box's top, and the frame stays the panel's, outside the scroller,
  // whose edges fade (a frame drawn inside it faded with the rows).
  const partsFrame = !glass && maxHeight === undefined && !filled
  const head = (
    <div
      data-slot="tabs-box-head"
      // Plain, the line look's chosen tab is a folder's tab (FOLDER_TAB).
      data-folder={!glass && variant === "line" ? "" : undefined}
      className={cn(
        "flex h-(--ag-tabs-box-head) items-center gap-4",
        variant === "segment" ? SEGMENT_INSET[size] : "px-5",
        glass
          ? GLASS_HEAD
          : [PLAIN_HEAD, partsFrame ? PLAIN_HEAD_EDGE : "border-b"],
        variant === "line" &&
          // The strip's rule is the line: the list fills the strip, its own
          // rule dropped, its tabs as tall as the strip.
          "[&>[data-slot=tabs-list]]:self-stretch [&>[data-slot=tabs-list]]:items-stretch [&>[data-slot=tabs-list]]:after:hidden [&_[data-slot=tabs-tab]]:h-auto",
        variant === "line" &&
          (glass
            ? LINE_PULL[size]
            : // A folder's tabs stand in the strip from a little below its
              // top, and the chosen one is told by its shape: no lit stretch
              // of rule. The action stands as low, on the labels' centre line.
              [
                FOLDER_START[size],
                "[&>[data-slot=tabs-list]]:pt-2 [&_[data-slot=tabs-indicator]]:hidden",
                "[&>[data-slot=tabs-box-action]]:self-stretch [&>[data-slot=tabs-box-action]]:pt-2",
              ]),
        // Glass pins itself, over the body: after the glass's `relative`, so it
        // wins. Plain pins in its ground (PLAIN_PIN).
        glass && "sticky top-(--ag-tabs-box-top) z-10",
      )}
    >
      <TabsList className="min-w-0">{tabs}</TabsList>
      {action && (
        <div
          data-slot="tabs-box-action"
          className="ml-auto flex shrink-0 items-center gap-2"
        >
          {action}
        </div>
      )}
    </div>
  )
  const inner = (
    <div
      ref={scroller}
      data-slot="tabs-box-scroller"
      className={cn(
        "rounded-[inherit]",
        filled
          ? // The box's height, the head and then the body taking the rest.
            "flex h-(--ag-tabs-box-height) flex-col overflow-clip"
          : maxHeight === undefined
            ? // Clips to the box's corners (glass's square head is rounded there at
              // rest; plain's head is rounded itself, PLAIN_HEAD_EDGE); `clip` is no
              // scroller, so the head pins on.
              "overflow-clip"
            : [
                // Its top is covered by the pinned strip: said as scroll padding,
                // so a focused row stops below it and the thumb's track starts there.
                // No bounce at its ends (`overscroll-none`, which also keeps the
                // scroll from chaining to the page): a rubber-band past the top
                // dragged the pinned head down with the rows and showed the box's
                // empty glass above it.
                "relative max-h-(--ag-tabs-box-max) scroll-pt-(--ag-tabs-box-head) overflow-y-auto overscroll-none",
                NO_SCROLLBAR,
                // Never a hard cut: the rows fade where there is more, at the
                // foot and where they come out from under the head (scrims'
                // `ag-edge-fade-y`, the head its cover).
                "ag-edge-fade-y [--edge-cover:var(--ag-tabs-box-head)]",
              ],
      )}
      style={
        {
          "--ag-tabs-box-max": maxHeight,
          "--ag-tabs-box-height": height,
          "--ag-tabs-box-head": BOX_HEAD[size],
          // Capped, it pins at the box's own top; else where the page says.
          "--ag-tabs-box-top": maxHeight === undefined ? (top ?? "0px") : "0px",
          // Where the pinned head ends: what a panel pins of its own (a table's
          // header row) sticks here, `sticky top-(--ag-tabs-box-under)`, under
          // the head rather than behind it.
          "--ag-tabs-box-under":
            "calc(var(--ag-tabs-box-top) + var(--ag-tabs-box-head))",
        } as React.CSSProperties
      }
    >
      {maxHeight !== undefined && <ScrollThumbs scroller={scroller} />}
      {glass ? head : <div className={cn(PLAIN_PIN, "shrink-0")}>{head}</div>}
      <div
        data-slot="tabs-box-body"
        // In glass what it holds lies on the back layer, a sibling and no
        // ancestor, so it is told it stands on glass, as GlassPane's content is.
        className={cn(
          filled && FILLED_BODY,
          glides && "overflow-clip",
          glides && body.moving && ["transition-[height]", GLIDE],
          glass ? "[--glass-body:1]" : partsFrame && PLAIN_BODY_EDGE,
        )}
        style={
          glides && body.height !== null
            ? { height: `${body.height}px` }
            : undefined
        }
      >
        {filled ? (
          // The box is the frame: what draws a box of its own draws none here.
          <InFrame>{children}</InFrame>
        ) : (
          <div ref={body.setInner} data-slot="tabs-box-panels" className="p-5">
            <InFrame>{children}</InFrame>
          </div>
        )}
      </div>
    </div>
  )
  // With a title, `className` places the section (the title and the box); without,
  // the box itself.
  const boxClass = title === undefined ? className : undefined
  const box = !glass ? (
    <Panel
      ref={here}
      material={m}
      scheme={s}
      data-slot="tabs-box"
      // Pinned to the page, the frame is drawn by the head and the body
      // (PLAIN_HEAD_EDGE, PLAIN_BODY_EDGE) and the panel keeps its corners and its
      // shadow; capped, the panel draws it, outside the scroller's fade.
      className={cn(
        "gap-0 rounded-(--ag-tabs-box-radius) p-0",
        partsFrame && "border-0 bg-transparent",
        BOX_RADIUS,
        boxClass,
      )}
      render={
        <Tabs
          material={m}
          scheme={s}
          size={size}
          variant={variant}
          {...props}
        />
      }
    >
      {inner}
    </Panel>
  ) : (
    // Glass is GlassPane's build from the material's parts: the body on a back
    // layer, the front surface pinned over what scrolls, the edge over both. The
    // root itself never blurs, the material's rule for a front: inside a blurring
    // element it may blur nothing that passes under it. So in glass the box is not
    // the panel's glass (which blurs on its root), only the panel's corners.
    <Tabs
      ref={here}
      data-slot="tabs-box"
      material={m}
      scheme={s}
      size={size}
      variant={variant}
      className={cn("gap-0", GLASS_PANE, boxClass)}
      {...props}
      // The consumer's style and the corners the back layer and the edge share.
      style={{
        ...props.style,
        ...({ "--glass-radius": PANE_RADIUS } satisfies GlassStyle),
      }}
    >
      <div
        aria-hidden
        data-slot="tabs-box-back"
        className={cn(
          glassVariants({ shape: "surface", edge: false }),
          "pointer-events-none absolute inset-0 -z-10 [--glass-radius:inherit]",
        )}
      />
      {inner}
      <GlassEdge radius={PANE_RADIUS} />
    </Tabs>
  )
  if (title === undefined) return box
  // The title above the box, the two one section named by it.
  return (
    <section
      data-slot="tabs-box-section"
      aria-labelledby={titleId}
      className={cn("flex min-w-0 flex-col gap-2.5", className)}
    >
      <h3 id={titleId} data-slot="tabs-box-title" className={BOX_TITLE}>
        {title}
      </h3>
      {box}
    </section>
  )
}
