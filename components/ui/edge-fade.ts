import "./scrims.css"

/** Restart the fades on `box` whose axis has nothing to scroll: their timeline is
 *  gone, so restarted they draw nothing. */
function settle(box: HTMLElement) {
  const still = {
    y: box.scrollHeight > box.clientHeight,
    x: box.scrollWidth > box.clientWidth,
  }
  for (const animation of box.getAnimations()) {
    if (!(animation instanceof CSSAnimation)) continue
    const name = animation.animationName
    if (!name.startsWith("ag-edge-fade")) continue
    if (still[name.startsWith("ag-edge-fade-x") ? "x" : "y"]) continue
    animation.cancel()
    animation.play()
  }
}

if (typeof document !== "undefined")
  document.addEventListener(
    "scroll",
    (event) => {
      const box = event.target
      if (!(box instanceof HTMLElement)) return
      // A box that stops overflowing lands at its start; anywhere else it still
      // scrolls and its timeline is live.
      if (box.scrollTop === 0 && box.scrollLeft === 0) settle(box)
    },
    { capture: true, passive: true },
  )
