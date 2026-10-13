"use client"

// Copy to the clipboard, with the only feedback that matters: the control says it
// worked, in place, and goes back on its own. No toast, nothing to dismiss.

import { Check, CircleAlert, Clipboard } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

/** How long the control admits it copied. Long enough to read at a glance, short
 *  enough that a second copy is never blocked by the first one's applause. */
export const COPIED_MS = 1400

/** `copied` flips true on a successful write and clears itself. The timer is cleared
 *  on unmount and on every new copy, so a fast second press restarts it rather than
 *  being cut short by the first one's expiry. */
export function useCopy(text: string | (() => string)) {
  const [copied, setCopied] = React.useState(false)
  const [error, setError] = React.useState<unknown>(null)
  const timer = React.useRef(0)
  React.useEffect(() => () => window.clearTimeout(timer.current), [])
  const copy = React.useCallback(async () => {
    const value = typeof text === "function" ? text() : text
    // Empty is not a copy: writing "" silently wipes what the reader already had.
    window.clearTimeout(timer.current)
    setCopied(false)
    setError(null)
    if (!value) return false
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      timer.current = window.setTimeout(() => setCopied(false), COPIED_MS)
      return true
    } catch (cause) {
      setError(cause)
      return false
    }
  }, [text])
  return { copied, copy, error }
}

export interface CopyProps
  extends Omit<React.ComponentProps<"button">, "children" | "value"> {
  /** The text to write. A function is read at press time, for a live value. */
  value: string | (() => string)
  /** Show the word beside the mark. Off in tight corners, where the mark is enough. */
  label?: boolean
}

export function Copy({
  value,
  label = false,
  className,
  onClick,
  ...props
}: CopyProps) {
  const { copied, copy, error } = useCopy(value)
  return (
    <button
      data-slot="copy"
      type="button"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) void copy()
      }}
      // The accessible name carries the state, because the icon swap alone is silent
      // to a screen reader and `aria-live` on a control this small is noise.
      aria-label={error ? "Copy failed. Try again" : copied ? "Copied" : "Copy"}
      title={
        error
          ? "Clipboard unavailable. Try again or select the text to copy."
          : undefined
      }
      data-copied={copied ? "" : undefined}
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 rounded-md px-2 font-mono text-xs leading-none text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 data-copied:text-foreground",
        !label && "w-8 px-0",
        className,
      )}
      {...props}
    >
      {error ? (
        <CircleAlert size={14} aria-hidden />
      ) : copied ? (
        <Check size={14} aria-hidden />
      ) : (
        <Clipboard size={14} aria-hidden />
      )}
      {label && (
        <span
          data-slot="copy-label"
          className="inline-block min-w-[6ch] text-left"
        >
          {error ? "retry" : copied ? "copied" : "copy"}
        </span>
      )}
    </button>
  )
}
