"use client"
import { type RefObject, useEffect, useState } from "react"

/** Shared intent for GIF and video covers. Explicit pause survives automatic triggers. */
export function useMediaIntent(
  frame: RefObject<HTMLElement | null>,
  interactionRef?: RefObject<HTMLElement | null>,
) {
  const [intent, setIntent] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [touch, setTouch] = useState(false)
  const [reduced, setReduced] = useState(true)
  const [manual, setManual] = useState<boolean | null>(null)
  const [activation, setActivation] = useState(0)
  useEffect(() => {
    const root = frame.current
    if (!root) return
    const target = interactionRef?.current ?? root
    const hover = matchMedia("(hover: none)")
    const motion = matchMedia("(prefers-reduced-motion: reduce)")
    const preferences = () => {
      setTouch(hover.matches)
      setReduced(motion.matches)
    }
    const visibility = () =>
      setPageVisible(document.visibilityState === "visible")
    preferences()
    visibility()
    hover.addEventListener("change", preferences)
    motion.addEventListener("change", preferences)
    document.addEventListener("visibilitychange", visibility)
    let pointer = false,
      focus = false
    const update = () => setIntent(pointer || focus)
    const enter = () => {
      if (!pointer) setActivation((n) => n + 1)
      pointer = true
      update()
    }
    const leave = () => {
      pointer = false
      update()
    }
    const focusIn = () => {
      if (!focus) setActivation((n) => n + 1)
      focus = true
      update()
    }
    const focusOut = (event: FocusEvent) => {
      focus =
        event.relatedTarget instanceof Node &&
        target.contains(event.relatedTarget)
      update()
    }
    target.addEventListener("pointerenter", enter)
    target.addEventListener("pointerleave", leave)
    target.addEventListener("focusin", focusIn)
    target.addEventListener("focusout", focusOut)
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry)
          throw new Error("IntersectionObserver fired without an entry")
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5)
      },
      { threshold: [0, 0.5] },
    )
    observer.observe(root)
    return () => {
      observer.disconnect()
      hover.removeEventListener("change", preferences)
      motion.removeEventListener("change", preferences)
      document.removeEventListener("visibilitychange", visibility)
      target.removeEventListener("pointerenter", enter)
      target.removeEventListener("pointerleave", leave)
      target.removeEventListener("focusin", focusIn)
      target.removeEventListener("focusout", focusOut)
    }
  }, [frame, interactionRef])
  return {
    manual,
    activation,
    setManual,
    active: (playOn: "intent" | "visible" = "intent") =>
      visible &&
      pageVisible &&
      (manual ?? (!reduced && (playOn === "visible" || touch || intent))),
  }
}
