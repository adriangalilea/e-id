"use client"

import Link from "next/link"
import { useState } from "react"

/** The bar's way home, fetched ahead only once the hand or focus comes to it.
 *  The bar is on every page, so in view it would fetch the home's whole static
 *  page (its App Shell, about 144 KB) on every profile, for a click few make. */
export function HomeLink(
  props: Omit<React.ComponentProps<typeof Link>, "href">,
) {
  const [near, setNear] = useState(false)
  return (
    <Link
      {...props}
      href="/"
      prefetch={near ? null : false}
      onPointerEnter={() => setNear(true)}
      onFocus={() => setNear(true)}
    />
  )
}
