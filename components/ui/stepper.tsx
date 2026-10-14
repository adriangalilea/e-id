"use client"

// STEP THROUGH AN ORDERED SET: ‹ the current one, in words › (a month, a frame of
// twelve, how deep a tree is open, a page). One press is one step, held it repeats,
// and a chevron at an end dims (`wrap` goes round instead). The value is a focus
// stop of its own (`spinbutton`, said in its words): the arrows step, Home and End
// go to the ends. What it steps through is `options`, any values, said by `format`.
//
//   <Stepper label="month" value={month} options={MONTHS} onValueChange={setMonth}
//     format={(m) => monthName(m)} />
//   <Stepper label="speed" defaultValue={1} options={[0.5, 1, 2]} />   // its own
//
// Owned (`value`), whatever moves the value outside moves the stepper; its own
// (`defaultValue`), it keeps the value and says each change (`onValueChange`).
//
// A number a person also scrubs and types is `number` (NumberField), whose ‹ › are
// this item's `StepChevron`; a value on a continuous range is `slider`; a handful of
// choices all worth seeing at once is `toggle-group`. Two materials (`material`):
// plain, a well of the text's colour; glass, the material's glass, a pill.

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"

/** A held chevron starts repeating after this, then moves every `every` ms. */
const HOLD_MS = 400
const REPEAT_MS = 70

/** Shift steps ten, alt a tenth (a stepper over a list steps one either way). */
export const stepModifier = (e: { altKey: boolean; shiftKey: boolean }) =>
  e.altKey ? 0.1 : e.shiftKey ? 10 : 1

export interface StepChevronProps {
  dir: 1 | -1
  /** Move one step that way (`mult`: the modifier's, 10 or 0.1), committed or
   *  not: a held press moves uncommitted and settles on release. */
  onStep: (mult: number, commit: boolean) => void
  /** A press begins, before its first step: note where it started. */
  onPress?: () => void
  /** The press let go after one or more steps: settle what they did. */
  onRelease?: () => void
  /** Nothing further that way: dimmed, and a press does nothing. */
  atEnd?: boolean
  disabled?: boolean
  /** What a press does, for a screen reader ("next month"). */
  label: string
  /** How often a held press repeats, ms (70). */
  every?: number
  className?: string
}

/** One chevron, ‹ or ›: a step a press, repeating while held. Never a tab stop and
 *  never taking focus: the keys reach the same steps through the value it stands
 *  beside, so typing or reading there carries on. A screen reader's activate (a
 *  click with no press before it) steps once, committed. */
export function StepChevron({
  dir,
  onStep,
  onPress,
  onRelease,
  atEnd = false,
  disabled,
  label,
  every = REPEAT_MS,
  className,
}: StepChevronProps) {
  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || atEnd || e.button !== 0) return
    e.preventDefault()
    const mult = stepModifier(e)
    onPress?.()
    onStep(mult, false)
    let timer = window.setTimeout(function repeat() {
      onStep(mult, false)
      timer = window.setTimeout(repeat, every)
    }, HOLD_MS)
    const end = () => {
      window.clearTimeout(timer)
      document.removeEventListener("pointerup", end)
      document.removeEventListener("pointercancel", end)
      onRelease?.()
    }
    document.addEventListener("pointerup", end)
    document.addEventListener("pointercancel", end)
  }
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      aria-disabled={atEnd || undefined}
      disabled={disabled}
      data-slot={dir > 0 ? "step-next" : "step-previous"}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        if (e.detail === 0 && !atEnd) onStep(stepModifier(e), true)
      }}
      className={cn(
        "grid size-5 shrink-0 cursor-pointer select-none place-items-center rounded-full text-current/45 hover:text-current aria-disabled:cursor-default aria-disabled:text-current/20",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 6 10"
        className={cn("h-2.5 w-1.5", dir < 0 && "-scale-x-100")}
      >
        {/* The stroke's round caps and join reach 0.75 past the points: the
            path is inset by exactly that, so the ink is the box. */}
        <path
          d="M0.75 0.75 5.25 5 0.75 9.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export type StepperSize = "sm" | "md" | "lg"

/** The input's heights less nothing: the value row and the padding round it. */
const SIZE: Record<StepperSize, string> = {
  sm: "h-7 gap-1 px-1 text-xs",
  md: "h-8 gap-1.5 px-1.5 text-sm",
  lg: "h-10 gap-2 px-2 text-sm",
}
const GLASS_PILL: Record<StepperSize, string> = {
  sm: "[--glass-radius:14px]",
  md: "[--glass-radius:16px]",
  lg: "[--glass-radius:20px]",
}

export interface StepperProps<T> {
  /** The value, owned outside: whatever moves it there (a branch closed by hand,
   *  a route) moves the stepper. Without it the stepper keeps its own, from
   *  `defaultValue`. */
  value?: T
  defaultValue?: T
  /** What it steps through, in order. */
  options: readonly T[]
  onValueChange?: (value: T) => void
  /** Its name for a screen reader ("month", "levels open"). */
  label: string
  /** A value in words (default `String`). The widest option's words keep their
   *  room, so stepping moves nothing beside it. */
  format?: (value: T) => string
  /** Past an end, round to the other (a carousel); default it stops there. */
  wrap?: boolean
  size?: StepperSize
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  disabled?: boolean
  className?: string
}

export function Stepper<T>({
  value: owned,
  defaultValue,
  options,
  onValueChange,
  label,
  format = String,
  wrap = false,
  size = "md",
  material,
  scheme,
  disabled,
  className,
}: StepperProps<T>) {
  const m = useMaterial(material)
  const [s, here] = useSurfaceScheme<HTMLSpanElement>(scheme)
  if (owned === undefined && defaultValue === undefined)
    throw new Error(
      `stepper ${label}: give a value (owned outside) or a defaultValue (its own)`,
    )
  const [own, setOwn] = React.useState(defaultValue as T)
  const value = owned === undefined ? own : owned
  const at = options.indexOf(value)
  if (at === -1)
    throw new Error(`stepper ${label}: the value is not one of its options`)
  const last = options.length - 1
  // The handlers outlive a render (a held press spans many): they read the latest.
  const live = React.useRef({ at, onValueChange, owned })
  live.current = { at, onValueChange, owned }
  const go = (i: number) => {
    const next = wrap
      ? (i + options.length) % options.length
      : Math.max(0, Math.min(last, i))
    if (next === live.current.at) return
    live.current.at = next
    const v = options[next] as T
    if (live.current.owned === undefined) setOwn(v)
    live.current.onValueChange?.(v)
  }
  const atEnd = (dir: 1 | -1) => !wrap && (dir < 0 ? at === 0 : at === last)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    const by: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    }
    if (e.key in by) {
      e.preventDefault()
      go(at + (by[e.key] as number))
    } else if (e.key === "Home") {
      e.preventDefault()
      go(0)
    } else if (e.key === "End") {
      e.preventDefault()
      go(last)
    }
  }
  const words = options.map(format)
  return (
    <span
      ref={here}
      data-slot="stepper"
      data-material={m}
      className={cn(
        "inline-flex w-fit items-center",
        SIZE[size],
        schemeOf(s),
        m === "glass"
          ? [glassVariants({ shape: "surface" }), GLASS_PILL[size]]
          : "rounded-md bg-current/6",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
    >
      <StepChevron
        dir={-1}
        label={`previous ${label}`}
        atEnd={atEnd(-1)}
        disabled={disabled}
        onStep={() => go(live.current.at - 1)}
      />
      <span
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={at}
        aria-valuetext={words[at]}
        aria-disabled={disabled || undefined}
        data-slot="stepper-value"
        onKeyDown={onKeyDown}
        className="grid cursor-default select-none rounded-sm text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {/* Every option's words in one cell, all but the current hidden: the
            value is as wide as the widest, so nothing beside it moves. */}
        {words.map((w, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: the options' order is their identity
            key={i}
            aria-hidden={i !== at}
            className={cn("[grid-area:1/1] px-1", i !== at && "invisible")}
          >
            {w}
          </span>
        ))}
      </span>
      <StepChevron
        dir={1}
        label={`next ${label}`}
        atEnd={atEnd(1)}
        disabled={disabled}
        onStep={() => go(live.current.at + 1)}
      />
    </span>
  )
}
