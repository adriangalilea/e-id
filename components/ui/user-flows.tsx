"use client"

// USER FLOWS, DRAWN: where people go on a site, four ways over the same visits
// (lib/user-flows-core works them out; these only draw what it gives them).
//
//   TopPaths        the common paths, each a row: its places as chips with arrows
//                   between, a "+3" for the places after the fourth, a bar of its
//                   visits, the visits, their share of all, and pages per visit.
//   PathTree        the same paths folded by where they landed: each place with its
//                   visits, and under it where they went next, down to where they left.
//   BeforeAndAfter  one place in the middle: where its visits came from on the left,
//                   where they went next on the right; a press on either side puts that
//                   place in the middle.
//   Funnel          steps in order, the visits reaching each and their share of the
//                   first, and under each step the ones that dropped and where they went.
//
// A PLACE IS ITS COLOUR, the same in every view: `colorOf` says it (the consumer knows
// a place's colour: a project's accent), a chip tinted by it with its name at full
// contrast, so a path reads as a run of stops and lore is the same amber everywhere.
// With no colour a place is the text's own tint. `faviconOf` puts a site's icon before
// its name, a referrer's above all (google.com, a forum), so where people came from is
// known at a look. An exit and an arrival with no referrer are no places: outlined,
// quieter. Bars stand in a column of their own, solid
// in the place's colour on a faint track, never a slab under the words. Numbers are
// mono with tabular figures, so a column lines its digits up.

import { ArrowLeft, ArrowRight, LogOut, MousePointerClick } from "lucide-react"
import * as React from "react"
import { Image } from "@/components/ui/image"
import { Tree } from "@/components/ui/tree"
import {
  type BeforeAndAfter as Around,
  DIRECT,
  EXIT,
  type FunnelStep,
  followed,
  type PathNode,
  type PathRow,
  stepOf,
} from "@/lib/user-flows-core"
import { cn } from "@/lib/utils"

/** A place's colour, any CSS colour; undefined for none. */
export type PlaceColor = (place: string) => string | undefined
/** A place's or a referrer's favicon, an image's URL; undefined for none. The consumer
 *  serves it (stored once beside its visits): a view never asks a third party for a
 *  site's icon, which would tell it who is reading. */
export type PlaceFavicon = (place: string) => string | undefined

const plain = new Intl.NumberFormat("en-US")
const perVisit = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })
const percent = (part: number, whole: number) =>
  whole === 0 ? "" : `${Math.round((part / whole) * 100)}%`

/** The consumer's colours, an event step taking its place's where it has none of its
 *  own (`lore:download` is lore's), so colouring the places colours their events. */
const stepColors =
  (given?: PlaceColor): PlaceColor =>
  (name) =>
    given?.(name) ?? given?.(stepOf(name).place)

/** A step as a chip. A place in its colour; a named event (`lore:download`) a solid
 *  outline in its place's colour, a mark, its place quiet and its name strong, so it
 *  never reads as one more page; what is no place of the site (a referrer, a direct
 *  arrival, the exit) dashed and quieter. The lib says which is outside (`Counted`'s
 *  `outside`); a bare name is outside when it is the exit or a direct arrival. */
function Place({
  name,
  colorOf,
  faviconOf,
  outside = name === EXIT || name === DIRECT,
  size = "sm",
}: {
  name: string
  colorOf?: PlaceColor
  faviconOf?: PlaceFavicon
  outside?: boolean
  size?: "sm" | "lg"
}) {
  const color = stepColors(colorOf)(name)
  const favicon = faviconOf?.(name)
  const step = stepOf(name)
  if (step.event !== undefined && !outside)
    return (
      <span
        data-slot="user-flows-place"
        data-event=""
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-(--ag-flow-edge) text-current",
          size === "lg"
            ? "px-2.5 py-1 font-medium text-[15px]"
            : "px-1.5 py-0.5",
        )}
        style={
          {
            "--ag-flow-edge": `color-mix(in oklab, ${color ?? "currentColor"} ${color ? 70 : 35}%, transparent)`,
          } as React.CSSProperties
        }
      >
        <MousePointerClick
          aria-hidden
          className="size-3 shrink-0 text-(--ag-flow-edge)"
        />
        <span className="text-current/55">{step.place}</span>
        {step.event}
      </span>
    )
  return (
    <span
      data-slot="user-flows-place"
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md",
        size === "lg" ? "px-2.5 py-1 font-medium text-[15px]" : "px-1.5 py-0.5",
        outside
          ? "border border-current/25 border-dashed text-current/60"
          : "bg-(--ag-flow-tint) text-current",
        name === EXIT && "gap-1",
      )}
      style={
        outside
          ? undefined
          : ({
              "--ag-flow-tint": `color-mix(in oklab, ${color ?? "currentColor"} ${color ? 26 : 10}%, transparent)`,
            } as React.CSSProperties)
      }
    >
      {/* Leaving, said by its own mark: no place, no colour. */}
      {name === EXIT && <LogOut aria-hidden className="size-3" />}
      {favicon && (
        <Image
          src={favicon}
          alt=""
          width={14}
          height={14}
          className="size-3.5 shrink-0 rounded-[3px]"
        />
      )}
      {name}
    </span>
  )
}

/** A bar in its own column: `share` of its track, filled in `color` (the text's,
 *  strong, with none), growing from `from`. */
function Meter({
  share,
  color,
  from = "left",
  className,
}: {
  share: number
  color?: string
  from?: "left" | "right"
  className?: string
}) {
  return (
    <span
      aria-hidden
      data-slot="user-flows-meter"
      className={cn(
        "relative block h-2 overflow-hidden rounded-full bg-current/8",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 w-(--ag-flow-share) rounded-full bg-(--ag-flow-fill)",
          from === "left" ? "left-0" : "right-0",
        )}
        style={
          {
            "--ag-flow-share": `${Math.max(0, Math.min(1, share)) * 100}%`,
            "--ag-flow-fill": color
              ? `color-mix(in oklab, ${color} 85%, transparent)`
              : "color-mix(in oklab, currentColor 55%, transparent)",
          } as React.CSSProperties
        }
      />
    </span>
  )
}

const NUMBER = "text-right font-mono text-current/85 text-xs tabular-nums"
const QUIET = "text-right font-mono text-current/50 text-xs tabular-nums"
const HEAD = "font-mono text-[11px] text-current/50"

/** The common paths, most visits first. `total` is every visit (for the share);
 *  default the rows' own sum. */
export function TopPaths({
  rows,
  total,
  colorOf,
  faviconOf,
  className,
}: {
  rows: readonly PathRow[]
  total?: number
  colorOf?: PlaceColor
  faviconOf?: PlaceFavicon
  className?: string
}) {
  const most = Math.max(1, ...rows.map((r) => r.visits))
  const all = total ?? rows.reduce((n, r) => n + r.visits, 0)
  return (
    <div
      data-slot="user-flows-paths"
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_minmax(4rem,9rem)_auto_auto_auto] items-center gap-x-4 text-[13px]",
        className,
      )}
    >
      <span className={HEAD}>path</span>
      <span />
      <span className={cn(HEAD, "text-right")}>visits</span>
      <span className={cn(HEAD, "text-right")}>share</span>
      <span className={cn(HEAD, "text-right")}>pages/visit</span>
      {rows.map((r) => (
        <div
          key={r.steps.join("\u0000")}
          data-slot="user-flows-path"
          className="col-span-5 grid min-h-10 grid-cols-subgrid items-center border-current/8 border-t"
        >
          <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 py-1.5">
            {r.steps.map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                {i > 0 && (
                  <ArrowRight
                    aria-label="then"
                    className="size-3.5 shrink-0 text-current/45"
                  />
                )}
                <Place name={s} colorOf={colorOf} faviconOf={faviconOf} />
              </span>
            ))}
            {r.more > 0 && (
              <span
                title={`and ${r.more} more place${r.more === 1 ? "" : "s"} after`}
                className="ml-1 font-mono text-[11px] text-current/55"
              >
                +{r.more}
              </span>
            )}
          </span>
          <Meter
            share={r.visits / most}
            color={stepColors(colorOf)(r.steps[0] as string)}
          />
          <span className={NUMBER}>{plain.format(r.visits)}</span>
          <span className={QUIET}>{percent(r.visits, all)}</span>
          <span className={QUIET}>{perVisit.format(r.pages)}</span>
        </div>
      ))}
    </div>
  )
}

/** A place on the drawn tree: the path node, the visits of the place it came from
 *  (null at a landing), and its places next as children. */
type Branch = PathNode & { from: number | null; children: Branch[] }

const branches = (nodes: readonly PathNode[], from: number | null): Branch[] =>
  nodes.map((n) => ({ ...n, from, children: branches(n.next, n.visits) }))

/** The paths folded by where they landed, as ui's tree: each place with its visits,
 *  their share of the place it came from and how many left there, where the rest went
 *  next under it. The landings open, everything deeper folded until opened. */
export function PathTree({
  nodes,
  colorOf,
  faviconOf,
  className,
}: {
  nodes: readonly PathNode[]
  colorOf?: PlaceColor
  faviconOf?: PlaceFavicon
  className?: string
}) {
  const items = branches(nodes, null)
  const most = Math.max(1, ...nodes.map((n) => n.visits))
  return (
    <Tree<Branch>
      aria-label="where visits went after landing"
      data-slot="user-flows-tree"
      items={items}
      label={(b) => b.place}
      content={(b) => (
        <Place name={b.place} colorOf={colorOf} faviconOf={faviconOf} />
      )}
      meta={(b) => (
        <span className="grid grid-cols-[5.5rem_6rem_2.5rem_2.5rem] items-center gap-x-3">
          <span className="text-right font-mono text-[11px] text-current/50 tabular-nums">
            {b.exited > 0 ? `${plain.format(b.exited)} left here` : ""}
          </span>
          <Meter share={b.visits / most} color={stepColors(colorOf)(b.place)} />
          <span className={NUMBER}>{plain.format(b.visits)}</span>
          <span className={QUIET}>
            {b.from === null ? "" : percent(b.visits, b.from)}
          </span>
        </span>
      )}
      defaultExpanded={items.map((b) => b.id)}
      selection="none"
      density="comfortable"
      guides
      className={className}
    />
  )
}

/** One place in the middle: where its visits came from, where they went next. A press
 *  on a place on either side asks to put it in the middle (`onPlace`); a referrer, a
 *  direct arrival and the exit are no places and take no press. `back` is the place
 *  shown before this one, a way back to it above the middle. */
export function BeforeAndAfter({
  data,
  onPlace,
  back,
  colorOf,
  faviconOf,
  className,
}: {
  data: Around
  onPlace?: (place: string) => void
  back?: { place: string; onBack: () => void }
  colorOf?: PlaceColor
  faviconOf?: PlaceFavicon
  className?: string
}) {
  const [lit, setLit] = React.useState<string | null>(null)
  // The ribbons' visits to px: all of a side's ribbons together are at most the middle
  // node's height, FLOW_BAND, and a visit is at most FLOW_VISIT thick, so a handful of
  // visits draws a handful of thin ribbons, never a wall; a ribbon of one visit is
  // still seen (FLOW_MIN).
  const scale =
    data.visits === 0 ? 0 : Math.min(FLOW_BAND / data.visits, FLOW_VISIT)
  const thick = (visits: number) => Math.max(FLOW_MIN, visits * scale)
  /** A row's height: its ribbon's, or a label's where the ribbon is thinner. */
  const slot = (t: number) => Math.max(t, FLOW_LABEL)
  const sideHeight = (list: Around["before"]) =>
    list.reduce((n, x) => n + slot(thick(x.visits)), 0) +
    Math.max(0, list.length - 1) * FLOW_GAP
  const ribbonsOf = (list: Around["before"]) =>
    list.reduce((n, x) => n + thick(x.visits), 0)
  // The node is as tall as the ribbons gathering into it, or its name and count where
  // they are fewer; the ribbons then meet its middle.
  const band = Math.max(
    ribbonsOf(data.before),
    ribbonsOf(data.after),
    FLOW_NODE,
  )
  const height = Math.max(sideHeight(data.before), sideHeight(data.after), band)
  /** One side's rows, stacked and centred: each row's top and height, its ribbon's
   *  top at the row (centred in it) and at the middle node (stacked, no gap). */
  const placed = (list: Around["before"]) => {
    let row = (height - sideHeight(list)) / 2
    let node = (height - ribbonsOf(list)) / 2
    return list.map((x) => {
      const t = thick(x.visits)
      const h = slot(t)
      const out = { x, t, top: row, h, end: row + (h - t) / 2, node }
      row += h + FLOW_GAP
      node += t
      return out
    })
  }
  const left = placed(data.before)
  const right = placed(data.after)
  const centre = stepColors(colorOf)(data.place)
  const key = (side: "before" | "after", place: string) => `${side}:${place}`
  // FOLLOWING: a row under the hand is followed through the middle. Its own side
  // dims the rest; on the other side each ribbon shows, as a band at its top, the
  // part of it that is the followed visits, and its number says how many of its own.
  const litSide = lit?.startsWith("before:") ? "before" : "after"
  const litPlace = lit === null ? null : lit.slice(lit.indexOf(":") + 1)
  const litRow =
    litPlace === null
      ? undefined
      : (litSide === "before" ? data.before : data.after).find(
          (x) => x.place === litPlace,
        )
  const follow =
    litPlace === null
      ? null
      : followed(
          data.through,
          litSide === "before" ? { from: litPlace } : { to: litPlace },
        )
  /** Of the visits on `side`'s row `place`, how many are the followed ones; null when
   *  nothing is followed or the row is on the followed side. */
  const sharedOf = (side: "before" | "after", place: string) =>
    follow === null || side === litSide ? null : (follow.get(place) ?? 0)
  // A place wears its colour; an arrival from outside the text's grey. Leaving is drawn
  // apart (EXIT_RIBBON): it arrives nowhere.
  const fillOf = (x: Around["before"][number]) =>
    (x.outside ? undefined : stepColors(colorOf)(x.place)) ?? "currentColor"
  // Ids for the exit's stripes and fade, one per instance.
  const id = React.useId().replace(/:/g, "")
  const [leftCol, leftWidth] = useWidth()
  const [rightCol, rightWidth] = useWidth()

  /** The ribbons on one side, drawn at their column's own width (`width`, measured), so
   *  nothing in them is stretched: from each row's bar to its slot on the node. */
  const ribbons = (
    list: ReturnType<typeof placed>,
    side: "before" | "after",
    width: number,
  ) => (
    <svg
      aria-hidden
      data-slot="user-flows-ribbons"
      viewBox={`0 0 ${Math.max(1, width)} ${height}`}
      className="block w-full"
      style={{ height }}
    >
      {/* THE EXIT: a faint ground of the text's ink, sparse crosses on it that follow
          the ribbon's curve, fading toward the side it leaves by, so leaving reads as
          leaving, never as one more place or as an error. */}
      <defs>
        <linearGradient id={`${id}-exit-fade`} x1={0} x2={1} y1={0} y2={0}>
          <stop offset={0} stopColor="white" stopOpacity={1} />
          <stop offset={1} stopColor="white" stopOpacity={0.15} />
        </linearGradient>
        <mask id={`${id}-exit-mask`}>
          <rect width={width} height={height} fill={`url(#${id}-exit-fade)`} />
        </mask>
      </defs>
      {width > 0 &&
        list.map(({ x, t, end, node }) => {
          // On the left a ribbon runs from its row's bar (x 0) into the node (x width); on
          // the right from the node (x 0) out to its row's bar (x width).
          const [y0, y1] = side === "before" ? [end, node] : [node, end]
          const w = width
          const d = ribbonPath(y0, y1, t, w)
          const on = lit === key(side, x.place)
          const hover = {
            onPointerEnter: () => setLit(key(side, x.place)),
            onPointerLeave: () => setLit(null),
          }
          const shared = sharedOf(side, x.place)
          // Every ribbon keeps its own look whatever is followed, only its strength
          // changes: the row under the hand full, the rest of its side receding; on
          // the other side every ribbon recedes less, under its band.
          const strength =
            lit === null || on ? 1 : shared === null ? 0.18 : FOLLOW_GROUND
          const leaving = x.place === EXIT
          return (
            <g key={x.place} {...hover}>
              <g
                // Leaving fades out toward where it goes; arriving is light all along.
                mask={leaving ? `url(#${id}-exit-mask)` : undefined}
                className="transition-opacity duration-150 motion-reduce:transition-none"
                style={{ opacity: strength }}
              >
                {x.outside ? (
                  // What is no place of the site is marked, never coloured: leaving with
                  // crosses fading out, arriving from outside with chevrons pointing in,
                  // on one grid. Arriving is light (a ground of the text's ink, bright
                  // chevrons), leaving dark (a shadow deeper than the page, dim crosses).
                  <>
                    <path
                      d={d}
                      fill={leaving ? "black" : "currentColor"}
                      opacity={leaving ? (on ? 0.5 : 0.38) : on ? 0.34 : 0.24}
                    />
                    <path
                      d={marksAlong(
                        y0,
                        y1,
                        t,
                        w,
                        leaving ? "cross" : "chevron",
                      )}
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={leaving ? (on ? 0.5 : 0.3) : on ? 1 : 0.85}
                    />
                  </>
                ) : (
                  <path d={d} fill={fillOf(x)} opacity={on ? 1 : 0.5} />
                )}
              </g>
              {/* The followed visits within it: the part of the ribbon that is them, at
                  its top, drawn as the ribbon itself at full strength (its colour, or
                  its marks), as thick as their share and never thinner than a ribbon
                  of one visit. The rest of it recedes around them. */}
              {shared !== null &&
                shared > 0 &&
                (() => {
                  const part = Math.max(FLOW_MIN, (t * shared) / x.visits)
                  const d = ribbonPath(y0, y1, part, w)
                  return x.outside ? (
                    <g mask={leaving ? `url(#${id}-exit-mask)` : undefined}>
                      <path
                        d={d}
                        fill={leaving ? "black" : "currentColor"}
                        opacity={leaving ? 0.55 : 0.4}
                      />
                      <path
                        d={marksAlong(
                          y0,
                          y1,
                          part,
                          w,
                          leaving ? "cross" : "chevron",
                        )}
                        stroke="currentColor"
                        strokeWidth={1}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        opacity={leaving ? 0.6 : 1}
                      />
                    </g>
                  ) : (
                    <path d={d} fill={fillOf(x)} />
                  )
                })()}
            </g>
          )
        })}
    </svg>
  )

  /** One side's rows, in the page's flow (the column is as wide as its widest label):
   *  each as tall as its slot, its label at its ribbon's middle and its bar, the node
   *  its ribbon leaves from, at the ribbons' edge. A place takes a press. */
  const labels = (
    list: ReturnType<typeof placed>,
    side: "before" | "after",
  ) => {
    // The longest count this side can show, in the numbers' own (monospaced) width.
    const most = String(Math.max(0, ...list.map(({ x }) => x.visits))).length
    const reserve = `${most * 2 + 4}ch`
    return (
      <ol
        className="m-0 flex list-none flex-col p-0"
        style={{ height, paddingTop: list[0]?.top ?? 0, gap: FLOW_GAP }}
      >
        {list.map(({ x, t, h }) => {
          const go = onPlace && !x.outside
          const k = key(side, x.place)
          const shared = sharedOf(side, x.place)
          const label = (
            <span
              className={cn(
                "flex items-center gap-2.5",
                side === "before" && "flex-row-reverse",
              )}
            >
              <Place
                name={x.place}
                colorOf={colorOf}
                faviconOf={faviconOf}
                outside={x.outside}
              />
              {/* As wide as "n of m" can be on this side, the room on the outer edge, so
                following a row never moves anything. */}
              <span
                className={cn(
                  NUMBER,
                  "whitespace-nowrap",
                  side === "after" && "text-left",
                )}
                style={{ minWidth: reserve }}
              >
                {shared === null ? (
                  plain.format(x.visits)
                ) : (
                  <>
                    {plain.format(shared)}
                    <span className="text-current/45">
                      {" "}
                      of {plain.format(x.visits)}
                    </span>
                  </>
                )}
              </span>
            </span>
          )
          return (
            <li
              key={x.place}
              onPointerEnter={() => setLit(k)}
              onPointerLeave={() => setLit(null)}
              className={cn(
                "flex shrink-0 items-center gap-2 transition-opacity duration-150 motion-reduce:transition-none",
                side === "before" && "flex-row-reverse",
                lit !== null &&
                  (shared === null ? lit !== k : shared === 0) &&
                  "opacity-40",
              )}
              style={{ height: h }}
            >
              {/* The row's node: its ribbon's end, flush with the ribbons. The exit has
                none: its ribbon fades out before it, arriving nowhere. */}
              <span
                aria-hidden
                className="w-1 shrink-0 bg-(--ag-flow-bar)"
                style={
                  {
                    height: t,
                    "--ag-flow-bar":
                      x.place === EXIT
                        ? "transparent"
                        : `color-mix(in oklab, ${fillOf(x)} ${x.outside ? 65 : 90}%, transparent)`,
                  } as React.CSSProperties
                }
              />
              {go ? (
                <button
                  type="button"
                  title={`put ${x.place} in the middle`}
                  onClick={() => onPlace(x.place)}
                  className="cursor-pointer rounded-md p-0.5 hover:bg-current/6"
                >
                  {label}
                </button>
              ) : (
                <span className="block p-0.5">{label}</span>
              )}
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <div
      data-slot="user-flows-around"
      className={cn(
        "grid grid-cols-[auto_minmax(4rem,1fr)_auto_minmax(4rem,1fr)_auto] gap-y-3 text-[13px]",
        className,
      )}
    >
      <span className={cn(HEAD, "text-right")}>came from</span>
      <span />
      {/* Above the node: the way back, or, while a row is followed, what is followed.
          Out of the flow, so a caption never widens the node and moves the rest. */}
      <span className="relative flex justify-center">
        {litRow !== undefined ? (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-current/80 text-xs tabular-nums">
            following {plain.format(litRow.visits)}{" "}
            {litSide === "before" ? "from" : "to"} {litRow.place}
          </span>
        ) : (
          back && (
            <button
              type="button"
              onClick={back.onBack}
              className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 text-current/60 text-xs hover:bg-current/6 hover:text-current"
            >
              <ArrowLeft aria-hidden className="size-3" />
              back to {back.place}
            </button>
          )
        )}
      </span>
      <span />
      <span className={HEAD}>went to</span>
      {labels(left, "before")}
      <div ref={leftCol} className="min-w-0">
        {ribbons(left, "before", leftWidth)}
      </div>
      {/* The node the ribbons gather into: exactly as tall as their band and square,
          so they meet it flush, in its colour, its name inside. */}
      <span className="relative flex items-center" style={{ height }}>
        <span
          data-slot="user-flows-node"
          className="flex w-full flex-col items-center justify-center gap-1 bg-(--ag-flow-node) px-4"
          style={
            {
              height: band,
              "--ag-flow-node": `color-mix(in oklab, ${centre ?? "currentColor"} ${centre ? 45 : 14}%, transparent)`,
            } as React.CSSProperties
          }
        >
          <span className="font-medium text-[15px]">{data.place}</span>
          <span className="font-mono text-current/65 text-xs tabular-nums">
            {plain.format(data.visits)} {data.visits === 1 ? "visit" : "visits"}
          </span>
        </span>
      </span>
      <div ref={rightCol} className="min-w-0">
        {ribbons(right, "after", rightWidth)}
      </div>
      {labels(right, "after")}
    </div>
  )
}

/** An element's width as it is laid out, px, followed as it resizes (0 until laid
 *  out): what a drawing needs to be drawn at 1:1 instead of stretched. */
function useWidth(): [(el: HTMLElement | null) => void, number] {
  const [width, setWidth] = React.useState(0)
  const watch = React.useRef<ResizeObserver | null>(null)
  const ref = React.useCallback((el: HTMLElement | null) => {
    watch.current?.disconnect()
    watch.current = null
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width))
    })
    observer.observe(el)
    watch.current = observer
  }, [])
  return [ref, width]
}

/** A ribbon `t` thick whose top edge runs from y0 at x 0 to y1 at x w, both handles of
 *  each edge at the middle (edgeOf reads the same curve). */
const ribbonPath = (y0: number, y1: number, t: number, w: number) => {
  const m = w / 2
  return `M0,${y0} C${m},${y0} ${m},${y1} ${w},${y1} L${w},${y1 + t} C${m},${y1 + t} ${m},${y0 + t} 0,${y0 + t} Z`
}

/** The exit's crosses: one every EXIT_STEP px along and across its ribbon, each
 *  EXIT_ARM px from its centre to a tip. */
const EXIT_STEP = 12
const EXIT_ARM = 2

/** A ribbon's top edge (from y0 at x 0 to y1 at x w): its height and slope at an x.
 *  The edge is the cubic with both handles at the middle, so at parameter u its top is
 *  the smoothstep between y0 and y1; the u of an x is found by halving. */
function edgeOf(y0: number, y1: number, w: number) {
  const m = w / 2
  const xAt = (u: number) =>
    3 * (1 - u) ** 2 * u * m + 3 * (1 - u) * u ** 2 * m + u ** 3 * w
  return (x: number) => {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (xAt(mid) < x) lo = mid
      else hi = mid
    }
    const u = (lo + hi) / 2
    return {
      top: y0 + (y1 - y0) * (3 * u * u - 2 * u * u * u),
      angle: Math.atan2(
        (y1 - y0) * 6 * u * (1 - u),
        3 * m * (1 - u) ** 2 + 3 * (w - m) * u * u,
      ),
    }
  }
}

/** Sparse marks filling a ribbon (`t` thick, its top edge from y0 to y1 across w), in
 *  columns along it: each column at the ribbon's height there and each mark turned
 *  with its slope, so the marks bend through the curve as the ribbon does. One grid,
 *  two marks: a cross for leaving, a chevron pointing along the flow for arriving. */
function marksAlong(
  y0: number,
  y1: number,
  t: number,
  w: number,
  mark: "cross" | "chevron",
): string {
  const edge = edgeOf(y0, y1, w)
  const rows = Math.max(1, Math.floor(t / EXIT_STEP))
  const first = (t - (rows - 1) * EXIT_STEP) / 2
  const at = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`
  const out: string[] = []
  for (let x = EXIT_STEP / 2; x < w; x += EXIT_STEP) {
    const { top, angle } = edge(x)
    for (let k = 0; k < rows; k++) {
      const cy = top + first + k * EXIT_STEP
      const arm = (turn: number, length: number) => ({
        dx: length * Math.cos(angle + turn),
        dy: length * Math.sin(angle + turn),
      })
      if (mark === "cross")
        for (const turn of [Math.PI / 4, -Math.PI / 4]) {
          const { dx, dy } = arm(turn, EXIT_ARM)
          out.push(`M${at(x - dx, cy - dy)}L${at(x + dx, cy + dy)}`)
        }
      else {
        // The tip ahead of the centre along the flow, both arms trailing back.
        const tip = arm(0, EXIT_ARM * 0.7)
        const tx = x + tip.dx
        const ty = cy + tip.dy
        const a = arm(Math.PI * 0.75, EXIT_ARM * 1.4)
        const b = arm(-Math.PI * 0.75, EXIT_ARM * 1.4)
        out.push(
          `M${at(tx + a.dx, ty + a.dy)}L${at(tx, ty)}L${at(tx + b.dx, ty + b.dy)}`,
        )
      }
    }
  }
  return out.join("")
}

/** The middle node's height at most, px: all of a side's ribbons together. */
const FLOW_BAND = 220
/** The thickest a single visit is drawn, px: until FLOW_BAND / FLOW_VISIT visits
 *  (about nine) the band is only as tall as its visits. */
const FLOW_VISIT = 24
/** The node's least height, px: its name and its count, one line each. */
const FLOW_NODE = 56
/** A row's least height, px: a label's, where its ribbon is thinner. */
const FLOW_LABEL = 30
/** Between two rows on a side, px. */
const FLOW_GAP = 6
/** The thinnest ribbon, px: one visit is still seen. */
const FLOW_MIN = 2
/** How strongly the other side's ribbons stay drawn while a row is followed: enough to
 *  keep each one's colour and marks, under the followed band at full strength. */
const FOLLOW_GROUND = 0.4

/** Steps in order: the visits reaching each and their share of the first, and under
 *  each step past the first the ones that dropped and where they went instead (the
 *  top three, the rest counted). */
export function Funnel({
  steps,
  colorOf,
  faviconOf,
  className,
}: {
  steps: readonly FunnelStep[]
  colorOf?: PlaceColor
  faviconOf?: PlaceFavicon
  className?: string
}) {
  const first = steps[0]?.visits ?? 0
  return (
    <ol
      data-slot="user-flows-funnel"
      className={cn(
        "m-0 grid list-none grid-cols-[auto_minmax(4rem,1fr)_auto_auto] items-center gap-x-4 gap-y-1 p-0 text-[13px]",
        className,
      )}
    >
      {steps.map((s, i) => {
        const before = steps[i - 1]?.visits ?? s.visits
        const dropped = before - s.visits
        const shown = s.droppedTo.slice(0, 3)
        const others = s.droppedTo.slice(3).reduce((n, d) => n + d.visits, 0)
        return (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a funnel may name a step twice; its place in the order is part of it
            key={`${i}:${s.step}`}
            className="col-span-4 grid grid-cols-subgrid items-center"
          >
            {i > 0 && dropped > 0 && (
              <p className="col-span-4 m-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 py-1 pl-1 text-[12px] text-current/60">
                <span>{plain.format(dropped)} dropped:</span>
                {shown.map((d) => (
                  <span key={d.place} className="flex items-center gap-1">
                    <Place
                      name={d.place}
                      colorOf={colorOf}
                      faviconOf={faviconOf}
                      outside={d.outside}
                    />
                    <span className="font-mono tabular-nums">
                      {plain.format(d.visits)}
                    </span>
                  </span>
                ))}
                {others > 0 && <span>· elsewhere {plain.format(others)}</span>}
              </p>
            )}
            <span className="flex min-h-9 items-center">
              <Place name={s.step} colorOf={colorOf} faviconOf={faviconOf} />
            </span>
            <Meter
              share={first === 0 ? 0 : s.visits / first}
              color={stepColors(colorOf)(s.step)}
            />
            <span className={NUMBER}>{plain.format(s.visits)}</span>
            <span className={QUIET}>{percent(s.visits, first)}</span>
          </li>
        )
      })}
    </ol>
  )
}
