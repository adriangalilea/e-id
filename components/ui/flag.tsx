// A COUNTRY'S FLAG, drawn: the same picture on every system, which a flag emoji is not
// (Windows has none and draws the two letters, other systems their own art). The art is
// country-flag-icons' (MIT, maintained; each flag simplified to read at icon size, a
// few hundred bytes where the full-detail sets weigh tens of kilobytes for one coat of
// arms), each its own SVG file the site serves (`flag-route`, installed at
// app/flags/[shape]/[file]/route.ts: prerendered, on the CDN), drawn as an image:
// a page loads the few hundred bytes of the flags it shows, and no script. Inline
// art shipped every flag's drawing with any client component that drew one.
//
//   <Flag code="ES" />                  beside a name: 3:2, as tall as the text's capitals
//   <Flag code="JP" shape="square" />   a mark: 1:1, for a bar-list row or a list's column
//
// Its size is the words': height in em, width from the shape, so a flag beside a name
// at any size is in proportion and on its baseline; `className` sets another
// (`size-4` for bar-list's 16 px mark). A hairline drawn over its edge keeps a white
// field (Japan, Finland) from melting into a light page and a dark one (Germany's
// black) into a dark page.
//
// The code is ISO 3166-1 alpha-2 (`ES`), in either case, and the set's subdivisions
// (`GB-SCT`). A code with no flag THROWS: `hasFlag(code)` asks first, where a country
// may be unknown. Its name is the reader's language's (`Intl.DisplayNames`), as the
// image's label and its title.

import { hasFlag as known } from "country-flag-icons"
import { Image } from "@/components/ui/image"
import { cn } from "@/lib/utils"

export type FlagShape = "rect" | "square"

/** Where each shape's files are served (flag-route). */
const FOLDER: Record<FlagShape, string> = {
  rect: "/flags/3x2",
  square: "/flags/1x1",
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
  const said = label ?? countryName(c)
  const look = {
    "data-slot": "flag",
    "data-shape": shape,
    className: cn(FRAME, SIZE[shape], className),
  }
  const art = (
    <Image
      src={`${FOLDER[shape]}/${c}.svg`}
      alt=""
      fill
      fit="cover"
      className="block size-full"
    />
  )
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
