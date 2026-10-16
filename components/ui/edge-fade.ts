// The edge fades (scrims.css: `ag-edge-fade`, `-y`, `-xy`), and the one repair they
// need. A fade is read from its box's scroll through scroll-driven animations, and a
// box with nothing to scroll has no timeline, so the spec gives it no fade. Chromium
// (151 to 154 at least) holds each fade at its last value instead, the moment the
// timeline goes away: content that shrinks below the box while it is scrolled (a
// filter, a tab switch) pulls the scroll back to its start and leaves the top's fade
// drawn over a list with nothing above it. That pull is a scroll event, so one
// listener on the document hears it for every faded box, and a fade whose axis no
// longer overflows is restarted, which reads its timeline afresh. WebKit settles a
// fraction of a pixel off, nothing to see. An item that fades imports this, never
// the stylesheet alone (`scripts/check-scroll-edges.ts`).

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
