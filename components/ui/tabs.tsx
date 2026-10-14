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
  glassLift,
  glassVariants,
  schemeOf,
} from "@/components/ui/material-glass"
import { usePanelBody, usePanelHead } from "@/components/ui/panel"

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

/** A tab's place in the scroll of the panel round the tabs, when that panel
 *  scrolls (`Panel` `maxHeight`, `height`): the tabs share its one scroller, so
 *  each remembers where it was while shown and is put back there when shown again
 *  (a tab never shown starts at the top). Restored before paint, so a switch never
 *  shows the old place first. */
function useKeptScroll(active: boolean) {
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
}

/** What one tab shows. Base UI's panel either mounts only while shown or from the
 *  start (`keepMounted`); `seen` is the third way, built here: Base keeps the
 *  panel's element, `Seen` holds its content back until the first show. Hidden
 *  is the `hidden` attribute, which wins over a `flex` or `grid` on the panel
 *  (Tailwind's preflight makes it important). In a panel of a set height (`Panel`
 *  `height`) it fills the body, and what it holds fills it: a log scrolls itself,
 *  never scrolled twice. */
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
  useKeptScroll(active)
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
