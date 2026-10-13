"use client"

// THE COUNTRY PICKER, OFF THE PAGE'S FIRST LOAD: every country's flag is about
// 45 KB gzipped, which a page should not wait for, and which a person should
// not wait for either when they press the trigger. So it is fetched as soon as
// its trigger is on the page, after the page has loaded, and the trigger is
// drawn at once as itself until the picker is there; by the time a hand reaches
// it, it is.
//
//   <LazyCountryPickerPopover value={code} onChange={setCode}>
//     <button>{code ? <Flag code={code} /> : "country"}</button>
//   </LazyCountryPickerPopover>
//
// The same props as `CountryPickerPopover`. `preloadCountryPicker()` fetches it
// earlier still, from wherever a page knows it will be wanted.

import * as React from "react"
import type { CountryPickerPopover as Picker } from "@/components/ui/country-picker"

type Module = typeof import("@/components/ui/country-picker")

let loading: Promise<Module> | null = null

/** Fetch the picker, once however often asked, and once it is here build what
 *  its first opening would (every country named in English and in its own
 *  language, the reader's countries) while the page is idle, so a press opens
 *  it at once. */
export function preloadCountryPicker(): Promise<Module> {
  loading ??= import("@/components/ui/country-picker").then((m) => {
    // Rendered on a server too, where there is no reader to name for.
    if (typeof window === "undefined") return m
    const warm = () => {
      m.countries()
      m.readerRegions()
    }
    if ("requestIdleCallback" in window) requestIdleCallback(warm)
    else setTimeout(warm, 0)
    return m
  })
  return loading
}

const Loaded = React.lazy(() =>
  preloadCountryPicker().then((m) => ({ default: m.CountryPickerPopover })),
)

export function LazyCountryPickerPopover(
  props: React.ComponentProps<typeof Picker>,
) {
  // Drawn, it asks for the picker; until it comes the trigger stands as itself.
  return (
    <React.Suspense fallback={props.children}>
      <Loaded {...props} />
    </React.Suspense>
  )
}
