"use client"

import * as React from "react"
import { useOnScreen } from "@/components/ui/use-on-screen"
import {
  fullText,
  nextChange,
  type RelativeOptions,
  relativeText,
} from "@/lib/relative-time-core"
import { cn } from "@/lib/utils"

// AN INSTANT SAID FROM NOW, in a native <time>: "4m ago", "in 3d", "just now", past a
// week its date. The machine-readable instant is `dateTime` (ISO), the whole date with
// its time and zone is the title, the words are lib/relative-time-core's.
//
//   <RelativeTime at={deploy.created} />
//   <RelativeTime at={job.due} now={replayClock} precision="minute" dateAfter={3} />
//
// THE CLOCK is the reader's, read after mount: the server's would disagree with the
// reader's, and the two renders with each other, so until then the label is empty.
// It ticks only while the label is on screen in a visible tab (use-on-screen), and
// waits exactly until the words next change (`nextChange`): once a second while it
// counts seconds, once a minute while it counts minutes, not at all on a date until
// the year turns. Back on screen, it reads the clock at once. Given `now` (a page's
// own clock, a replay's, a still), it says the instant from there and keeps no clock.
//
// It draws in the words' voice where it stands (tabular figures, never wrapping);
// `className` gives it another.

/** The longest wait a browser timer holds (2^31 - 1 ms, about 24.8 days); a longer
 *  one fires at once. A wait past it is taken in steps. */
const LONGEST_TIMER = 2 ** 31 - 1

/** Whether this render is the browser's: false on the server and while hydrating. */
const subscribeNothing = () => () => {}
const yes = () => true
const no = () => false

export type RelativeTimeProps = Omit<
  React.ComponentProps<"time">,
  "children" | "dateTime"
> &
  RelativeOptions & {
    /** The instant, ms since the epoch. */
    at: number
    /** The instant it is said from. Default the reader's clock, ticking. */
    now?: number
  }

export function RelativeTime({
  at,
  now,
  precision,
  dateAfter,
  className,
  ref,
  ...props
}: RelativeTimeProps) {
  if (!Number.isFinite(at))
    throw new Error(`RelativeTime: at is no instant (${at})`)
  const [element, setElement] = React.useState<HTMLTimeElement | null>(null)
  const here = React.useCallback(
    (node: HTMLTimeElement | null) => {
      setElement(node)
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  const shown = useOnScreen(element)
  const browser = React.useSyncExternalStore(subscribeNothing, yes, no)
  const [clock, setClock] = React.useState<number | null>(null)
  React.useEffect(() => {
    if (now !== undefined) return
    let timer = 0
    const tick = () => {
      const t = Date.now()
      setClock(t)
      if (!shown) return
      const wait = nextChange(at, t, { precision, dateAfter })
      if (wait !== null)
        timer = window.setTimeout(tick, Math.min(wait, LONGEST_TIMER))
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [at, now, shown, precision, dateAfter])
  const from = now ?? clock
  return (
    <time
      ref={here}
      data-slot="relative-time"
      dateTime={new Date(at).toISOString()}
      // In the reader's zone, so only in the browser: the server's is another's.
      title={browser ? fullText(at) : undefined}
      className={cn("whitespace-nowrap tabular-nums", className)}
      {...props}
    >
      {from === null ? "" : relativeText(at, from, { precision, dateAfter })}
    </time>
  )
}
