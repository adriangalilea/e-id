"use client"

import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import * as React from "react"
import { flushSync } from "react-dom"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import {
  glassLift,
  glassVariants,
  schemeOf,
} from "@/components/ui/material-glass"
import { usePanelBody, usePanelHead } from "@/components/ui/panel"
import {
  clamp,
  GLIDE_ENTRY,
  GLIDE_ENTRY_MIN,
  GLIDE_MAX,
  GLIDE_MIN,
  GLIDE as GLIDE_MS,
  glide,
  INTENT,
  SAMPLES,
  type Sample,
  SLIDE_GAP,
  SWIPE_END,
  swipeBreak,
  swipeCommitPx,
  swipeEnvelope,
  swipeGive,
  velocity,
  wheelPx,
} from "@/lib/lightbox-motion"
import { cn } from "@/lib/utils"

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
// In a box, the tabs own no container: the box is a `Panel`, the list its head.
//
//   <Tabs defaultValue="ops" material="glass">
//     <Panel head={<TabsList>…</TabsList>} action={<Button>refresh</Button>} maxHeight="30rem">
//       <TabsPanel value="ops">…</TabsPanel>
//     </Panel>
//   </Tabs>
//
// The list fits itself into the head (`usePanelHead`): a segment stands as far from
// the panel's side as from the strip's top, so its round end follows the corner; a
// line fills the strip, its active stretch on the strip's rule; plain, a line's
// chosen tab is cut from the body, a folder's tab. The panel pins the head, scrolls
// the body, glides it to a tab of another length (`glide`), and in a panel of a set
// height each tab's panel fills it and keeps its own place in the scroll.
//
// Panels in a track (`TabsPanels`) are swiped between: a finger, or two on a
// trackpad, sideways over them, and the panel leans with the hand, the next one
// beside it; past the line it goes to that tab, one tab a gesture, the lightbox's
// pager rules (`lib/lightbox-motion`). Up and down stays the page's; a press, a
// click and the keys are unchanged. A panel in a track also stays laid out while
// hidden, so showing it again is paint alone.
//
//   <TabsPanels>
//     <TabsPanel value="files">…</TabsPanel>
//     <TabsPanel value="people">…</TabsPanel>
//   </TabsPanels>

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

/** A segment list in a panel's head (px-5, `--panel-head` tall) stands as far from
 *  the panel's side as from the strip's top: the strip's height less the well's (28,
 *  32, 40), halved, less the head's own inset. So the well sits in the panel's
 *  corner and its round end follows the corner's; at the head's 20 px it stood
 *  twice as far from the side as from the top, off the corner (Adrian, 2026-10-12). */
const SEGMENT_IN_HEAD: Record<TabsSize, string> = {
  sm: "-ml-[calc(1.25rem-(var(--panel-head)-28px)/2)]",
  md: "-ml-[calc(1.25rem-(var(--panel-head)-32px)/2)]",
  lg: "-ml-[calc(1.25rem-(var(--panel-head)-40px)/2)]",
}

/** A line list in a head fills the strip, its own rule dropped (the strip's edge is
 *  the rule), its tabs as tall as the strip; pulled left by its first tab's padding
 *  so that label starts where the body does. */
const LINE_IN_HEAD = cn(
  "self-stretch items-stretch after:hidden [&>[data-slot=tabs-tab]]:h-auto",
)
const LINE_PULL: Record<TabsSize, string> = {
  sm: "-ml-2",
  md: "-ml-2.5",
  lg: "-ml-3",
}

/** A folder list's start (plain line in a head): its first label where the body's
 *  text starts (20 px) less a tab's padding (8, 10, 12) and its edge (1), so the
 *  chosen tab's edge stands well in from the panel's. Pulled like a line list,
 *  that edge stood a sliver from the panel's border (Adrian, 2026-10-12). Its tabs
 *  stand from a little below the strip's top, told by their shape alone (no lit
 *  stretch of rule). */
const FOLDER_IN_HEAD: Record<TabsSize, string> = {
  sm: "-ml-[9px]",
  md: "-ml-[11px]",
  lg: "-ml-[13px]",
}
const FOLDER = "pt-2 [&>[data-slot=tabs-indicator]]:hidden"

/** The line look in a plain head: the chosen tab is cut from the body, a folder's
 *  tab. It wears the body's colour as it is seen, solid (the card over the page's
 *  ground) and a hairline round its top, and stands a pixel over the head's rule, so
 *  it opens into what it shows; the rest sit in the head. Every tab keeps the edge,
 *  transparent, so choosing one moves nothing. Read by the tabs inside a list marked
 *  `data-folder`. */
const FOLDER_TAB = cn(
  "in-data-folder:rounded-t-lg in-data-folder:border in-data-folder:border-transparent in-data-folder:border-b-0",
  "in-data-folder:data-active:relative in-data-folder:data-active:top-px in-data-folder:data-active:border-border",
  "in-data-folder:data-active:bg-background in-data-folder:data-active:bg-[linear-gradient(var(--color-card),var(--color-card))]",
)

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

/** The tabs, and the indicator that slides between them. In a panel's head it fits
 *  the strip (`usePanelHead`). */
export function TabsList({
  className,
  children,
  ref,
  ...props
}: TabsListProps) {
  const m = useMaterial()
  const [s, here] = useSurfaceScheme<HTMLDivElement>(undefined, ref)
  const { size, variant, labels } = React.useContext(Look)
  const inHead = usePanelHead() !== null
  const glass = m === "glass"
  const folded = labels === "active"
  // Plain, in a head, the line look is a folder's tabs (FOLDER_TAB).
  const folder = inHead && !glass && variant === "line"
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
      data-folder={folder ? "" : undefined}
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
        inHead && [
          "min-w-0",
          variant === "segment"
            ? SEGMENT_IN_HEAD[size]
            : [
                LINE_IN_HEAD,
                folder ? [FOLDER_IN_HEAD[size], FOLDER] : LINE_PULL[size],
              ],
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

/** When a panel's content is mounted. `seen`: the first time it is shown (its tab
 *  chosen, or a hand in a track starting to swipe it in), and from then on, hidden
 *  while another tab is shown (its state, its scroll and what was typed in it
 *  survive a switch; a panel never shown never mounts, so what it fetches on mount
 *  it fetches on first show, once). `active`: only while shown, so it starts over
 *  each time (in a track it cannot be drawn beside: a swipe towards it leans into
 *  nothing, and it arrives once chosen). `always`: from the start, shown or not
 *  (what must be in the page unseen). */
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

/** A tab's place in the scroll of the panel round the tabs, when that panel
 *  scrolls (`Panel` `maxHeight`, `height`): the tabs share its one scroller, so
 *  each remembers where it was while shown and is put back there when shown again
 *  (a tab never shown starts at the top). Restored before paint, so a switch never
 *  shows the old place first. The place is returned: a track draws a panel beside
 *  the shown one at it, so a swipe brings it in where it will stand. */
function useKeptScroll(active: boolean): React.RefObject<number> {
  const body = usePanelBody()
  const kept = React.useRef(0)
  React.useLayoutEffect(() => {
    const el = body?.scroller.current
    if (!active || !el) return
    el.scrollTop = kept.current
    const keep = () => {
      kept.current = el.scrollTop
    }
    el.addEventListener("scroll", keep, { passive: true })
    return () => el.removeEventListener("scroll", keep)
  }, [active, body])
  return kept
}

/** What one tab shows. Base UI's panel either mounts only while shown or from the
 *  start (`keepMounted`); `seen` is the third way, built here: Base keeps the
 *  panel's element, `Seen` holds its content back until the first show. Hidden
 *  is the `hidden` attribute, which wins over a `flex` or `grid` on the panel
 *  (Tailwind's preflight makes it important); in a track it is `AWAY` instead. In a
 *  panel of a set height (`Panel` `height`) it fills the body, and what it holds
 *  fills it: a log scrolls itself, never scrolled twice. */
export function TabsPanel({
  mount = "seen",
  className,
  children,
  ...props
}: TabsPanelProps) {
  const filled = usePanelBody()?.filled === true
  return (
    <BaseTabs.Panel
      data-slot="tabs-panel"
      className={cn(
        "rounded-md",
        filled && "flex flex-1 flex-col [&>*]:min-h-0 [&>*]:flex-1",
        className,
      )}
      {...props}
      keepMounted={mount !== "active"}
      render={(attrs, state) => (
        // Shown: not hidden, and not on its way out (Base keeps a panel visible
        // while its exit runs, `ending`).
        <PanelFace
          attrs={attrs}
          active={!state.hidden && state.transitionStatus !== "ending"}
          from={state.tabActivationDirection}
          mount={mount}
        >
          {children}
        </PanelFace>
      )}
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
 *  hidden at once: two panels crossing in one place would read as both. A panel a
 *  track brought in by a swipe arrives by the swipe, and plays none of this. */
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

/** Where a panel in a track stands while it is not the one shown (`data-place`).
 *  Every one is its own layer (`will-change`), moved by transforms alone, so a
 *  swipe and an arrival never repaint what is under it nor lift it onto a layer
 *  and back (a switch did both: promoted for its 220 ms arrival, repainted into
 *  the page when it ended). Out of the flow at the track's top, its width.
 *  `beside`: drawn, a hand moving it in. `away`: hidden, its contents skipped by
 *  `content-visibility` rather than taken out of the layout as `hidden` does
 *  (`display: none` throws away their style and layout, so every show built the
 *  whole panel again: the frame a tab is chosen paid for it); transparent, so its
 *  own box draws nothing either, which `visibility` would do by restyling
 *  everything inside on each show. */
const PLACED = cn(
  "will-change-transform",
  "data-place:absolute data-place:inset-x-0 data-place:top-0",
  "data-[place=away]:opacity-0 data-[place=away]:[content-visibility:hidden]",
)

function PanelFace({
  attrs,
  active,
  from,
  mount,
  children,
}: {
  attrs: React.ComponentProps<"div">
  active: boolean
  /** The way the active tab moved, Base UI's `tabActivationDirection`. */
  from: TabsTabActivationDirection
  mount: TabsPanelMount
  children: React.ReactNode
}) {
  const { ref, hidden, className, ...rest } = attrs
  const track = React.useContext(InTrack)
  const id = rest.id
  const beside =
    track !== null && id !== undefined && !active && track.beside.has(id)
  const own = React.useRef<HTMLDivElement | null>(null)
  const was = React.useRef(active)
  const kept = useKeptScroll(active)
  const both = React.useCallback(
    (node: HTMLDivElement | null) => {
      own.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  React.useLayoutEffect(() => {
    if (!track) return
    if (own.current?.parentElement?.dataset.slot !== "tabs-panels")
      throw new Error(
        "TabsPanel: inside TabsPanels it stands straight in the track, which places it and moves it",
      )
    if (id === undefined) throw new Error("TabsPanel: Base gave it no id")
    return track.keep(id, kept)
  }, [track, id, kept])
  React.useLayoutEffect(() => {
    const arrived = active && !was.current
    was.current = active
    const node = own.current
    if (!arrived || !node) return
    if (track && id !== undefined && track.arrived(id)) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    node.animate(
      [
        { opacity: 0, transform: FROM[from] },
        { opacity: 1, transform: "none" },
      ],
      ARRIVE_TIMING,
    )
  }, [active, from, track, id])
  return (
    <div
      ref={both}
      {...rest}
      hidden={track ? undefined : hidden}
      data-place={track && !active ? (beside ? "beside" : "away") : undefined}
      className={cn(className, track && PLACED)}
    >
      <PanelActive.Provider value={active}>
        {mount === "seen" ? (
          <Seen active={active || beside}>{children}</Seen>
        ) : (
          children
        )}
      </PanelActive.Provider>
    </div>
  )
}

// ── the track: swiping between the panels ──

/** What a track tells the panels in it. */
type Track = {
  /** The panels drawn beside the shown one (their ids) while a hand moves them. */
  beside: ReadonlySet<string>
  /** A panel became the one shown: true when the track brought it in by a swipe
   *  (it then plays no arrival of its own). */
  arrived: (id: string) => boolean
  /** A panel's kept place in a scrolling panel's shared scroll, for drawing it
   *  beside at the place it will stand. Returns the unregistering. */
  keep: (id: string, kept: React.RefObject<number>) => () => void
}
const InTrack = React.createContext<Track | null>(null)
const NONE: ReadonlySet<string> = new Set()

/** How long a bought tab may take to become the shown one (a link's navigation, a
 *  controlled `value` its owner sets) before the panels go home: an owner that
 *  refuses the change would otherwise leave them leaning at the line. */
const CARRY_WAIT = 600
/** A wheel stream is sideways once its travel leans this much more sideways than
 *  upright. Up and down is the page's verb, so sideways must win clearly; the
 *  lightbox, a stage where sideways is the verb, weighs it the other way round
 *  (`wheelAxisOf`). */
const SIDEWAYS = 1.5
/** A touch that swiped is no tap: the click the browser may send after it, within
 *  this long, is dropped, or a swipe begun on a link would follow the link. */
const CLICK_AFTER_SWIPE = 400

type Side = -1 | 1
/** A panel the track moves: `slot` is where it stands from the shown one, in
 *  panels (-1 to the left, 1 to the right), `y` its offset to its kept place. */
type Moving = { id: string; node: HTMLElement; slot: number; y: number }
/** A tab beside the shown one, its panel, and that panel's element when it has one
 *  (`mount="active"` has none until chosen). */
type Neighbour = {
  tab: HTMLElement
  id: string | null
  node: HTMLElement | null
}

const at = (x: number, y: number) => `translate3d(${x}px, ${y}px, 0)`

/** The track's engine, outside React: it reads the hand, writes transforms, and
 *  tells React only at checkpoints (which panels are beside, whether it clips).
 *  The motion is the lightbox's slide track (`lightbox.notes.md`, "The slide
 *  track"), on its own functions: the panels LEAN with the hand, `swipeGive`,
 *  quadratic up to the line (`swipeCommitPx`), so a trackpad's dying tail moves
 *  nothing anyone sees; past the line the tab is BOUGHT, one a gesture, and the
 *  gesture is spent until a surge or a turn (`swipeBreak`) says a hand is back;
 *  silence (`SWIPE_END`) or a finger lifting ends it; the move home or to the
 *  next panel is the lightbox's glide, a cubic Hermite (`glide`), here a Web
 *  Animation whose easing is that same cubic, so it runs on the compositor
 *  through the frame React spends showing the new panel.
 *
 *  Choosing the tab is pressing it (`tab.click()`): Base decides, a link
 *  navigates, a controlled `value` asks its owner, exactly as under a finger's
 *  tap. One writer: `base` (where the shown panel stands) plus the lean. */
function createSwipe(view: {
  show: (ids: ReadonlySet<string>) => void
  clip: (on: boolean) => void
}) {
  const places = new Map<string, React.RefObject<number>>()
  let el: HTMLElement | null = null
  let scroller: HTMLElement | null = null
  let width = 0
  let base = 0
  let travel = 0
  let spent = false
  let spentDir = 0
  let env = 0
  let samples: Sample[] = []
  let gesture: "wheel" | "touch" | null = null
  let sides: Record<Side, Neighbour | null> = { [-1]: null, 1: null }
  let panels: Moving[] = []
  let carry: { tab: HTMLElement; side: Side; vx: number } | null = null
  /** Inside React's commit (a panel's arrival): what React must draw before the
   *  paint it draws already, never through `flushSync`, which it refuses there. */
  let committing = false
  let flight: {
    anims: Animation[]
    from: number
    d: number
    m0: number
    ms: number
  } | null = null
  let endTimer = 0
  let carryTimer = 0

  const stride = () => width + SLIDE_GAP
  const line = () => swipeCommitPx(width)
  const lean = () => (spent ? 0 : swipeGive(travel, line()))
  const paint = () => {
    const x = base + lean()
    for (const p of panels)
      p.node.style.transform = at(x + p.slot * stride(), p.y)
  }
  /** Where a panel beside stands up and down: at its own kept place in a scrolling
   *  panel, which is the scroll the panel will be put back at once shown. */
  const yOf = (id: string) => {
    const kept = places.get(id)
    return scroller && kept ? scroller.scrollTop - kept.current : 0
  }
  const root = () => {
    const r = el?.closest<HTMLElement>("[data-slot=tabs]")
    if (!r) throw new Error("TabsPanels: not inside Tabs")
    return r
  }
  /** The tabs that can be chosen, in order: the first tab list of these tabs (a
   *  nested Tabs inside a panel has its own). */
  const tabs = (r: HTMLElement) => {
    const list = Array.from(
      r.querySelectorAll<HTMLElement>("[role=tablist]"),
    ).find((l) => l.closest("[data-slot=tabs]") === r)
    if (!list) throw new Error("TabsPanels: these tabs have no TabsList")
    return Array.from(list.querySelectorAll<HTMLElement>("[role=tab]")).filter(
      (t) =>
        t.closest("[role=tablist]") === list &&
        t.getAttribute("aria-disabled") !== "true" &&
        !t.hasAttribute("data-disabled"),
    )
  }
  const neighbour = (tab: HTMLElement | undefined): Neighbour | null => {
    if (!tab) return null
    const id = tab.getAttribute("aria-controls")
    const node = id ? document.getElementById(id) : null
    return { tab, id, node: node?.parentElement === el ? node : null }
  }
  const clear = (p: Moving) => {
    p.node.style.transform = ""
  }
  const settle = () => {
    for (const p of panels) clear(p)
    panels = []
    base = 0
    travel = 0
    view.show(NONE)
    view.clip(false)
  }
  /** Settled before this frame paints: the panel that left must be hidden in the
   *  same frame its transform goes, or it shows at 0 over the one shown. */
  const settleNow = () => (committing ? settle() : flushSync(settle))
  /** A move in flight is read at its own clock and held there: a hand taking over
   *  starts from exactly where the panels are. */
  const hold = () => {
    if (!flight) return
    const a = flight.anims[0]
    const s = a ? clamp(Number(a.currentTime ?? 0) / flight.ms, 0, 1) : 1
    base = flight.from + glide(flight.d, flight.m0, s)
    for (const x of flight.anims) x.cancel()
    flight = null
    travel = 0
    paint()
  }
  /** The panels go to rest, the shown one at 0, leaving at the speed they were
   *  handed (`vx`, px per ms, the way they move). */
  const fly = (vx: number) => {
    if (flight) throw new Error("TabsPanels: a move began over another")
    const d = -base
    if (
      Math.abs(d) < 0.5 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      base = 0
      paint()
      settleNow()
      return
    }
    // The lightbox's glide (`glideTo`): longer for further, never linear in it.
    const ms = clamp(
      GLIDE_MS * Math.sqrt(Math.abs(d) / stride()),
      GLIDE_MIN,
      GLIDE_MAX,
    )
    // Its entry tangent in multiples of the move's own average speed. The Hermite
    // from 0 to d, leaving at m0 and arriving still, is the cubic Bezier with its
    // inner points at a third of m0 and at d: in CSS, cubic-bezier(1/3, k/3, 2/3,
    // 1) over a linear clock. The compositor plays the curve the lightbox computes.
    const k = clamp((vx * ms) / d, GLIDE_ENTRY_MIN, GLIDE_ENTRY)
    const easing = `cubic-bezier(${1 / 3}, ${k / 3}, ${2 / 3}, 1)`
    const from = base
    base = 0
    const anims = panels.map((p) => {
      const to = at(p.slot * stride(), p.y)
      p.node.style.transform = to
      return p.node.animate(
        [{ transform: at(from + p.slot * stride(), p.y) }, { transform: to }],
        { duration: ms, easing },
      )
    })
    const f = { anims, from, d, m0: k * d, ms }
    flight = f
    anims[0]?.finished.then(
      () => {
        if (flight !== f) return
        flight = null
        settleNow()
      },
      () => {},
    )
  }
  /** A gesture takes the panels: the shown one and its neighbours, drawn beside.
   *  False when there is nothing here to move. */
  const open = (kind: "wheel" | "touch"): boolean => {
    if (!el) return false
    gesture = kind
    travel = 0
    samples = []
    // A tab bought and still on its way: this gesture is the tail of that one.
    if (carry) {
      spent = true
      return true
    }
    spent = false
    spentDir = 0
    hold()
    const r = root()
    const all = tabs(r)
    const i = all.findIndex((t) => t.getAttribute("aria-selected") === "true")
    const here = neighbour(all[i])
    if (!here?.id || !here.node) {
      gesture = null
      return false
    }
    width = el.clientWidth
    const forward: Side = getComputedStyle(el).direction === "rtl" ? -1 : 1
    const next = neighbour(all[i + 1])
    const prev = i > 0 ? neighbour(all[i - 1]) : null
    sides = { [forward]: next, [-forward]: prev } as Record<
      Side,
      Neighbour | null
    >
    const moving: Moving[] = [{ id: here.id, node: here.node, slot: 0, y: 0 }]
    for (const side of [-1, 1] as const) {
      const n = sides[side]
      if (n?.id && n.node)
        moving.push({ id: n.id, node: n.node, slot: side, y: yOf(n.id) })
    }
    for (const p of panels) if (!moving.some((m) => m.node === p.node)) clear(p)
    panels = moving
    // The shown panel's own arrival, if it is still playing, gives way to the hand.
    for (const a of here.node.getAnimations()) a.cancel()
    view.show(new Set(moving.slice(1).map((p) => p.id)))
    view.clip(true)
    paint()
    return true
  }
  /** Travel from the hand, in px the way the content should move. */
  const feed = (hand: number, t: number) => {
    if (!gesture || spent) return
    const last = samples[samples.length - 1]
    samples = [...samples, { x: (last?.x ?? 0) + hand, y: 0, t }].slice(
      -SAMPLES,
    )
    travel += hand
    if (Math.abs(travel) >= line()) buy(Math.sign(travel) as Side, t)
    paint()
  }
  /** The tab on the side the hand uncovered is bought: the panels hold where they
   *  are, and the gesture is spent. They move again when it is the shown one. */
  const buy = (dir: Side, t: number) => {
    const side = -dir as Side
    const n = sides[side]
    if (!n) {
      // The end of the tabs: the lean holds at the line, never running off an edge
      // with nothing behind it.
      travel = dir * line()
      return
    }
    base += swipeGive(travel, line())
    travel = 0
    spent = true
    spentDir = dir
    if (gesture === "wheel") stream.spent = true
    carry = { tab: n.tab, side, vx: velocity(samples, t).x }
    // The one leaving stays drawn once it is no longer the shown one.
    view.show(new Set(panels.map((p) => p.id)))
    window.clearTimeout(carryTimer)
    carryTimer = window.setTimeout(() => {
      carry = null
      if (!gesture && !flight && panels.length) fly(0)
    }, CARRY_WAIT)
    n.tab.click()
  }
  const end = () => {
    window.clearTimeout(endTimer)
    if (!gesture) return
    gesture = null
    // Bought and on its way, or already moving: nothing to wind back.
    if (carry || flight || !panels.length) return
    base += lean()
    travel = 0
    fly(0)
  }
  const arrived = (id: string): boolean => {
    // The bought tab's panel, by the tab: a panel mounted only while shown has an
    // id only once it is.
    if (!carry || carry.tab.getAttribute("aria-controls") !== id) {
      // Chosen some other way (a tab pressed, a key) while a hand moved the
      // panels: the hand's motion is dropped and the arrival is the tab's.
      if (panels.length || flight) {
        for (const a of flight?.anims ?? []) a.cancel()
        flight = null
        carry = null
        gesture = null
        settle()
      }
      return false
    }
    window.clearTimeout(carryTimer)
    const { side, vx } = carry
    carry = null
    committing = true
    try {
      // Late, after the panels set off home (`CARRY_WAIT`): taken from where they are.
      hold()
      // The one arriving is now the shown one: every slot moves by one, and the
      // origin with them, so nothing moves on this line.
      base += side * stride()
      const keep: Moving[] = []
      for (const p of panels) {
        const slot = p.slot - side
        if (Math.abs(slot) > 1) clear(p)
        else keep.push({ ...p, slot, y: slot === 0 ? 0 : yOf(p.id) })
      }
      // Never drawn beside (`mount="active"`): it comes in from the side all the
      // same, from where it would have stood.
      const node = document.getElementById(id)
      if (!keep.some((p) => p.slot === 0) && node?.parentElement === el)
        keep.push({ id, node, slot: 0, y: 0 })
      panels = keep
      view.show(new Set(keep.filter((p) => p.slot !== 0).map((p) => p.id)))
      paint()
      fly(vx)
    } finally {
      committing = false
    }
    return true
  }

  // ── the hand ──
  /** Does something under the hand take sideways motion itself: a scroller that
   *  scrolls sideways, a slider, anything that asks for every touch. Then the
   *  gesture is its, read once as it starts. */
  const claimed = (target: EventTarget | null) => {
    for (
      let n = target instanceof Element ? target : null;
      n && n !== el;
      n = n.parentElement
    ) {
      if (n.matches("[role=slider], input[type=range]")) return true
      const s = getComputedStyle(n)
      if (s.touchAction === "none" || s.touchAction === "pan-x") return true
      if (
        (s.overflowX === "auto" || s.overflowX === "scroll") &&
        n.scrollWidth > n.clientWidth + 1
      )
        return true
    }
    return false
  }
  const upright = () => root().getAttribute("data-orientation") === "vertical"

  /** The wheel stream: the device's events from the first to the last before a
   *  silence, told by their own time stamps (when the device sent them, not when
   *  the page got round to them). `spent`: a tab was bought in it. */
  let stream = {
    at: Number.NEGATIVE_INFINITY,
    axis: null as "x" | "y" | "pass" | null,
    x: 0,
    y: 0,
    spent: false,
  }
  /** A wheel: one axis for the whole stream, read off its travel (the first event
   *  of a trackpad swipe carries whatever the fingers happened to do), and only a
   *  sideways one is the track's. Undecided, a sideways event is held back from
   *  the page (which would scroll it, or go back in history on a Mac) and an
   *  upright one passes, so scrolling the page never waits. Silence ends a stream. */
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return
    const t = e.timeStamp
    if (t - stream.at > SWIPE_END)
      stream = {
        at: t,
        axis: upright() || claimed(e.target) ? "pass" : null,
        x: 0,
        y: 0,
        spent: false,
      }
    stream.at = t
    if (stream.axis === "pass" || stream.axis === "y") return
    const dx = wheelPx(e.deltaX, e.deltaMode, window.innerHeight)
    const dy = wheelPx(e.deltaY, e.deltaMode, window.innerHeight)
    if (stream.axis === null) {
      stream.x += dx
      stream.y += dy
      if (Math.max(Math.abs(stream.x), Math.abs(stream.y)) < INTENT) {
        if (Math.abs(dx) > Math.abs(dy)) e.preventDefault()
        return
      }
      stream.axis =
        Math.abs(stream.x) > SIDEWAYS * Math.abs(stream.y) ? "x" : "y"
      if (stream.axis === "y") return
      e.preventDefault()
      take(-stream.x, t)
      return
    }
    e.preventDefault()
    // The content moves against the wheel's delta: fingers swiping left scroll
    // the page right.
    take(-dx, t)
  }
  const take = (hand: number, t: number) => {
    if (gesture === "touch") return
    // Spent: this gesture bought its tab, or the silence timer called it over while
    // its stream never went quiet (a main thread busy showing the bought panel ran
    // the timer before the events it held back, and the rest of the same swipe
    // bought a second tab).
    const tail = gesture === null && stream.spent
    // Only a SPENT gesture can be interrupted: one still choosing owns every
    // delta, and the two signals tell a new hand from a dying tail.
    const broke =
      (gesture === "wheel" && spent) || tail
        ? swipeBreak(hand, env, spentDir)
        : null
    env = swipeEnvelope(hand, env)
    if (broke) {
      end()
      stream.spent = false
    } else if (tail) return
    if (!gesture) {
      if (!open("wheel")) return
      env = Math.abs(hand)
    }
    window.clearTimeout(endTimer)
    endTimer = window.setTimeout(end, SWIPE_END)
    feed(hand, t)
  }

  let touch: {
    id: number
    x0: number
    y0: number
    last: number
    axis: "x" | null
  } | null = null
  let quietUntil = 0
  /** A finger. The track is `touch-action: pan-y`: the browser pans up and down
   *  and pinches, and a touch that starts sideways is never its, so it arrives
   *  here whole. One finger only: a second one is a pinch, the browser's. */
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return
    if (!e.isPrimary) {
      if (touch?.axis === "x") end()
      touch = null
      return
    }
    if (upright() || claimed(e.target)) return
    touch = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      last: e.clientX,
      axis: null,
    }
  }
  const onMove = (e: PointerEvent) => {
    if (!touch || e.pointerId !== touch.id) return
    if (touch.axis === null) {
      const tx = e.clientX - touch.x0
      const ty = e.clientY - touch.y0
      if (Math.abs(tx) + Math.abs(ty) < INTENT) return
      // Upright: the browser is panning the page and will cancel this pointer.
      if (Math.abs(tx) <= Math.abs(ty)) {
        touch = null
        return
      }
      if (gesture === "wheel") end()
      if (!open("touch")) {
        touch = null
        return
      }
      touch.axis = "x"
      touch.last = e.clientX
      feed(tx, e.timeStamp)
      return
    }
    const dx = e.clientX - touch.last
    touch.last = e.clientX
    feed(dx, e.timeStamp)
  }
  const onUp = (e: PointerEvent) => {
    if (!touch || e.pointerId !== touch.id) return
    const swiped = touch.axis === "x"
    touch = null
    if (!swiped) return
    if (e.type === "pointerup") quietUntil = e.timeStamp + CLICK_AFTER_SWIPE
    end()
  }
  const onClick = (e: MouseEvent) => {
    if (e.timeStamp > quietUntil) return
    e.preventDefault()
    e.stopPropagation()
  }

  return {
    arrived,
    keep: (id: string, kept: React.RefObject<number>) => {
      places.set(id, kept)
      return () => {
        if (places.get(id) === kept) places.delete(id)
      }
    },
    /** Reads the hand on the track until the returned function is called. */
    attach(track: HTMLElement, body: HTMLElement | null) {
      if (!track.closest("[data-slot=tabs]"))
        throw new Error("TabsPanels: outside Tabs, there are no tabs to swipe")
      el = track
      scroller = body
      track.addEventListener("wheel", onWheel, { passive: false })
      track.addEventListener("pointerdown", onDown)
      track.addEventListener("pointermove", onMove)
      track.addEventListener("pointerup", onUp)
      track.addEventListener("pointercancel", onUp)
      track.addEventListener("click", onClick, { capture: true })
      return () => {
        track.removeEventListener("wheel", onWheel)
        track.removeEventListener("pointerdown", onDown)
        track.removeEventListener("pointermove", onMove)
        track.removeEventListener("pointerup", onUp)
        track.removeEventListener("pointercancel", onUp)
        track.removeEventListener("click", onClick, { capture: true })
        window.clearTimeout(endTimer)
        window.clearTimeout(carryTimer)
        for (const a of flight?.anims ?? []) a.cancel()
        flight = null
        for (const p of panels) clear(p)
        panels = []
        el = null
      }
    },
  }
}

export type TabsPanelsProps = Omit<React.ComponentProps<"div">, "className"> & {
  className?: string
}

/** The panels' track: the `TabsPanel`s straight inside it, and nothing else. A
 *  hand swipes between them (`createSwipe`); a hidden one stays laid out, ready
 *  to be drawn beside or shown. It clips while panels move (`data-swiping`), and
 *  only then, so a ring or a shadow at the panels' edge is never cut at rest. In
 *  a panel of a set height it fills the body, as the panels in it do. */
export function TabsPanels({
  className,
  children,
  ref,
  ...props
}: TabsPanelsProps) {
  const body = usePanelBody()
  const [beside, setBeside] = React.useState(NONE)
  const [swiping, setSwiping] = React.useState(false)
  const [engine] = React.useState(() =>
    createSwipe({ show: setBeside, clip: setSwiping }),
  )
  const [el, setEl] = React.useState<HTMLDivElement | null>(null)
  const both = React.useCallback(
    (node: HTMLDivElement | null) => {
      setEl(node)
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  // The scroller's ref, never the body object round it: Panel makes that object
  // anew on every render, and re-attaching drops a gesture under way.
  const scroller = body?.scroller
  React.useLayoutEffect(() => {
    if (!el) return
    return engine.attach(el, scroller?.current ?? null)
  }, [el, engine, scroller])
  const track = React.useMemo(
    () => ({ beside, arrived: engine.arrived, keep: engine.keep }),
    [beside, engine],
  )
  return (
    <InTrack.Provider value={track}>
      <div
        ref={both}
        data-slot="tabs-panels"
        data-swiping={swiping ? "" : undefined}
        className={cn(
          "relative touch-pan-y touch-pinch-zoom data-swiping:overflow-clip",
          body?.filled && "flex min-h-0 flex-1 flex-col",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </InTrack.Provider>
  )
}
