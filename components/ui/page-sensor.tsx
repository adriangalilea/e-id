"use client"

// PAGE SENSOR: a site's pages in the event stream (the utils contract, "Web pages"),
// written through ts-utils' logger and shipped to the site's own route, where visits
// (lib/visits, this item's server half) composes visits from them (the server alone
// sees the caller), and user-flows draws them.
//
//   <PageSensor service="garden-web" collector="/api/events"
//               build={sha} place={placeOf} />          once, in the root layout
//   currentPage().info("main action", { label })        a named event, from anywhere
//   usePageReport()                                     what this tab has written
//
// THE MOMENTS. A page span ("page", the root of its own trace) starts when the page is
// first shown (a prerendered page when activated, a background tab when it comes
// forward) and ends when it is hidden; shown again, a new span, nav "resumed". A route
// change ends it and starts one, nav "soft", `from` the path before: read off the
// browser's Navigation API (`currententrychange`), so any router works and nothing
// is wired per framework. Restored from the back/forward cache: nav "bfcache". The
// end carries `reached` (the `data-section` names that came into the upper four
// fifths of the viewport, in the order first seen) and, on a load's first page, its
// vitals. A post shown whole on the page (`data-view="/its/path"`, a note in a feed)
// is a "view" line once it is half on screen, once per page: read where it was shown,
// as a tweet in a timeline. A same-origin request is a "fetch" span under the page, its traceparent on
// the request, so the server's spans join the page's trace (ts-utils log/next); a
// router's prefetch (`next-router-prefetch`) is not traced, being the router guessing.
// Uncaught errors and unhandled rejections are error lines of the page.
//
// WHAT IS NEVER WRITTEN: a query string, a URL (a referrer is its host), an IP, a user
// agent, a cookie. Nothing is stored in the browser. A browser that asks not to be
// tracked (Global Privacy Control, Do Not Track) gets nothing at all: no span, no
// request, and the report says so.

import {
  type Fields,
  type Logger,
  log,
  type Span,
  setLogConsole,
  setLogService,
  setLogShip,
} from "@adriangalilea/utils/log"
import * as React from "react"
import { onCLS, onINP, onLCP, onTTFB } from "web-vitals"

export type PageNav =
  | "navigate"
  | "reload"
  | "back_forward"
  | "prerender"
  | "soft"
  | "resumed"
  | "bfcache"

export interface PageSensorProps {
  /** The program in every event: `garden-web`. */
  service: string
  /** Where batches go, a URL or a path on this site (`/api/events`, a route of
   *  lib/visits' `visitsRoute`); without one the stream stays in the console. */
  collector?: string
  /** The deploy that served the page, a git sha. */
  build?: string
  /** The site's owner is reading: the collector keeps the visit out of every product number. */
  staff?: boolean
  /** What a visitor would call where a path is (a project, the studio). */
  place?: (path: string) => string | undefined
  /** A path's route pattern (`requests/:n`). */
  route?: (path: string) => string | undefined
  /** Whether the stream is written to the browser's console as well as shipped:
   *  default in development only, so a visitor's console shows nothing. */
  console?: boolean
}

/** One page this tab has written: its start's fields, then what its end added. */
export interface PageReport {
  readonly fields: Readonly<Record<string, unknown>>
  readonly reached: readonly string[]
  /** Still on screen. */
  readonly open: boolean
}

export type PagesReport =
  | { readonly state: "off" }
  | { readonly state: "declined" }
  | { readonly state: "watching"; readonly pages: readonly PageReport[] }

/** The browser asked not to be tracked: Global Privacy Control, or Do Not Track. */
export function declined(): boolean {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean }
  return n.globalPrivacyControl === true || n.doNotTrack === "1"
}

const viewport = (width: number) =>
  width < 640 ? "phone" : width < 1024 ? "tablet" : "desktop"

// --- the load's vitals ----------------------------------------------------------

/** The load's vitals so far, as each is measured; its first page's end carries them. */
const vitals: {
  ttfb_ms?: number
  lcp_ms?: number
  inp_ms?: number
  cls?: number
} = {}
let measuring = false

function measure(): void {
  if (measuring) return
  measuring = true
  const every = { reportAllChanges: true }
  onTTFB((m) => {
    vitals.ttfb_ms = Math.round(m.value)
  }, every)
  onLCP((m) => {
    vitals.lcp_ms = Math.round(m.value)
  }, every)
  onINP((m) => {
    vitals.inp_ms = Math.round(m.value)
  }, every)
  onCLS((m) => {
    vitals.cls = Math.round(m.value * 10_000) / 10_000
  }, every)
}

// --- the tab's pages ------------------------------------------------------------

interface Shown {
  readonly span: Span
  readonly path: string
  readonly fields: Fields
  readonly reached: string[]
  /** The `data-view` paths this page has shown, each written once. */
  readonly viewed: Set<string>
  /** The load's first page: its end carries the vitals. */
  readonly first: boolean
}

let shown: Shown | null = null
/** The page span that ended last: what a line written while the page is hidden belongs to. */
let last: Span | null = null
let stopWatching: (() => void) | null = null

/** The page span now, else the one that ended last, else the root logger. */
export function currentPage(): Logger {
  return shown?.span ?? last ?? log
}

// The report, for usePageReport: replaced whole on every change.
let report: PagesReport = { state: "off" }
const listeners = new Set<() => void>()
function publish(next: PagesReport): void {
  report = next
  for (const l of listeners) l()
}
/** The watched report's pages, changed by `change`. */
function reportPages(
  change: (pages: readonly PageReport[]) => readonly PageReport[],
): void {
  if (report.state !== "watching") return
  publish({ state: "watching", pages: change(report.pages) })
}
/** The page on screen reached another section. */
function publishPages(): void {
  const now = shown
  if (now === null) return
  reportPages((pages) =>
    pages.map((p, i) =>
      i === pages.length - 1 && p.open
        ? { ...p, reached: [...now.reached] }
        : p,
    ),
  )
}

/** What this tab has written so far: every page, its fields and what it reached. */
export function usePageReport(): PagesReport {
  return React.useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => report,
    () => report,
  )
}

/** Start writing this tab's pages. Once per document; the props are read live. */
function watch(props: React.RefObject<PageSensorProps>): void {
  if (stopWatching !== null)
    throw new Error("PageSensor: mounted twice in one document")
  if (declined()) {
    publish({ state: "declined" })
    stopWatching = () => {
      stopWatching = null
      publish({ state: "off" })
    }
    return
  }
  const options = props.current
  setLogService(options.service)
  setLogConsole(options.console ?? process.env.NODE_ENV !== "production")
  /** Where batches go: the one same-origin request that is never a fetch span, or
   *  shipping a batch would write the events of shipping it, without end. */
  const collector = options.collector
    ? new URL(options.collector, location.href).href
    : undefined
  if (collector) setLogShip(collector)
  measure()
  publish({ state: "watching", pages: [] })

  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined
  const loaded: PageNav =
    (["navigate", "reload", "back_forward", "prerender"] as const).find(
      (n) => n === navigation?.type,
    ) ??
    (() => {
      throw new Error(`PageSensor: a navigation of type ${navigation?.type}`)
    })()
  const referrer = document.referrer
    ? new URL(document.referrer).host
    : undefined
  let first = true
  /** Hidden into the back/forward cache: pageshow, not visibility, opens the next page. */
  let frozen = false

  // --- sections: what came on screen ---------------------------------------------
  const seen = new Set<Element>()
  const sections = new IntersectionObserver(
    (entries) => {
      let grew = false
      for (const e of entries) {
        const name = e.target.getAttribute("data-section")
        if (
          e.isIntersecting &&
          name &&
          shown &&
          !shown.reached.includes(name)
        ) {
          shown.reached.push(name)
          grew = true
        }
      }
      if (grew) publishPages()
    },
    { rootMargin: "0px 0px -20% 0px" },
  )
  // --- views: another page's content read here -----------------------------------
  // A post shown whole in a feed is read there, as a tweet is: an element carrying
  // `data-view="/its/path"` that is at least half on screen writes the line "view"
  // with that path, once per page, and the collector counts it as a view of that page.
  const views = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || shown === null) continue
        const path = e.target.getAttribute("data-view") as string
        if (!path.startsWith("/"))
          throw new Error(`PageSensor: data-view "${path}" is no path`)
        if (shown.viewed.has(path)) continue
        shown.viewed.add(path)
        shown.span.info("view", { host: location.host, path })
      }
    },
    { threshold: 0.5 },
  )
  const scan = () => {
    for (const el of document.querySelectorAll("[data-section]"))
      if (!seen.has(el)) {
        seen.add(el)
        sections.observe(el)
      }
    for (const el of document.querySelectorAll("[data-view]"))
      if (!seen.has(el)) {
        seen.add(el)
        views.observe(el)
      }
  }
  // Re-observed for each page: a section already on screen is reached by the new page
  // too, and a post on screen is viewed by it.
  const rescan = () => {
    sections.disconnect()
    views.disconnect()
    seen.clear()
    scan()
  }
  const grows = new MutationObserver(scan)
  grows.observe(document.documentElement, { childList: true, subtree: true })

  function open(nav: PageNav, path: string, from?: string): void {
    const o = props.current
    const search = new URLSearchParams(location.search)
    const source = (search.get("utm_source") ?? search.get("ref"))?.slice(
      0,
      100,
    )
    const fields: Fields = Object.fromEntries(
      Object.entries({
        host: location.host,
        path,
        nav,
        from,
        referrer: first ? referrer : undefined,
        source: source || undefined,
        viewport: viewport(innerWidth),
        place: o.place?.(path),
        route: o.route?.(path),
        build: o.build,
        probe: navigator.webdriver === true || undefined,
        staff: o.staff || undefined,
      }).filter(([, v]) => v !== undefined),
    )
    shown = {
      span: log.begin("page", fields),
      path,
      fields,
      reached: [],
      viewed: new Set(),
      first,
    }
    first = false
    rescan()
    reportPages((pages) => [...pages, { fields, reached: [], open: true }])
  }

  function close(): void {
    if (shown === null) return
    const { span, reached, fields } = shown
    const end: Record<string, unknown> = {}
    if (reached.length > 0) end.reached = [...reached]
    if (shown.first) Object.assign(end, vitals)
    span.set(end)
    span.end()
    last = span
    shown = null
    reportPages((pages) =>
      pages.map((p, i) =>
        i === pages.length - 1
          ? {
              fields: { ...fields, ...end },
              reached: [...reached],
              open: false,
            }
          : p,
      ),
    )
  }

  /** The page is on screen: a page span starts, unless one is open. */
  function show(): void {
    if (shown !== null || frozen) return
    open(first ? loaded : "resumed", location.pathname)
  }

  const visibility = () => {
    if (document.visibilityState === "hidden") close()
    else show()
  }
  const pagehide = (e: PageTransitionEvent) => {
    close()
    frozen = e.persisted
  }
  const pageshow = (e: PageTransitionEvent) => {
    if (!e.persisted) return
    frozen = false
    open("bfcache", location.pathname)
  }
  // A route change: the URL's path moved (a replace that keeps the path is no page).
  const routed = () => {
    if (shown === null || shown.path === location.pathname) return
    const from = shown.path
    close()
    open("soft", location.pathname, from)
  }
  const uncaught = (e: ErrorEvent) =>
    currentPage().error("uncaught error", { err: e.error ?? e.message })
  const rejection = (e: PromiseRejectionEvent) =>
    currentPage().error("unhandled rejection", { err: e.reason })

  // --- requests --------------------------------------------------------------------
  const original = window.fetch
  const traced = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const request = input instanceof Request ? input : undefined
    const url = new URL(
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.href
          : input,
      location.href,
    )
    const headers = new Headers(init?.headers ?? request?.headers)
    const holder = shown?.span ?? last
    if (
      url.origin !== location.origin ||
      url.href === collector ||
      holder === null ||
      headers.has("next-router-prefetch")
    )
      return original.call(window, input, init)
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase()
    const kind =
      headers.get("rsc") === "1"
        ? "rsc"
        : headers.has("next-action")
          ? "action"
          : url.pathname.startsWith("/api/")
            ? "api"
            : "other"
    const span = holder.begin("fetch", { method, path: url.pathname, kind })
    if (!headers.has("traceparent"))
      headers.set("traceparent", span.traceparent())
    return original.call(window, input, { ...init, headers }).then(
      (res) => {
        span.set({ status: res.status })
        span.end(
          res.status >= 400 ? new Error(`HTTP ${res.status}`) : undefined,
        )
        return res
      },
      (err: unknown) => {
        // A request the page cancelled (a navigation superseded) is no failure.
        if (err instanceof DOMException && err.name === "AbortError") {
          span.set({ aborted: true })
          span.end()
        } else span.end(err)
        throw err
      },
    )
  }
  window.fetch = traced as typeof fetch

  const nav = (
    window as Window & {
      navigation?: EventTarget
    }
  ).navigation
  document.addEventListener("visibilitychange", visibility)
  addEventListener("pagehide", pagehide)
  addEventListener("pageshow", pageshow)
  addEventListener("error", uncaught)
  addEventListener("unhandledrejection", rejection)
  nav?.addEventListener("currententrychange", routed)
  // A prerendered page is a page when it is shown, and never if it is not.
  const prerendering = (document as Document & { prerendering?: boolean })
    .prerendering
  if (prerendering)
    document.addEventListener("prerenderingchange", visibility, { once: true })
  else visibility()

  stopWatching = () => {
    close()
    document.removeEventListener("visibilitychange", visibility)
    document.removeEventListener("prerenderingchange", visibility)
    removeEventListener("pagehide", pagehide)
    removeEventListener("pageshow", pageshow)
    removeEventListener("error", uncaught)
    removeEventListener("unhandledrejection", rejection)
    nav?.removeEventListener("currententrychange", routed)
    if (window.fetch === (traced as typeof fetch)) window.fetch = original
    sections.disconnect()
    views.disconnect()
    grows.disconnect()
    last = null
    stopWatching = null
    publish({ state: "off" })
  }
}

/** Writes this tab's pages to the stream. Mount once, in the root layout; renders nothing. */
export function PageSensor(props: PageSensorProps) {
  const latest = React.useRef(props)
  // Before the watch's effect: a page opened on mount reads this render's props.
  React.useLayoutEffect(() => {
    latest.current = props
  })
  React.useEffect(() => {
    // Mounted again within the tick it left (React's strict mode does it on every
    // mount in development): the page goes on, never a page of a few milliseconds.
    if (stopping !== null) {
      clearTimeout(stopping)
      stopping = null
    } else watch(latest)
    return () => {
      stopping = setTimeout(() => {
        stopping = null
        stopWatching?.()
      }, 0)
    }
  }, [])
  return null
}

/** The sensor's stop, waiting one tick for a mount that takes its place. */
let stopping: ReturnType<typeof setTimeout> | null = null
