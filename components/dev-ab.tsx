"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

// A/B, IN DEVELOPMENT ONLY: one look flipped in place on the real page, which
// compares a material better than two copies side by side. Kept across reloads
// and pages (localStorage). Never in a production build (app/layout).

const KEY = "e-id:ab:glass-saturation"

/** The glass deepening the colour behind it (@ag/material, `--glass-saturation`:
 *  1 as shipped) or not (0, the picture's colour, only blurred). */
export function DevAB() {
  const [saturated, setSaturated] = useState(true)
  useEffect(() => {
    setSaturated(localStorage.getItem(KEY) !== "0")
  }, [])
  useEffect(() => {
    localStorage.setItem(KEY, saturated ? "1" : "0")
    document.documentElement.style.setProperty(
      "--glass-saturation",
      saturated ? "1" : "0",
    )
  }, [saturated])
  return (
    <div className="fixed right-4 bottom-4 z-50">
      <Button size="sm" onClick={() => setSaturated(!saturated)}>
        glass saturate: {saturated ? "a, on" : "b, off"}
      </Button>
    </div>
  )
}
