// THE MACHINE'S OWN WORD ON ITS LOAD, for the page's ambient budgets (lib/ambient-budget
// `pressure`): the Compute Pressure API's CPU states (nominal, fair, serious, critical,
// from the processor's load and heat), heard by one observer for the whole page and
// told to every budget alive. Chrome and Edge say it; where the browser has no
// PressureObserver (Safari, Firefox) nothing is heard and the frame counts decide alone.

import type { AmbientBudget, AmbientPressure } from "@/lib/ambient-budget"

/** The Compute Pressure API, as much of it as the budgets read (not in TypeScript's DOM
 *  types yet). */
interface PressureRecord {
  state: AmbientPressure
}
interface PressureObserverLike {
  observe: (
    source: "cpu",
    options?: { sampleInterval?: number },
  ) => Promise<void>
  disconnect: () => void
}
type PressureObserverCtor = new (
  callback: (records: PressureRecord[]) => void,
) => PressureObserverLike

/** At most one state a second: the budget's verdicts are two-second windows. */
const SAMPLE_MS = 1000

const budgets = new Set<AmbientBudget>()
let observer: PressureObserverLike | null = null
let last: AmbientPressure | null = null

/** `budget` hears the machine's load from now on, its last state at once; the return
 *  stops it. The observer lives while any budget listens. */
export function watchPressure(budget: AmbientBudget): () => void {
  const Ctor = (globalThis as { PressureObserver?: PressureObserverCtor })
    .PressureObserver
  if (!Ctor) return () => {}
  budgets.add(budget)
  if (last) budget.pressure(last, performance.now())
  if (!observer) {
    const made = new Ctor((records) => {
      const state = records.at(-1)?.state
      if (!state) return
      last = state
      for (const b of budgets) b.pressure(state, performance.now())
    })
    observer = made
    // Refused where a permissions policy withholds it (an iframe not granted
    // compute-pressure): the frames decide alone there, said once. An observer
    // disconnected before it started (its last budget gone first: React's development
    // mount runs every effect twice) is refused too, and that is no news.
    made.observe("cpu", { sampleInterval: SAMPLE_MS }).catch((e: Error) => {
      if (made !== observer) return
      console.warn(
        `machine-pressure: the CPU's load is not heard (${e.message})`,
      )
    })
  }
  return () => {
    budgets.delete(budget)
    if (budgets.size > 0 || !observer) return
    observer.disconnect()
    observer = null
    last = null
  }
}
