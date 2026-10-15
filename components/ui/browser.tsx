"use client"

// A BROWSER WINDOW, a frame you put a page in: your own React (a mocked page), a live
// site (`BrowserLive`, an iframe where the site allows framing, its unfurl where it
// refuses), or a scripted visit (`BrowserSession`: an address typed, a page loading,
// a link followed, a scroll) that plays on the playhead like the terminal and the
// chats, so it can be recorded alone or set on a Mac's desktop (`<Macos>`'s windows).
//
// `Browser` is controlled and draws one instant: the address field's text, its focus,
// the load's bar, back and forward, how far down the page is. Whoever holds the
// moment passes it: a page by hand, or `BrowserSession` from the visit's frame at the
// playhead (lib/browser-session). The chrome is a depiction, display-only and hidden
// from assistive tech (zero focusables): the page inside is the real thing.
//
// THE LOOK is the browser depicted, `look`, one chrome per name (`CHROMES`). Safari's
// only, for now; another browser is another entry with its own toolbar and its own
// heights, the window and the page around it shared.
//
// THE MATERIAL is the depicted browser's own two eras: plain is Safari's opaque
// toolbar, the page below it; glass is Safari 26's, no toolbar at all, its controls
// glass capsules floating over the page, which runs up under them. The capsules are
// front surfaces over the scroller, never inside it (the rule for a glass front): the
// page pads its top by the chrome's height so it starts below them and scrolls under.

import {
  ChevronLeft,
  ChevronRight,
  Copy,
  PanelLeft,
  Plus,
  RotateCw,
  Share,
  TextAlignJustify,
  X,
} from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import type { BrowserCapture } from "@/lib/browser-capture"
import type { LivePage } from "@/lib/browser-framing"
import {
  type BrowserLoad,
  type BrowserStep,
  browserFrameAt,
  browserTimeline,
  urlOf,
} from "@/lib/browser-session"
import { hostOf } from "@/lib/web-preview-unfurl"
import { Button } from "@/components/ui/button"
import { Copy as CopyValue } from "@/components/ui/copy"
import { Image } from "@/components/ui/image"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import { usePlayhead } from "@/components/ui/playback"
import {
  NO_SCROLLBAR,
  ScrollThumbs,
} from "@/components/ui/scroll-thumb"
import { WebPreview } from "@/components/ui/web-preview"

/** The browser depicted. Each is a chrome in `CHROMES`: `safari` a Mac's window,
 *  `safari-ios` Safari on an iPhone (iOS 26), filling the screen of the box it is
 *  put in (an `IphoneFrame`'s), its controls at the foot. */
export type BrowserLook = "safari" | "safari-ios"

/** A tab in the tab bar. The bar shows when there are two or more, as Safari's
 *  does. */
export interface BrowserTab {
  title: string
  /** The site's icon, a URL. */
  icon?: string
}

export interface BrowserProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  look?: BrowserLook
  /** The page's address. */
  url: string
  /** What the address field holds when it is not the page's address: the text
   *  being typed, or the address of a page still loading. */
  address?: string
  /** The address field has focus: its text is shown whole, left-aligned, with the
   *  caret at its end. */
  editing?: boolean
  /** At rest, the whole address, not the host alone (Safari's "show full website
   *  address"): for a page whose path is the point (a profile's address). */
  full?: boolean
  /** The page's real address, live: the address field opens it (a new tab), a copy
   *  shows in it under the hand, and the share glyph shares it (the system's sheet,
   *  else a copy). The rest of the window stays a picture. */
  link?: string
  /** Focused and not yet typed in: the whole address is selected. */
  selected?: boolean
  /** A load under way: the bar along the address field's foot. */
  load?: BrowserLoad | null
  /** Whether back and forward have anywhere to go (dimmed when not). */
  back?: boolean
  forward?: boolean
  /** How far down the page is, 0..1. Set, the page is held there (a recording);
   *  unset, the reader scrolls it. */
  scroll?: number
  /** The site's icon, drawn before its host in the address field. */
  icon?: string
  tabs?: BrowserTab[]
  /** The tab in front, an index of `tabs`. */
  tab?: number
  material?: Material
  scheme?: Scheme
  /** The page. */
  children?: React.ReactNode
}

/** The OS being depicted speaks in its own face, not the page's. */
const SYSTEM = "-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
/** Safari's accent: the load bar, the focus ring, the caret, a selection. */
const BLUE = "#0a84ff"
/** The load's hairline: the accent, paler and thinner, as Safari 26 draws it. */
const LOAD_BLUE = "rgb(100 170 255 / 0.75)"

/** What a look's chrome is told. */
interface ChromeProps {
  address: string
  editing: boolean
  selected: boolean
  load: BrowserLoad | null
  back: boolean
  forward: boolean
  icon: string | undefined
  tabs: BrowserTab[] | undefined
  tab: number
  glass: boolean
  full: boolean
  link: string | undefined
}

interface Chrome {
  /** Where the controls stand: across the window's top (a Mac's), or at the
   *  screen's foot (a phone's). */
  place: "top" | "bottom"
  /** The window the page is in: a Mac window's shape and shadow, or the whole of
   *  a phone's screen. */
  window: string
  /** What the page is padded by, CSS lengths: its top (the chrome's band in glass,
   *  where the page runs up under it, and a phone's status bar always) and its
   *  foot (a phone's controls in glass). */
  insets: (o: { glass: boolean; tabbed: boolean }) => {
    top: string
    bottom: string
  }
  Toolbar: React.ComponentType<ChromeProps>
}

export function Browser({
  look = "safari",
  url,
  address,
  editing = false,
  full = false,
  link,
  selected = false,
  load = null,
  back = false,
  forward = false,
  scroll,
  icon,
  tabs,
  tab = 0,
  material: own,
  scheme,
  children,
  className,
  style,
  ref,
  ...props
}: BrowserProps) {
  const material = useMaterial(own)
  const [worn, root] = useSurfaceScheme<HTMLDivElement>(scheme, ref)
  const chrome = CHROMES[look]
  if (tabs && (tab < 0 || tab >= tabs.length))
    throw new Error(`browser: tab ${tab} is not one of ${tabs.length} tabs`)
  const glass = material === "glass"
  const tabbed = (tabs?.length ?? 0) > 1
  const insets = chrome.insets({ glass, tabbed })
  const bottom = chrome.place === "bottom"
  const toolbar = (
    <chrome.Toolbar
      address={address ?? url}
      editing={editing}
      selected={selected}
      load={load}
      back={back}
      forward={forward}
      icon={icon}
      tabs={tabbed ? tabs : undefined}
      tab={tab}
      glass={glass}
      full={full}
      link={link}
    />
  )
  // The chrome is a depiction, hidden from assistive tech, unless it holds the live
  // address (`link`): then its two live controls are read, its glyphs saying nothing.
  const depicted = link === undefined
  return (
    <div
      ref={root}
      data-slot="browser"
      data-look={look}
      data-material={material}
      className={cn(
        "relative isolate flex flex-col overflow-hidden bg-background text-foreground",
        chrome.window,
        schemeOf(worn),
        className,
      )}
      style={
        {
          fontFamily: SYSTEM,
          "--ag-browser-top": insets.top,
          "--ag-browser-bottom": insets.bottom,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {glass ? (
        <>
          <BrowserPage scroll={scroll} className="absolute inset-0">
            {children}
          </BrowserPage>
          {/* Safari 26's band behind its controls (a Mac's) or the status bar (a
              phone's): the page passing under blurred away and tinted with its own
              ground, never sharp behind the window buttons or the clock. A sibling
              of the toolbar, so the capsules' own glass still reads what lies
              under them. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-(--ag-browser-top) bg-background/75 backdrop-blur-2xl backdrop-saturate-150"
          />
          {bottom && (
            // A phone's foot: the page dimming into its ground under the
            // floating controls, so they stand on it whatever scrolls by.
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-(--ag-browser-bottom) bg-linear-to-b from-transparent to-background/80"
            />
          )}
          <div
            aria-hidden={depicted || undefined}
            className={cn(
              "pointer-events-none absolute inset-x-0 z-10",
              bottom ? "bottom-0" : "top-0",
            )}
          >
            {toolbar}
          </div>
        </>
      ) : (
        <>
          {!bottom && (
            <div aria-hidden={depicted || undefined} className="shrink-0">
              {toolbar}
            </div>
          )}
          <BrowserPage scroll={scroll} className="relative min-h-0 flex-1">
            {children}
          </BrowserPage>
          {bottom && (
            <div aria-hidden={depicted || undefined} className="shrink-0">
              {toolbar}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** The page's scroller. Held at `scroll` for a recording (no overflow of its own,
 *  so nothing but the playhead moves it), else the reader's, with the registry's
 *  thumbs. Its top is padded by the glass chrome over it (`--ag-browser-top`), and
 *  the thumbs keep out of that band (`scroll-padding-top`). */
function BrowserPage({
  scroll,
  className,
  children,
}: {
  scroll: number | undefined
  className: string
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || scroll === undefined) return
    el.scrollTop = scroll * (el.scrollHeight - el.clientHeight)
  })
  return (
    <div
      ref={ref}
      data-slot="browser-page"
      className={cn(
        "pt-(--ag-browser-top) pb-(--ag-browser-bottom) [scroll-padding-top:var(--ag-browser-top)]",
        // edge: a browser's page meets its toolbar and the window's foot with a
        // hard edge, as the depicted browser draws it; a fade would be ours, not its.
        scroll === undefined
          ? `overflow-y-auto ${NO_SCROLLBAR}`
          : "overflow-hidden",
        className,
      )}
    >
      {scroll === undefined && <ScrollThumbs scroller={ref} />}
      {children}
    </div>
  )
}

// ── safari ──

const SAFARI_TOOLBAR = 52
const SAFARI_TABS = 32

/** A toolbar glyph's cell, as Safari spaces them: on the plain bar a box; in
 *  glass a square the capsule's height, so a capsule is as long as its glyphs (one
 *  alone a circle, a group a pill), never padded round them. */
const GLYPH = "flex shrink-0 items-center justify-center [&_svg]:size-[17px]"
const PLAIN_CELL = "h-7 w-8"
const GLASS_CELL = "size-9"
/** A glyph only a wide window has room for (the chrome is the container): below
 *  it, the room goes to the address, which a mid-size window would otherwise cut
 *  (a `full` address's path is the part that matters). */
const WIDE = "hidden @xl/browser:flex"
/** A glass capsule: Safari 26's controls, each group of them one piece of glass. */
const CAPSULE = cn(
  glassVariants({ shape: "surface" }),
  "flex h-9 items-center [--glass-radius:18px]",
)

/** The three window buttons, in their own colours (active window). */
function TrafficLights() {
  return (
    <span data-slot="browser-window-buttons" className="flex shrink-0 gap-2">
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span
          key={c}
          className="size-3 rounded-full shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.18)]"
          style={{ background: c }}
        />
      ))}
    </span>
  )
}

function SafariToolbar({
  address,
  editing,
  selected,
  load,
  back,
  forward,
  icon,
  tabs,
  tab,
  glass,
  full,
  link,
}: ChromeProps) {
  const cell = cn(GLYPH, glass ? GLASS_CELL : PLAIN_CELL)
  // A narrow window keeps back, forward, share and the field, as Safari's does.
  const navigation = (
    <>
      <span className={cn(cell, WIDE)}>
        <PanelLeft strokeWidth={1.75} />
      </span>
      <span className={cn(cell, !back && "opacity-35")}>
        <ChevronLeft strokeWidth={2} />
      </span>
      <span className={cn(cell, !forward && "opacity-35")}>
        <ChevronRight strokeWidth={2} />
      </span>
    </>
  )
  const actions = (
    <>
      <span className={cell}>
        {link === undefined ? (
          <Share strokeWidth={1.75} />
        ) : (
          // Live: the system's share sheet with the page's address, else a copy.
          // A button of its own size in the glyph's cell, concentric with it.
          <Button
            variant="ghost"
            size={glass ? "icon" : "icon-sm"}
            aria-label="share this address"
            onClick={() => share(link)}
            className="pointer-events-auto"
          >
            <Share strokeWidth={1.75} />
          </Button>
        )}
      </span>
      <span className={cn(cell, WIDE)}>
        <Plus strokeWidth={1.75} />
      </span>
      <span className={cn(cell, WIDE)}>
        <Copy strokeWidth={1.75} />
      </span>
    </>
  )
  return (
    <div data-slot="browser-chrome" className="@container/browser select-none">
      <div
        data-slot="browser-toolbar"
        className={cn(
          "grid items-center gap-3 px-4 [grid-template-columns:minmax(max-content,1fr)_minmax(0,560px)_minmax(max-content,1fr)]",
          glass
            ? "text-foreground/75"
            : "border-black/10 border-b bg-[#f6f6f6] text-black/55 scheme-dark:border-black/60 scheme-dark:bg-[#2b2b2d] scheme-dark:text-white/55",
        )}
        style={{ height: SAFARI_TOOLBAR }}
      >
        <div className="flex items-center gap-3">
          <TrafficLights />
          {glass ? (
            <span className={CAPSULE}>{navigation}</span>
          ) : (
            <span className="flex items-center">{navigation}</span>
          )}
        </div>
        <AddressField
          address={address}
          editing={editing}
          selected={selected}
          load={load}
          icon={icon}
          glass={glass}
          full={full}
          link={link}
        />
        <div className="flex items-center justify-end">
          {glass ? <span className={CAPSULE}>{actions}</span> : actions}
        </div>
      </div>
      {tabs && <SafariTabs tabs={tabs} tab={tab} glass={glass} />}
    </div>
  )
}

/** The system's share sheet with `url`, where there is one (a phone, Safari); else
 *  the address copied. A share the person cancels is theirs, not a failure. */
async function share(url: string) {
  if (navigator.share) {
    try {
      await navigator.share({ url })
    } catch (e) {
      if ((e as Error).name !== "AbortError") throw e
    }
    return
  }
  await navigator.clipboard.writeText(url)
}

/** An address as the field shows it at rest: the host alone, or with `full` the
 *  whole address (Safari's "show full website address"), its scheme and `www.`
 *  dropped. Read from the text, never through `URL`, which would turn a host in
 *  other scripts into punycode (👤.to into xn--mq8h.to). */
function shownAt(address: string, full: boolean): string {
  const bare = address.replace(/^[a-z]+:\/\//i, "").replace(/^www\./, "")
  return full ? bare.replace(/\/$/, "") : (bare.split(/[/?#]/)[0] ?? bare)
}

/** The address field: at rest the page's host, centred, with the site's icon and
 *  the reload glyph (a stop glyph while it loads); focused, the whole text, left,
 *  with the caret, or selected; the load's bar along its foot. */
function AddressField({
  address,
  editing,
  selected,
  load,
  icon,
  glass,
  full,
  link,
}: Pick<
  ChromeProps,
  | "address"
  | "editing"
  | "selected"
  | "load"
  | "icon"
  | "glass"
  | "full"
  | "link"
>) {
  return (
    <div
      data-slot="browser-address"
      data-editing={editing || undefined}
      className={cn(
        "group/address relative flex min-w-0 items-center overflow-hidden whitespace-nowrap text-[13px]",
        editing
          ? "justify-start px-3"
          : "justify-center gap-1.5 px-3 @lg/browser:px-9",
        glass
          ? cn(CAPSULE, "text-foreground")
          : "h-[30px] rounded-[9px] bg-black/[0.055] text-black/85 scheme-dark:bg-white/[0.09] scheme-dark:text-white/85",
        !glass && editing && "bg-white scheme-dark:bg-[#1c1c1e]",
        editing && "shadow-[0_0_0_3px_rgb(10_132_255/0.45)]",
      )}
    >
      {editing ? (
        <>
          <span
            className={cn("truncate", selected && "rounded-[3px]")}
            style={
              selected ? { background: "rgb(10 132 255 / 0.32)" } : undefined
            }
          >
            {address}
          </span>
          {!selected && (
            <span
              data-slot="browser-caret"
              className="h-[15px] w-[1.5px] shrink-0"
              style={{ background: BLUE }}
            />
          )}
        </>
      ) : (
        <>
          {icon && (
            <Image
              src={icon}
              alt=""
              className="size-3.5 shrink-0 rounded-[3px]"
            />
          )}
          <span className="truncate">{shownAt(address, full)}</span>
          <span
            className={cn(
              "absolute right-2.5 opacity-60 [&_svg]:size-[13px]",
              WIDE,
              // Live, the copy stands where the reload glyph is, under the hand.
              link !== undefined &&
                "group-focus-within/address:opacity-0 group-hover/address:opacity-0",
            )}
          >
            {load ? <X strokeWidth={2} /> : <RotateCw strokeWidth={2} />}
          </span>
          {link !== undefined && (
            <>
              {/* The field is the link: a press opens the page's address. */}
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto absolute inset-0 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a84ff]"
              >
                <span className="sr-only">open {shownAt(address, true)}</span>
              </a>
              <CopyValue
                value={link}
                aria-label="copy this address"
                className="pointer-events-auto absolute right-1 size-6 opacity-0 group-focus-within/address:opacity-100 group-hover/address:opacity-100 [&_svg]:size-[13px]"
              />
            </>
          )}
        </>
      )}
      {load && (
        <span
          data-slot="browser-load"
          // Safari 26's: a hairline along the field's foot, inset from its round
          // ends, a paler blue than its accent.
          className="absolute inset-x-4 bottom-0.5 h-[1.5px] overflow-hidden rounded-full"
          style={{ opacity: load.opacity }}
        >
          <span
            className="block h-full rounded-full"
            style={{ width: `${load.progress * 100}%`, background: LOAD_BLUE }}
          />
        </span>
      )}
    </div>
  )
}

/** Safari's tab bar: every tab an equal share of the width, the front one lit. */
function SafariTabs({
  tabs,
  tab,
  glass,
}: {
  tabs: BrowserTab[]
  tab: number
  glass: boolean
}) {
  return (
    <div
      data-slot="browser-tabs"
      className={cn(
        "flex items-stretch text-[12px]",
        glass
          ? "items-center gap-1 px-4 pb-1"
          : "border-black/10 border-b bg-[#e8e8ea] text-black/55 scheme-dark:border-black/60 scheme-dark:bg-[#232325] scheme-dark:text-white/55",
      )}
      style={{ height: SAFARI_TABS }}
    >
      {tabs.map((t, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: tabs are positional, as in a tab bar
          key={i}
          data-slot="browser-tab"
          data-active={i === tab || undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center gap-1.5 px-3",
            glass
              ? i === tab
                ? cn(CAPSULE, "h-7 [--glass-radius:14px]")
                : "h-7 text-foreground/60"
              : i === tab
                ? "bg-[#f6f6f6] text-black/85 scheme-dark:bg-[#2b2b2d] scheme-dark:text-white/85"
                : cn(i > 0 && i !== tab + 1 && "border-black/10 border-l"),
          )}
        >
          {t.icon && (
            <Image
              src={t.icon}
              alt=""
              className="size-3.5 shrink-0 rounded-[3px]"
            />
          )}
          <span className="truncate">{t.title}</span>
        </span>
      ))}
    </div>
  )
}

// ── safari on an iPhone ──

/** The iPhone 16 Pro's screen width in points: every length of the phone's chrome
 *  is a share of it (cqw of the browser, which fills the screen), as contacts-app
 *  draws, so it is the same screen at any frame size. */
const SCREEN_PT = 402
const pt = (n: number) => `${((n * 100) / SCREEN_PT).toFixed(3)}cqw`

/** iOS 26 Safari's metrics, in points: the status bar's band; the controls (a
 *  glass circle each side of the address capsule, all one height), how far they
 *  stand off the foot and the sides; their glyphs; the plain bar's height. */
const IOS = {
  status: 54,
  bar: 48,
  barBottom: 26,
  barX: 16,
  gap: 10,
  glyph: 21,
  type: 17,
  plain: 92,
}

/** A glass control on the phone: one piece of glass, round at its height. */
const IOS_GLASS = cn(
  glassVariants({ shape: "surface" }),
  "flex items-center justify-center [--glass-radius:calc(var(--ag-ios-bar)/2)]",
)

/** iOS 26 Safari's controls at the foot: back in a glass circle, the address in a
 *  glass capsule (the page menu's glyph, the host or the whole address, reload),
 *  the tabs in a glass circle. Plain is the bar iOS drew before: opaque, the
 *  address field above the five buttons. */
function SafariIosToolbar({
  address,
  editing,
  selected,
  load,
  back,
  glass,
  full,
  link,
}: ChromeProps) {
  const glyph = "size-(--ag-ios-glyph) shrink-0"
  const field = (
    <div
      data-slot="browser-address"
      data-editing={editing || undefined}
      className={cn(
        "relative flex h-full min-w-0 flex-1 items-center gap-(--ag-ios-gap) px-(--ag-ios-gap) text-(length:--ag-ios-type)",
        glass
          ? IOS_GLASS
          : "rounded-[calc(var(--ag-ios-bar)/2)] bg-black/[0.06] scheme-dark:bg-white/[0.1]",
        editing && "shadow-[0_0_0_2px_rgb(10_132_255/0.6)]",
      )}
    >
      <TextAlignJustify className={glyph} strokeWidth={2} />
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          editing ? "text-left" : "text-center",
        )}
      >
        <span
          className={cn(selected && "rounded-[3px]")}
          style={
            selected ? { background: "rgb(10 132 255 / 0.32)" } : undefined
          }
        >
          {editing ? address : shownAt(address, full)}
        </span>
        {editing && !selected && (
          <span
            data-slot="browser-caret"
            className="ml-px inline-block h-[1.1em] w-[1.5px] align-middle"
            style={{ background: BLUE }}
          />
        )}
      </span>
      {load ? (
        <X className={glyph} strokeWidth={2} />
      ) : (
        <RotateCw className={glyph} strokeWidth={2} />
      )}
      {link !== undefined && (
        // The field is the link: a press opens the page's address.
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto absolute inset-0 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a84ff]"
        >
          <span className="sr-only">open {shownAt(address, true)}</span>
        </a>
      )}
      {load && (
        <span
          data-slot="browser-load"
          className="absolute inset-x-[calc(var(--ag-ios-bar)/2)] bottom-[3px] h-[1.5px] overflow-hidden rounded-full"
          style={{ opacity: load.opacity }}
        >
          <span
            className="block h-full rounded-full"
            style={{ width: `${load.progress * 100}%`, background: LOAD_BLUE }}
          />
        </span>
      )}
    </div>
  )
  const vars = {
    "--ag-ios-bar": pt(IOS.bar),
    "--ag-ios-gap": pt(IOS.gap),
    "--ag-ios-glyph": pt(IOS.glyph),
    "--ag-ios-type": pt(IOS.type),
  } as React.CSSProperties
  return (
    <div
      data-slot="browser-chrome"
      className={cn(
        "select-none",
        glass
          ? "text-foreground"
          : "border-black/10 border-t bg-[#f6f6f6] text-black/80 scheme-dark:border-white/10 scheme-dark:bg-[#1c1c1e] scheme-dark:text-white/85",
      )}
      style={{
        ...vars,
        paddingInline: pt(IOS.barX),
        paddingBottom: pt(IOS.barBottom),
        paddingTop: glass ? 0 : pt(IOS.gap),
      }}
    >
      <div
        data-slot="browser-toolbar"
        className="flex h-(--ag-ios-bar) items-center gap-(--ag-ios-gap)"
      >
        <span
          className={cn(
            "h-full shrink-0 aspect-square",
            glass ? IOS_GLASS : "flex items-center justify-center",
            !back && "[&>svg]:opacity-35",
          )}
        >
          <ChevronLeft className={glyph} strokeWidth={2.2} />
        </span>
        {field}
        <span
          className={cn(
            "h-full shrink-0 aspect-square",
            glass ? IOS_GLASS : "flex items-center justify-center",
          )}
        >
          <Copy className={glyph} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
}

/** One chrome per look. TODO (browser.notes.md): Chrome, Arc. */
const CHROMES: Record<BrowserLook, Chrome> = {
  safari: {
    place: "top",
    window: cn(
      "aspect-[16/10] w-full rounded-[16px]",
      // Dark, the hairline alone: a wide soft shadow on a near-black ground
      // falls through too few greys and bands; the window's depth there is the
      // light round it, the page's to give.
      "shadow-[0_0_0_0.5px_rgb(0_0_0/0.22),0_24px_60px_-16px_rgb(0_0_0/0.45)] scheme-dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.16)]",
    ),
    insets: ({ glass, tabbed }) => ({
      top: `${glass ? SAFARI_TOOLBAR + (tabbed ? SAFARI_TABS : 0) : 0}px`,
      bottom: "0px",
    }),
    Toolbar: SafariToolbar,
  },
  "safari-ios": {
    place: "bottom",
    // The phone's screen, whole: its corners and its edge are the frame's. Its
    // own width is the unit every length is a share of.
    window: "@container absolute inset-0",
    insets: ({ glass }) => ({
      top: pt(IOS.status),
      bottom: glass ? pt(IOS.bar + IOS.barBottom + IOS.gap) : "0px",
    }),
    Toolbar: SafariIosToolbar,
  },
}

// ── a scripted visit ──

export interface BrowserSessionProps
  extends Omit<
    BrowserProps,
    | "url"
    | "address"
    | "editing"
    | "selected"
    | "load"
    | "back"
    | "forward"
    | "scroll"
    | "link"
    | "children"
  > {
  /** The page the visit opens on. */
  start: string
  steps: BrowserStep[]
  /** Every page the visit reaches, by its URL (any spelling `urlOf` reads the same).
   *  A page its server changes between loads (a file saved, then a `reload`) is a
   *  function of the serving: 0 the first load of its address, 1 the next. */
  pages: Record<
    string,
    React.ReactNode | ((serving: number) => React.ReactNode)
  >
  /** The moment drawn, 0..1 of the visit, for a still. Inside a driver (a Player)
   *  omit it: the driver provides the moment. */
  progress?: number
  /** Accessible description (a recording is one picture). */
  alt: string
  /** The address of the page on screen is live (`Browser`'s `link`): the field
   *  opens it, copies it, the share glyph shares it. The rest stays a recording. */
  linked?: boolean
}

/** A visit played on the playhead: the frame at the moment (lib/browser-session)
 *  drawn by `Browser`, the page at its address from `pages`. Display-only, like
 *  every recording here: one picture to assistive tech, its pages inert. Its clip,
 *  for the driver: `browserTimeline(start, steps).clip`. */
export function BrowserSession({
  start,
  steps,
  pages,
  progress,
  alt,
  linked = false,
  ...frame
}: BrowserSessionProps) {
  const timeline = React.useMemo(
    () => browserTimeline(start, steps),
    [start, steps],
  )
  const drawn = React.useMemo(() => {
    const byUrl = new Map(
      Object.entries(pages).map(([u, page]) => [urlOf(u), page]),
    )
    for (const u of timeline.pages)
      if (!byUrl.has(u))
        throw new Error(`browser: the visit reaches ${u}, which pages lacks`)
    return byUrl
  }, [pages, timeline])
  const f = browserFrameAt(timeline, usePlayhead(progress).at * timeline.total)
  const page = drawn.get(f.url)
  const shown = typeof page === "function" ? page(f.serving) : page
  // The page drawn, as it was written, as a real address: what `linked` opens.
  const written = timeline.spelled[f.url] ?? f.url
  const link = linked
    ? /^[a-z][a-z0-9+.-]*:\/\//i.test(written)
      ? written
      : `https://${written}`
    : undefined
  return (
    <Browser
      {...frame}
      // A recording is one picture, said once; linked, a group whose one live
      // part is the address (`link`), the page still a picture inside it.
      role={linked ? "group" : "img"}
      aria-label={alt}
      inert={!linked}
      link={link}
      url={f.url}
      address={f.address}
      editing={f.editing}
      selected={f.selected}
      load={f.load}
      back={f.back}
      forward={f.forward}
      scroll={f.scroll}
    >
      {linked ? (
        <div inert aria-hidden className="contents">
          {shown}
        </div>
      ) : (
        shown
      )}
    </Browser>
  )
}

// ── a live page ──

/** A site in the page, live: framed where it allows it, else its unfurl drawn in
 *  the frame's place with why (a browser cannot tell a refused frame from a loaded
 *  one, so the answer is read beforehand: `mise live-page <url>`, lib/browser-framing).
 *  Put it in a `Browser` whose `url` is the page's. */
export function BrowserLive({ page }: { page: LivePage }) {
  if (page.frames)
    return (
      <iframe
        data-slot="browser-live"
        src={page.url}
        title={hostOf(page.url)}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        className="block size-full border-0 bg-white"
      />
    )
  return (
    <div
      data-slot="browser-live"
      data-refused=""
      className="flex min-h-full flex-col items-center justify-center gap-4 bg-foreground/[0.03] p-8"
    >
      <WebPreview facts={page.facts} className="w-full max-w-sm" />
      <p className="max-w-sm text-balance text-center font-mono text-[11px] text-foreground/50 lowercase">
        {hostOf(page.url)} keeps itself out of frames ({page.reason}): its
        preview stands in
      </p>
    </div>
  )
}

// ── a captured page ──

/** A site as it looks, captured (`mise browser-shot`, lib/browser-capture): the
 *  picture for the scheme it stands in, as wide as the page, read straight from
 *  the manifest. Put it in a `Browser` (or a session's `pages`). `children` lie
 *  over the picture in the page's own coordinates (lib/browser-capture
 *  `atFound`): a press drawn on a button that is in the picture. */
export function BrowserCapturePage({
  capture,
  sizes = "1024px",
  className,
  children,
}: {
  capture: BrowserCapture
  /** How wide it is drawn, for the loader (`Image`'s `sizes`). */
  sizes?: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="browser-capture"
      className={cn("relative [container-type:inline-size]", className)}
    >
      {(["light", "dark"] as const).map((scheme) => {
        const shot = capture[scheme]
        return (
          <Image
            key={scheme}
            src={shot.src}
            alt=""
            width={shot.width}
            height={shot.height}
            blurDataURL={shot.blurDataURL}
            sizes={sizes}
            className={cn(
              "block h-auto w-full",
              scheme === "light"
                ? "scheme-dark:hidden"
                : "hidden scheme-dark:block",
            )}
          />
        )
      })}
      {children}
    </div>
  )
}
