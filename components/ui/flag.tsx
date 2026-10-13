import { hasFlag as known } from "country-flag-icons"
import * as Square from "country-flag-icons/react/1x1"
import * as Rect from "country-flag-icons/react/3x2"
import type * as React from "react"
import { cn } from "@/lib/utils"

export type FlagShape = "rect" | "square"

type Art = (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element

const SET: Record<FlagShape, Record<string, Art>> = {
  rect: Rect as unknown as Record<string, Art>,
  square: Square as unknown as Record<string, Art>,
}

/** A code as the set names it: upper case, a subdivision's hyphen kept. */
const normal = (code: string) => code.trim().toUpperCase()

/** Whether there is a flag for this code (ISO 3166-1 alpha-2, or the set's
 *  subdivisions such as `GB-SCT`). */
export function hasFlag(code: string): boolean {
  return known(normal(code))
}

const REGION = new Intl.DisplayNames(["en"], { type: "region" })

/** The country's name in English, or the code itself where Intl has none (a
 *  subdivision). */
export function countryName(code: string): string {
  const c = normal(code)
  return (c.length === 2 && REGION.of(c)) || c
}

/** Height in em of each shape: a 3:2 flag as tall as the capitals beside it, a
 *  square one a little taller so its area reads the same. */
const SIZE: Record<FlagShape, string> = {
  rect: "h-[0.75em] w-[1.125em]",
  square: "size-[0.9em]",
}

export function Flag({
  code,
  shape = "rect",
  label,
  className,
}: {
  code: string
  shape?: FlagShape
  /** What the flag says to a screen reader and on hover. Default the country's
   *  name; "" when the name is written beside it already. */
  label?: string
  className?: string
}) {
  const c = normal(code)
  if (!known(c)) throw new Error(`flag: no flag for "${code}"`)
  const Art = SET[shape][c.replace("-", "_")]
  if (!Art) throw new Error(`flag: no ${shape} art for "${c}"`)
  const said = label ?? countryName(c)
  const look = {
    "data-slot": "flag",
    "data-shape": shape,
    className: cn(FRAME, SIZE[shape], className),
  }
  const art = <Art aria-hidden className="block size-full" />
  // Named, it is an image with the country's name; unnamed (the name is written
  // beside it), it is decoration and says nothing.
  if (!said)
    return (
      <span aria-hidden {...look}>
        {art}
      </span>
    )
  return (
    <span role="img" aria-label={said} title={said} {...look}>
      {art}
    </span>
  )
}

/** The flag's box, and the hairline over its edge in the text's colour. */
const FRAME =
  "relative inline-block shrink-0 overflow-hidden align-[-0.08em] after:pointer-events-none after:absolute after:inset-0 after:shadow-[inset_0_0_0_1px_color-mix(in_oklab,currentColor_18%,transparent)] after:content-['']"
