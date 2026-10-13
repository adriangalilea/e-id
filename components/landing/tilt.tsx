"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Where the light rests when no hand is on the cards: a little above the middle,
 *  where the page's beam comes from. */
const REST = { x: 0.5, y: 0.35 };

/** Cards someone can turn. The pointer's place over them becomes `--px` and `--py`
 *  (0 to 1 across and down) and `data-hover` while it is there; what those turn and
 *  light is the stylesheet's (globals.css: `card-tilt`, `id-card-shimmer`), so this
 *  only measures, once a frame. On leaving, the light goes back to rest and the
 *  stylesheet eases the cards home. Under reduced motion nothing follows the hand. */
export function Tilt({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) throw new Error("Tilt: no element to measure");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let at = REST;
    const write = () => {
      frame = 0;
      el.style.setProperty("--px", at.x.toFixed(3));
      el.style.setProperty("--py", at.y.toFixed(3));
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };
    const move = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const clamp = (n: number) => Math.min(1, Math.max(0, n));
      at = {
        x: clamp((e.clientX - box.left) / box.width),
        y: clamp((e.clientY - box.top) / box.height),
      };
      el.setAttribute("data-hover", "");
      soon();
    };
    const leave = () => {
      at = REST;
      el.removeAttribute("data-hover");
      soon();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <div ref={ref} data-slot="card-tilt" className={cn("group/tilt", className)}>
      {children}
    </div>
  );
}
