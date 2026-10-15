"use client"

import {
  type ComponentPropsWithRef,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { PreviewPicker } from "@/components/ui/preview-picker"
import { cn } from "@/lib/utils"

export interface CardGalleryProps
  extends Omit<
    ComponentPropsWithRef<"section">,
    "children" | "defaultValue" | "onChange"
  > {
  items: readonly {
    id: string
    label: string
    mark: ReactNode
    content: ReactNode
  }[]
  label?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Fractional position and navigation belong to the same timeline controller. */
  timeline?: { offset: number; seek: (index: number) => unknown }
  /** Let neighboring cards reach the window edges, keeping the active card centered in its column. */
  bleed?: boolean
  /** Space outside the presentation for a fixed sidebar or table of contents. */
  insetInlineEnd?: string
  /** The picker under the cards: each card's mark alone (`icons`, its label read
   *  only by assistive tech), or its mark and its label in words (`labels`). */
  picker?: "icons" | "labels"
  className?: string
  classNames?: Partial<
    Record<"body" | "viewport" | "track" | "card" | "picker", string>
  >
}

/** Card presentation only. A scroll-stage timeline can own `offset` and `seek`;
 * otherwise the same gallery is a keyboard and touch driven carousel. */
export function CardGallery({
  items,
  label = "Gallery",
  value,
  defaultValue,
  onValueChange,
  timeline,
  bleed = false,
  insetInlineEnd = "0px",
  picker = "icons",
  className,
  classNames,
  ref,
  onKeyDown,
  ...props
}: CardGalleryProps) {
  const first = items[0]
  if (!first || new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error("CardGallery needs nonempty items with unique IDs")
  const at = (i: number): (typeof items)[number] => {
    const item = items[i]
    if (!item) throw new Error(`CardGallery: no item at ${i}`)
    return item
  }
  const [local, setLocal] = useState(defaultValue ?? first.id)
  const offset = timeline
    ? Math.max(0, Math.min(items.length - 1, timeline.offset))
    : undefined
  const index =
    offset !== undefined
      ? Math.floor(offset)
      : Math.max(
          0,
          items.findIndex((item) => item.id === (value ?? local)),
        )
  const seek = (next: number) => {
    const index = Math.max(0, Math.min(items.length - 1, next))
    const id = at(index).id
    if (timeline) timeline.seek(index)
    else if (value === undefined) setLocal(id)
    onValueChange?.(id)
  }
  const wheelAt = useRef(0)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const root = useRef<HTMLElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: selection changes which subtree becomes inert
  useLayoutEffect(() => {
    const element = root.current
    const active = document.activeElement
    if (
      element &&
      active instanceof HTMLElement &&
      element.contains(active) &&
      active.closest("[inert]")
    )
      element.focus({ preventScroll: true })
  }, [index])
  useLayoutEffect(() => {
    const element = root.current
    if (!element || !bleed) return
    const measure = () => {
      const bounds = element.getBoundingClientRect()
      element.style.setProperty("--gallery-left", `${bounds.left}px`)
      element.style.setProperty(
        "--gallery-window",
        `${document.documentElement.clientWidth}px`,
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [bleed])
  return (
    <section
      {...props}
      ref={(element) => {
        root.current = element
        if (typeof ref === "function") return ref(element)
        if (ref) ref.current = element
      }}
      data-slot="card-gallery"
      aria-label={label}
      aria-roledescription="carousel"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: carousel keyboard navigation needs a focus target
      tabIndex={0}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (
          event.defaultPrevented ||
          (event.target as HTMLElement).closest(
            "input,textarea,select,[contenteditable=true],[role=slider],[role=combobox],[role=listbox],[role=menu],[role=tablist]",
          )
        )
          return
        const next =
          event.key === "ArrowRight"
            ? index + 1
            : event.key === "ArrowLeft"
              ? index - 1
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : null
        if (next === null) return
        event.preventDefault()
        seek(next)
      }}
      className={cn(
        "group/gallery @container/gallery w-full min-w-0 outline-none [--card-bg:color-mix(in_oklab,var(--foreground)_8%,var(--background))] [--card:min(88cqw,72rem)] [--gap:2rem]",
        className,
      )}
    >
      <div className={cn("space-y-8", classNames?.body)}>
        <div
          data-slot="card-gallery-viewport"
          className={cn(
            "relative touch-pan-y touch-pinch-zoom overflow-x-clip py-8",
            classNames?.viewport,
          )}
          style={
            bleed
              ? {
                  marginLeft: "calc(-1 * var(--gallery-left, 0px))",
                  width: `calc(var(--gallery-window, 100%) - ${insetInlineEnd})`,
                  // The fade is as wide as the reserved rail, capped at 2rem: a rail
                  // that resolves to 0px (a custom property below its breakpoint)
                  // fades nothing, which a string comparison could never know.
                  maskImage: `linear-gradient(to right, black calc(100% - min(2rem, ${insetInlineEnd})), transparent)`,
                }
              : undefined
          }
          onWheel={(event) => {
            if (
              Math.abs(event.deltaX) < 24 ||
              Math.abs(event.deltaX) < Math.abs(event.deltaY)
            )
              return
            const now = performance.now()
            if (now - wheelAt.current < 700) return
            wheelAt.current = now
            seek(index + (event.deltaX > 0 ? 1 : -1))
          }}
          onTouchStart={(event) => {
            const point = event.touches[0]
            touch.current =
              event.touches.length === 1 && point
                ? { x: point.clientX, y: point.clientY }
                : null
          }}
          onTouchEnd={(event) => {
            const start = touch.current
            touch.current = null
            const end = event.changedTouches[0]
            if (!start || !end) return
            const dx = start.x - end.clientX,
              dy = start.y - end.clientY
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
              seek(index + (dx > 0 ? 1 : -1))
          }}
          onTouchCancel={() => {
            touch.current = null
          }}
        >
          <div
            data-slot="card-gallery-track"
            className={cn(
              "flex gap-(--gap) pl-[calc((100cqw-var(--card))/2)]",
              offset === undefined &&
                "transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
              classNames?.track,
            )}
            style={{
              paddingLeft: bleed
                ? "calc(var(--gallery-left, 0px) + (100cqw - var(--card)) / 2)"
                : undefined,
              transform: `translateX(calc(-${offset ?? index} * (var(--card) + var(--gap))))`,
            }}
          >
            {items.map((item, i) => (
              // biome-ignore lint/a11y/useSemanticElements: a carousel slide groups content, not form fields
              <div
                data-slot="card-gallery-card"
                key={item.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${item.label}, ${i + 1} of ${items.length}`}
                aria-hidden={i !== index || undefined}
                inert={i !== index}
                className={cn(
                  "w-(--card) shrink-0 rounded-[2rem] bg-(--card-bg)",
                  i === index && "group-focus-visible/gallery:focus-ring",
                  classNames?.card,
                )}
              >
                {item.content}
              </div>
            ))}
          </div>
        </div>
        <div className={cn("flex justify-center", classNames?.picker)}>
          <PreviewPicker
            label={label}
            value={index}
            onChange={seek}
            iconsOnly={picker === "icons"}
            options={items.map((mark, value) => ({
              value,
              label: mark.label,
              icon: mark.mark,
            }))}
          />
        </div>
      </div>
    </section>
  )
}
