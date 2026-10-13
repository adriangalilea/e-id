"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Where the light rests when no hand is on the cards: a little above the middle,
 *  where the page's beam comes from. */
const REST = { x: 0.5, y: 0.35 };

/** Cards someone can turn. The pointer's place over them becomes `--px` and `--py`
 *  (0 to 1 across and down) and `data-hover` while it is there; what those turn and
 *  light is the stylesheet's (globals.css: `card-tilt`, `id-card-holo`), so this
 *  only measures, once a frame. On leaving, the light goes back to rest and the
 *  stylesheet eases the cards home. Under reduced motion nothing follows the hand. */
export function Tilt({
  children,
  rest = REST,
  lit,
  pose = "turned",
  as: Element = "div",
  className,
}: {
  children: React.ReactNode;
  /** `span` where it stands inside a line of text (the logo in a headline). */
  as?: "div" | "span";
  /** How its front card rests: `turned` away beside a headline (the home), or
   *  `flat`, facing the reader, as a page's subject (a profile). Either leans
   *  toward the hand. */
  pose?: "turned" | "flat";
  /** Where the light rests with no hand on it (a comparison holds it elsewhere). */
  rest?: { x: number; y: number };
  /** Lit as if a hand were on it even when none is (`data-hover` kept). */
  lit?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) throw new Error("Tilt: no element to measure");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let at = rest;
    // As shares (`--px`, `--py`, what a turn and a sweep across a card read) and
    // in pixels (`--hx`, where a light centred on the hand is drawn).
    const write = () => {
      frame = 0;
      el.style.setProperty("--px", at.x.toFixed(3));
      el.style.setProperty("--py", at.y.toFixed(3));
      el.style.setProperty("--hx", `${(at.x * el.offsetWidth).toFixed(1)}px`);
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
      at = rest;
      if (!lit) el.removeAttribute("data-hover");
      soon();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [rest, lit]);
  return (
    <Element
      ref={ref as React.Ref<HTMLDivElement & HTMLSpanElement>}
      data-slot="card-tilt"
      data-hover={lit ? "" : undefined}
      data-pose={pose}
      className={cn("group/tilt", className)}
      style={{ "--px": rest.x, "--py": rest.y } as React.CSSProperties}
    >
      {children}
    </Element>
  );
}
