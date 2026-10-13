"use client"

// Toasts: a word about something that just happened, at the window's foot, gone on its
// own. sonner's API over Base UI's toast (announced to a screen reader, politely or,
// for an error, at once; F6 reaches them from the keyboard):
//
//   <Toaster />                                   once, anywhere in the app
//   toast("saved")                                a note
//   toast.success("35 frames read", { description: "smile in 4" })
//   toast.error("the upload stopped", { action: { label: "retry", onClick } })
//   toast.loading("reading…")                     stays until updated or dismissed
//   toast.promise(save(), { loading: "saving…", success: "saved", error: (e) => e.message })
//   toast.dismiss(id)                             one, or every one with no id
//
// `toast()` can be called from anywhere, inside React or out (an action, a fetch's
// catch): the Toaster draws whatever it is handed. A kind wears ONE colour (its icon,
// the glass's stain), the words stay in the text's colour.
//
// The stack: the newest in front, the ones behind peeking out above it and shrinking;
// under the hand (or with keyboard focus) the stack opens into a list, and the timers
// wait. A swipe down or sideways dismisses one, following the finger. A toast past the
// limit (3) leaves. Nothing moves under reduced motion. Two materials (`material` on
// the Toaster, or a MaterialProvider round it): plain, the page's popover surface;
// glass, the material's glass.
//
// ONE Toaster per page: every `toast()` goes through one manager, so a second Toaster
// would draw and announce each toast twice; mounting a second one throws. It draws in
// the document's body, or inside whatever element is fullscreen while one is (a toast
// raised during a fullscreen video is drawn over it, not behind it), or in the
// `container` it is given (a player filling the window without the browser's
// fullscreen: pass its layer). A loading toast turns for SPIN_MS at most, then holds
// still: nothing animates forever.

import { Toast as Base } from "@base-ui/react/toast"
import { CircleAlert, CircleCheck, TriangleAlert, X } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { Spinner } from "@/components/ui/spinner"

export type ToastKind = "default" | "success" | "warning" | "error" | "loading"

export interface ToastOptions {
  description?: React.ReactNode
  /** A verb the reader can answer with (undo, retry): pressing it also dismisses. */
  action?: { label: React.ReactNode; onClick: () => void }
  /** ms before it goes on its own; 0 keeps it. Default 5000 (a loading one: 0). */
  timeout?: number
  /** Its id: a toast with the id of one shown replaces it in place. */
  id?: string
}

/** The one manager every `toast()` goes through and the Toaster draws. */
const manager = Base.createToastManager()

function add(kind: ToastKind, title: React.ReactNode, o: ToastOptions = {}) {
  return manager.add({
    id: o.id,
    title,
    type: kind,
    description: o.description,
    timeout: o.timeout ?? (kind === "loading" ? 0 : undefined),
    priority: kind === "error" ? "high" : "low",
    actionProps: o.action && {
      children: o.action.label,
      onClick: o.action.onClick,
    },
  })
}

/** What a promise says at each step: a title, or one made from its value. */
type Said<V> = React.ReactNode | ((value: V) => React.ReactNode)
const say = <V,>(s: Said<V>, v: V): React.ReactNode =>
  typeof s === "function" ? (s as (value: V) => React.ReactNode)(v) : s

/** A toast: `toast("saved")`, or one of a kind (`toast.success`, …). Each returns its
 *  id, for `toast.dismiss` or for replacing it (`id` in its options). */
export const toast = Object.assign(
  (title: React.ReactNode, options?: ToastOptions) =>
    add("default", title, options),
  {
    success: (title: React.ReactNode, options?: ToastOptions) =>
      add("success", title, options),
    warning: (title: React.ReactNode, options?: ToastOptions) =>
      add("warning", title, options),
    error: (title: React.ReactNode, options?: ToastOptions) =>
      add("error", title, options),
    loading: (title: React.ReactNode, options?: ToastOptions) =>
      add("loading", title, options),
    /** One toast for a promise: loading while it runs, then what it came to. The
     *  promise is handed back, so the caller still awaits its value. */
    promise: <V,>(
      promise: Promise<V>,
      said: {
        loading: React.ReactNode
        success: Said<V>
        error: Said<unknown>
      },
    ) =>
      // What it came to stays as long as the Toaster keeps any toast (its `timeout`).
      manager.promise(promise, {
        loading: { title: said.loading, type: "loading" },
        success: (v: V) => ({
          title: say(said.success, v),
          type: "success",
        }),
        error: (e: unknown) => ({
          title: say(said.error, e),
          type: "error",
          priority: "high",
        }),
      }),
    /** Dismisses one toast, or every one when no id is given. */
    dismiss: (id?: string) => manager.close(id),
  },
)

/** Each kind's colour, as the tokens name it; default is the text's own. */
const INK: Record<ToastKind, string> = {
  default: "currentColor",
  loading: "currentColor",
  success: "var(--tone-ok)",
  warning: "var(--tone-warn)",
  error: "var(--tone-bad)",
}

/** How long a loading toast's spinner turns before it holds still, ms: work that
 *  takes longer is still under way, said by the words, not by a wheel turning forever. */
const SPIN_MS = 30_000

const ICON: Record<Exclude<ToastKind, "loading">, React.ReactNode> = {
  default: null,
  success: <CircleCheck />,
  warning: <TriangleAlert />,
  error: <CircleAlert />,
}

/** A loading toast's spinner: turning for SPIN_MS from when this toast began loading,
 *  then still. */
function LoadingMark() {
  const [still, setStill] = React.useState(false)
  React.useEffect(() => {
    const t = window.setTimeout(() => setStill(true), SPIN_MS)
    return () => window.clearTimeout(t)
  }, [])
  return <Spinner size="sm" className={cn(still && "[&_svg]:animate-none")} />
}

/** The element fullscreen right now, which the toasts must be drawn inside to be seen:
 *  the browser draws nothing of the page over it. Null otherwise. */
function useFullscreenElement(): Element | null {
  const [el, setEl] = React.useState<Element | null>(null)
  React.useEffect(() => {
    const read = () => setEl(document.fullscreenElement)
    read()
    document.addEventListener("fullscreenchange", read)
    return () => document.removeEventListener("fullscreenchange", read)
  }, [])
  return el
}

/** Toasters mounted now: one at most (the header says why). */
let mounted = 0

const kindOf = (type: string | undefined): ToastKind =>
  type === "success" ||
  type === "warning" ||
  type === "error" ||
  type === "loading"
    ? type
    : "default"

/** Where the stack stands: the window's foot, at its end or its middle. */
export type ToasterPosition = "bottom-end" | "bottom-center"

const VIEWPORT: Record<ToasterPosition, string> = {
  "bottom-end":
    "fixed right-4 bottom-4 z-[60] w-[min(22.5rem,calc(100vw-2rem))] sm:right-6 sm:bottom-6",
  "bottom-center":
    "fixed bottom-4 left-1/2 z-[60] w-[min(22.5rem,calc(100vw-2rem))] -translate-x-1/2 sm:bottom-6",
}

/** THE STACK, Base UI's own variables: the frontmost at the foot, each one behind it
 *  lifted by the peek and shrunk a tenth, all of them as tall as the frontmost while
 *  stacked; opened (`data-expanded`), each at its own offset and height. A swipe
 *  carries the toast with the finger, a dismissal sends it out the way it went. */
const STACK =
  "[--gap:0.625rem] [--peek:0.625rem] [--scale:calc(max(0,1-(var(--toast-index)*0.08)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] absolute right-0 bottom-0 left-0 z-[calc(1000-var(--toast-index))] h-(--height) origin-bottom select-none [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))] data-limited:opacity-0 data-starting-style:[transform:translateY(150%)] data-ending-style:opacity-0 [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)] data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]"

/** The stack's motion, one per face: the plain face's own transition, the glass
 *  face's through the material, which owns its transition (`--glass-moves`). */
const STACK_MOTION: Record<Material, string> = {
  plain:
    "[transition:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.5s,height_0.15s] motion-reduce:transition-none",
  glass:
    "[--glass-moves:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.5s,height_0.15s]",
}

const PLAIN_FACE =
  "rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
const GLASS_FACE = cn(
  glassVariants({ shape: "surface" }),
  "[--glass-radius:--theme(--radius-2xl)] [--glass-blur:18px]",
)

/** The stack, drawn: once per page, anywhere in the app. */
export function Toaster({
  position = "bottom-end",
  limit = 3,
  timeout = 5000,
  material,
  scheme,
  container,
}: {
  position?: ToasterPosition
  /** How many show at once; older ones leave. */
  limit?: number
  /** ms a toast stays by default (a promise's outcome included); 0 keeps them. */
  timeout?: number
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  /** Where the stack is drawn. Default: the body, or the fullscreen element while
   *  there is one. A layer that covers the page without being fullscreen (a player
   *  filling the window) is passed here, or its toasts are drawn behind it. */
  container?: React.ComponentProps<typeof Base.Portal>["container"]
}) {
  React.useEffect(() => {
    mounted += 1
    if (mounted > 1) {
      mounted -= 1
      throw new Error(
        "a second <Toaster> is mounted: every toast() goes to one manager, so it would be drawn and announced twice; mount one Toaster per page",
      )
    }
    return () => {
      mounted -= 1
    }
  }, [])
  const fullscreen = useFullscreenElement()
  return (
    <Base.Provider toastManager={manager} limit={limit} timeout={timeout}>
      {/* Never an explicit null: Base UI's portal reads null as "wait for a
          container" and draws nothing, so no fullscreen element means the body. */}
      <Base.Portal
        container={container ?? (fullscreen as HTMLElement | null) ?? undefined}
      >
        <Base.Viewport
          data-slot="toaster"
          className={cn(VIEWPORT[position], "outline-none")}
        >
          <Toasts material={material} scheme={scheme} />
        </Base.Viewport>
      </Base.Portal>
    </Base.Provider>
  )
}

function Toasts({
  material,
  scheme,
}: {
  material?: Material
  scheme?: Scheme
}) {
  const { toasts } = Base.useToastManager()
  const m = useMaterial(material)
  return toasts.map((t) => (
    <ToastCard key={t.id} toast={t} material={m} scheme={scheme} />
  ))
}

/** One toast, a surface of its own: over a picture (a player's, in fullscreen) it is
 *  read by the part of it under the toast, and its buttons wear what it reads. */
function ToastCard({
  toast: t,
  material: m,
  scheme,
}: {
  toast: Base.Root.ToastObject
  material: Material
  scheme?: Scheme
}) {
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme)
  const kind = kindOf(t.type)
  const ink = INK[kind]
  return (
    <Base.Root
      ref={here}
      toast={t}
      data-slot="toast"
      data-kind={kind}
      data-material={m}
      className={cn(
        schemeOf(s),
        m === "glass" ? GLASS_FACE : PLAIN_FACE,
        STACK,
        STACK_MOTION[m],
      )}
      style={
        {
          "--ag-toast-ink": ink,
          ...(m === "glass" && kind !== "default" && kind !== "loading"
            ? glassStyle({ tint: ink })
            : {}),
        } as React.CSSProperties
      }
    >
      <Base.Content className="flex items-start gap-3 overflow-hidden px-4 py-3 text-sm transition-opacity duration-250 data-behind:opacity-0 data-expanded:opacity-100">
        {(kind === "loading" || ICON[kind]) && (
          <span
            aria-hidden
            className="mt-0.5 grid size-4 shrink-0 place-items-center text-(--ag-toast-ink) [&_svg]:size-4"
          >
            {kind === "loading" ? <LoadingMark key={t.id} /> : ICON[kind]}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Base.Title className="font-medium leading-5" />
          <Base.Description className="text-current/65 leading-5" />
        </div>
        {t.actionProps && (
          <Base.Action
            render={
              <Button
                variant="secondary"
                size="sm"
                material={m}
                scheme={s}
                className="-my-1"
              />
            }
          />
        )}
        <Base.Close
          aria-label="dismiss"
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              corners="pill"
              material={m}
              scheme={s}
              className="-mt-1 -mr-2 text-current/45 hover:text-current"
            />
          }
        >
          <X />
        </Base.Close>
      </Base.Content>
    </Base.Root>
  )
}
